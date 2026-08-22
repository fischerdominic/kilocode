# Backend Engine

The backend engine is a standalone CLI application that provides the AI agent runtime. It runs as a child process of the VS Code extension and exposes an HTTP API with SSE streaming.

## Technology Stack

| Component | Technology | Rationale |
|---|---|---|
| Runtime | Bun or Node.js | Bun for faster startup; Node.js for wider compatibility |
| HTTP Server | Hono | Lightweight, fast, supports SSE natively |
| AI Inference | Vercel AI SDK | Provider-agnostic abstraction over 50+ LLM providers |
| Config Parsing | JSONC + Zod | JSON with comments + runtime validation |
| Event System | In-process pub/sub | Lightweight messaging between modules |
| Persistence | Filesystem JSON | Simple, portable, version-controllable |

## Core Modules

### 1. HTTP Server (`server/`)

The server provides REST endpoints and an SSE event stream.

**REST Endpoints:**
- `POST /v2/sessions` — Create a new session
- `GET /v2/sessions` — List all sessions
- `GET /v2/sessions/:id/messages` — Load session messages (paginated)
- `POST /v2/sessions/:id/messages` — Send a message to a session
- `POST /v2/sessions/:id/abort` — Abort current generation
- `DELETE /v2/sessions/:id` — Delete a session
- `GET /v2/config` — Get current configuration
- `PATCH /v2/config` — Update configuration
- `GET /v2/providers` — List configured providers
- `POST /v2/providers` — Add/update a provider
- `DELETE /v2/providers/:id` — Remove a provider
- `GET /v2/agents` — List defined agents
- `POST /v2/agents` — Add/update an agent
- `DELETE /v2/agents/:id` — Remove an agent
- `GET /v2/tools` — List available tools for current agent
- `GET /v2/permissions` — List pending permission requests
- `POST /v2/permissions/:id/reply` — Reply to a permission request
- `GET /v2/mcp` — List MCP clients and their tools
- `POST /v2/mcp/:name/initialize` — Initialize an MCP client

**SSE Event Stream (`GET /v2/events`):**
- `session:created` — New session started
- `session:message` — New message chunk (streaming)
- `session:completed` — Session generation finished
- `session:error` — Session error occurred
- `permission:asked` — Permission request needs attention
- `permission:replied` — Permission was answered
- `question:asked` — Interactive question needs input
- `question:replied` — Question was answered
- `config:updated` — Configuration changed
- `mcp:tools_changed` — MCP tool list changed

### 2. Config System (`config/`)

Configuration is loaded from `kilo.jsonc` files in this priority order:
1. Global config: `~/.config/your-extension/config.jsonc`
2. Project config: `<workspace>/.your-extension/config.jsonc`
3. Environment variable: `YOUR_EXT_CONFIG_CONTENT`
4. CLI flag: `--config <path>`

**Config Schema (simplified):**

```jsonc
{
  // Single provider configuration (required)
  "provider": {
    "id": "local",
    "name": "Local Ollama",
    "base_url": "http://localhost:11434",
    "api_key": "",  // Empty for local providers
    "models": {
      "llama3.1:8b": { "contextLength": 128000 },
      "codestral:latest": { "contextLength": 32000 }
    }
  },

  // Agent definitions
  "agent": {
    "code": {
      "name": "code",
      "description": "Default coding agent",
      "mode": "primary",
      "model": "local/llama3.1:8b",
      "permission": {
        "bash": "allow",
        "read": "allow",
        "write": "allow",
        "edit": "allow",
        "grep": "allow",
        "glob": "allow"
      }
    },
    "explore": {
      "name": "explore",
      "description": "Read-only code exploration",
      "mode": "subagent",
      "permission": {
        "bash": "deny",
        "write": "deny",
        "edit": "deny",
        "read": "allow"
      }
    }
  },

  // Global permission defaults
  "permission": {
    "bash": "ask",
    "read": { "*": "allow", "*.env*": "ask" },
    "write": "ask",
    "edit": "ask",
    "webfetch": "allow"
  },

  // Shell configuration
  "shell": "auto",  // "auto" | "bash" | "zsh" | "pwsh" | "powershell"

  // MCP server configurations
  "mcp": {
    "servers": {
      "playwright": {
        "command": "npx",
        "args": ["-y", "@playwright/mcp@latest"],
        "env": {}
      }
    }
  },

  // Browser automation
  "browserAutomation": {
    "enabled": false,
    "useSystemChrome": true,
    "headless": false
  },

  // Autocomplete
  "autocomplete": {
    "enabled": false,
    "model": ""
  },

  // Notifications
  "attention": {
    "enabled": false,
    "sound": "default"
  }
}
```

### 3. Provider System (`provider/`)

The provider system manages a single AI model provider connection.

**Provider Interface:**
```typescript
interface AIProvider {
  id: string
  name: string
  baseUrl: string
  apiKey?: string
  defaultModel: string
  models: Record<string, ModelInfo>
  
  // Core inference
  chat(messages: Message[], options: ChatOptions): AsyncIterable<StreamChunk>
  
  // Model info
  listModels(): Promise<ModelInfo[]>
  
  // Auth
  validate(): Promise<boolean>
}
```

**Model Info:**
```typescript
interface ModelInfo {
  id: string
  name: string
  contextLength: number
  maxOutput: number
  inputPrice?: number    // per 1M tokens
  outputPrice?: number
  supportsVision?: boolean
  supportsTools?: boolean
}
```

**Supported Provider Types:**
- **OpenAI-compatible**: Any server exposing the OpenAI chat completions API (Ollama, vLLM, LM Studio, etc.)
- **Custom transport**: Pluggable transport for non-OpenAI protocols

**Single Provider Configuration Flow:**
1. User enters `base_url`, optional `api_key`, and `model_id` in settings
2. Extension validates the connection by calling the provider's `/models` endpoint
3. Provider metadata (available models, context window) is cached
4. All sessions use this single provider configuration

### 4. Agent System (`agent/`)

Agents define the behavior, personality, and capabilities of the AI.

**Agent Definition:**
```typescript
interface AgentDefinition {
  id: string
  name: string
  displayName?: string
  description: string
  mode: "primary" | "subagent" | "all"
  
  // Model override (optional, defaults to provider default)
  model?: { providerID: string; modelID: string }
  
  // System prompt (can reference files via {file:} syntax)
  prompt?: string
  
  // Temperature and sampling parameters
  temperature?: number
  topP?: number
  
  // Per-agent permission overrides
  permission: PermissionRuleset
  
  // Subagent mode configuration
  steps?: number  // Max steps for autonomous execution
  
  // Requirements (optional)
  requirements?: AgentRequirements
}
```

**Built-in Agent Templates:**
- **code** (primary): Full-featured coding agent with all tool permissions
- **explore** (subagent): Read-only exploration — grep, glob, read, webfetch
- **plan** (primary): Planning mode — denies all edit tools, only plan_enter/plan_exit
- **general** (subagent): Parallel task execution subagent

**Agent Loading:**
1. Load from config file `agent` section
2. Load from `<dir>/agent/*.md` files (Markdown with YAML frontmatter)
3. Merge: config file takes precedence, Markdown files add/override

### 5. Tool System (`tool/`)

Tools are functions the AI can call to interact with the filesystem, shell, and external services.

**Built-in Tools:**

| Tool | Description | Permission Key |
|---|---|---|
| `bash` | Execute shell commands | `bash` |
| `read` | Read file contents | `read` |
| `write` | Write/overwrite files | `write` |
| `edit` | Apply diff-based edits | `edit` |
| `grep` | Search files with regex | `grep` |
| `glob` | Find files by pattern | `glob` |
| `webfetch` | Fetch HTTP URLs | `webfetch` |
| `websearch` | Web search (if configured) | `websearch` |
| `todo` | Manage todo list | `todo` (always allowed) |
| `task` | Spawn subagent tasks | `task` |
| `question` | Ask user a question | `question` |
| `skill` | Load skill instructions | `skill` |
| `apply_patch` | Apply unified diff patches | `patch` |

**Tool Interface:**
```typescript
interface ToolDef {
  id: string
  description: string
  parameters: JSONSchema  // JSON Schema for the tool's arguments
  execute: (args: any, context: ToolContext) => Promise<ToolResult>
}

interface ToolContext {
  sessionID: string
  agent: string
  directory: string
  worktree: string
  ask: (request: PermissionRequest) => Promise<PermissionReply>
  write: (path: string, content: string) => Promise<void>
  // ... other context methods
}
```

### 6. Permission Engine (`permission/`)

The permission engine evaluates tool calls against a ruleset to determine if they should be allowed, denied, or require user approval.

**Permission Actions:**
- `"allow"` — Execute immediately without prompting
- `"deny"` — Block the tool call
- `"ask"` — Prompt the user for approval

**Ruleset Structure:**
```typescript
type PermissionRuleset = Array<{
  permission: string    // Tool category (bash, read, write, edit, etc.)
  pattern: string       // Glob pattern for file paths ("*" for all)
  action: "allow" | "deny" | "ask"
}>
```

**Permission Resolution Algorithm:**
1. Collect all matching rules from: agent defaults → config permissions → session overrides
2. Apply deny rules first (veto power)
3. If any pattern requires "ask", prompt the user
4. If all patterns are "allow", execute immediately
5. If all patterns are "deny", block the call

**Auto-Approve:**
When auto-approve is enabled, all "ask" permissions are automatically converted to "allow". This can be toggled per-session or globally.

**Permission Persistence:**
When a user approves a permission with "always", the rule is persisted to the global config file so future sessions inherit it.

### 7. Session Management (`session/`)

Sessions represent a conversation between the user and the AI agent.

**Session Lifecycle:**
1. **Create**: User sends a message → session is created with system prompt + agent config
2. **Run**: Messages are processed through the LLM pipeline with tool calls
3. **Stream**: Response chunks are streamed back via SSE
4. **Complete**: Generation finishes (token limit, explicit stop, or error)
5. **Persist**: Session transcript is saved to disk

**Session Storage:**
```
~/.local/share/your-extension/storage/
└── sessions/
    └── <session-id>.json    # Full transcript + metadata
```

**Session Data:**
```typescript
interface Session {
  id: string
  title: string
  agent: string
  model: string
  directory: string
  createdAt: number
  updatedAt: number
  status: "idle" | "running" | "paused" | "error" | "completed"
  messages: Message[]
  usage: TokenUsage
}
```

**Context Compaction:**
When a session exceeds the model's context window:
1. Summarize older messages using the LLM
2. Replace the summary in place of the original messages
3. Keep the most recent messages intact for context

### 8. MCP Client Manager (`mcp/`)

The Model Context Protocol (MCP) client manages connections to external MCP servers.

**Supported Transports:**
- **stdio**: Spawn a subprocess and communicate via stdin/stdout (most common)
- **HTTP**: Connect to an HTTP-based MCP server
- **SSE**: Connect via Server-Sent Events

**MCP Server Configuration:**
```jsonc
{
  "mcp": {
    "servers": {
      "playwright": {
        "command": "npx",
        "args": ["-y", "@playwright/mcp@latest"],
        "env": {
          "CHROME_PATH": "/usr/bin/google-chrome"
        }
      },
      "filesystem": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-filesystem", "/home/user"],
        "env": {}
      }
    }
  }
}
```

**MCP Tool Integration:**
1. MCP servers expose tools via `tools/list`
2. These tools are registered in the tool registry alongside built-in tools
3. Permission rules apply to MCP tools using the `mcp_<server>_<tool>` naming convention
4. MCP tools appear in the available tools list for the current agent

### 9. Shell Executor (`shell/`)

Shell execution uses VS Code's integrated terminal instead of spawning invisible shells.

**Architecture:**
1. Backend sends a shell command to the extension via SSE event
2. Extension creates/focuses a VS Code terminal (using the user's default shell)
3. Command is sent to the terminal via `terminal.sendText()`
4. Output is captured from the terminal and streamed back to the backend
5. Backend forwards output to the LLM as tool result

**VS Code Shell Integration Benefits:**
- Uses the user's configured default shell (`terminal.integrated.defaultProfile.*`)
- Visible to the user — no invisible background processes
- Respects VS Code's shell environment variables
- Supports VS Code's terminal features (split, new tab, etc.)
- Consistent behavior across platforms

**Terminal Lifecycle:**
- One terminal per session (reused across tool calls)
- Terminal is created on first shell command and destroyed when session ends
- Commands are sent with proper quoting and escaping

### 10. Browser Automation (`browser/`)

Browser automation uses Playwright to let the AI interact with web pages.

**Implementation:**
1. When enabled, the extension registers a Playwright MCP server
2. The MCP server exposes tools: `browser_navigate`, `browser_click`, `browser_type`, `browser_screenshot`, etc.
3. These tools appear as regular tools in the agent's available tool list
4. The agent can navigate to URLs, click elements, fill forms, and take screenshots

**Configuration:**
```jsonc
{
  "browserAutomation": {
    "enabled": true,
    "useSystemChrome": true,    // Use installed Chrome/Edge
    "headless": false           // Show browser window
  }
}
```

### 11. Inference Pipeline (`session/llm.ts`)

The inference pipeline orchestrates the interaction between the LLM, tools, and permissions.

**Loop:**
```
1. Build message list (system prompt + conversation history + recent context)
2. Send to LLM with available tools
3. If LLM returns a tool call:
   a. Evaluate permissions for the tool call
   b. If denied → return error to LLM
   c. If ask → wait for user approval
   d. If allowed → execute the tool
   e. Add tool result to message list
   f. Go to step 2
4. If LLM returns text → stream to user
5. If LLM signals stop → end session
```

**Streaming:**
- Text chunks are streamed via SSE as they're generated
- Tool calls are emitted as separate events
- Each chunk includes metadata (model, tokens, timing)

**Error Handling:**
- Network errors trigger automatic retry with exponential backoff
- Token limit errors trigger compaction or session end
- Auth errors surface as clear error messages to the user
