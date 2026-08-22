# Settings and Configuration

This document covers the settings system, configuration file format, and the settings UI.

## Configuration File

Configuration is stored in a JSONC file (JSON with comments) at:

```
~/.config/your-extension/config.jsonc    (global)
<workspace>/.your-extension/config.jsonc  (project)
```

### File Priority

1. **CLI flag** `--config <path>` (highest)
2. **Environment** `YOUR_EXT_CONFIG_CONTENT`
3. **Global config** `~/.config/your-extension/config.jsonc`
4. **Project config** `<workspace>/.your-extension/config.jsonc`

Later sources override earlier ones. Project config overrides global config for the same keys.

### Full Configuration Schema

```jsonc
{
  // ==========================================
  // AI Provider (required)
  // ==========================================
  "provider": {
    "id": "local",
    "name": "My Ollama",
    "type": "openai-compatible",
    "base_url": "http://localhost:11434/v1",
    "api_key": "",
    "default_model": "llama3.1:8b",
    "models": {
      "llama3.1:8b": {
        "contextLength": 128000,
        "maxOutput": 8192,
        "supportsVision": false,
        "supportsTools": true
      }
    },
    "timeout": 120000
  },

  // ==========================================
  // Agents
  // ==========================================
  "agent": {
    "code": {
      "name": "Code Agent",
      "description": "Full-featured coding agent",
      "mode": "primary",
      "permission": {
        "bash": "allow",
        "read": "allow",
        "write": "allow",
        "edit": "allow"
      }
    },
    "explore": {
      "name": "Explore Agent",
      "description": "Read-only code explorer",
      "mode": "subagent",
      "permission": {
        "read": "allow",
        "grep": "allow",
        "bash": "deny",
        "write": "deny"
      }
    }
  },

  // ==========================================
  // Default Agent
  // ==========================================
  "default_agent": "code",

  // ==========================================
  // Global Permissions
  // ==========================================
  "permission": {
    "bash": "ask",
    "read": {
      "*": "allow",
      "*.env*": "ask"
    },
    "write": "ask",
    "edit": "ask",
    "webfetch": "allow",
    "todo": "allow"
  },

  // ==========================================
  // Shell
  // ==========================================
  "shell": "auto",

  // ==========================================
  // MCP Servers
  // ==========================================
  "mcp": {
    "servers": {
      "playwright": {
        "command": "npx",
        "args": ["-y", "@playwright/mcp@latest"],
        "env": {}
      }
    }
  },

  // ==========================================
  // Browser Automation
  // ==========================================
  "browserAutomation": {
    "enabled": false,
    "useSystemChrome": true,
    "headless": false
  },

  // ==========================================
  // Autocomplete
  // ==========================================
  "autocomplete": {
    "enabled": false,
    "model": "",
    "debounceMs": 150
  },

  // ==========================================
  // Notifications
  // ==========================================
  "attention": {
    "enabled": false,
    "sound": "default"
  },

  // ==========================================
  // Auto-Approve
  // ==========================================
  "autoApprove": {
    "enabled": false
  },

  // ==========================================
  // Instructions (files to include in every session)
  // ==========================================
  "instructions": [
    "~/.config/your-extension/INSTRUCTIONS.md"
  ],

  // ==========================================
  // Schema (for editor validation)
  // ==========================================
  "$schema": "https://your-extension.dev/config.json"
}
```

## VS Code Settings Integration

In addition to the config file, some settings are managed through VS Code's settings UI:

```jsonc
// VS Code settings.json
{
  "your-ext.language": "en",                    // UI language
  "your-ext.fontSize": 13,                      // Webview font size
  "your-ext.autoApprove.enabled": false,        // Default auto-approve state
  "your-ext.attention.enabled": false,          // Notification sounds
  "your-ext.showTokenThroughput": false,        // Show tokens/sec in UI
  "your-ext.showTaskTimeline": true             // Show task timeline
}
```

## Settings UI

The settings panel is a webview editor with tabs for each configuration area.

### Tab: Provider

Configure the AI provider connection.

```
┌─────────────────────────────────────────┐
│  Provider                    [Test] [✓] │
├─────────────────────────────────────────┤
│                                         │
│  Name:      [My Ollama ______________]  │
│  Type:      [OpenAI-compatible ▼]       │
│  Base URL:  [http://localhost:11434/v1] │
│  API Key:   [••••••••••••••••••••••••]  │
│  Model:     [llama3.1:8b ▼]             │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  Status: ✓ Connected                    │
│  Models discovered: 3                   │
│  Context window: 128,000 tokens         │
│                                         │
│                    [Save Provider]      │
│                                         │
└─────────────────────────────────────────┘
```

### Tab: Agents

Define and manage agents.

```
┌─────────────────────────────────────────┐
│  Agents                          [+ New]│
├─────────────────────────────────────────┤
│                                         │
│  ┌─ Code Agent ──────────────────────┐  │
│  │ Description: Full-featured coding │  │
│  │ Mode: Primary           [Edit]    │  │
│  │ Permission: Allow all tools       │  │
│  └───────────────────────────────────┘  │
│  ┌─ Explore Agent ───────────────────┐  │
│  │ Description: Read-only explorer   │  │
│  │ Mode: Subagent          [Edit]    │  │
│  │ Permission: Read-only             │  │
│  └───────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

**Agent Editor Modal:**

```
┌─────────────────────────────────────────────┐
│  Edit Agent: Code Agent             [×]     │
├─────────────────────────────────────────────┤
│                                             │
│  Name:        [Code Agent ______________]   │
│  Description: [Full-featured coding agent]  │
│  Mode:        [Primary ▼]                   │
│  Temperature: [0.7 __]                      │
│                                             │
│  System Prompt:                             │
│  ┌───────────────────────────────────────┐  │
│  │ You are a helpful coding assistant.   │  │
│  │ Follow best practices...              │  │
│  │                                       │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  Permissions:                               │
│  ┌─────────────────────────────────────┐    │
│  │ bash       *        allow      [×]  │    │
│  │ read       *        allow      [×]  │    │
│  │ write      *        allow      [×]  │    │
│  │ edit       *        allow      [×]  │    │
│  └─────────────────────────────────────┘    │
│  [+ Add Permission]                         │
│                                             │
│              [Cancel]  [Save Agent]         │
│                                             │
└─────────────────────────────────────────────┘
```

### Tab: Permissions

Global permission rules editor.

```
┌─────────────────────────────────────────┐
│  Permission Rules     [Import] [Export] │
├─────────────────────────────────────────┤
│                                         │
│  Add Rule:                              │
│  Tool: [bash ▼]  Pattern: [*]  Action:  │
│          [ask ▼]        [Add Rule]      │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ Tool     Pattern      Action     │  │
│  │ ───────────────────────────────── │  │
│  │ bash     *          ask      [×]  │  │
│  │ bash     npm test *  allow   [×]  │  │
│  │ read     *.env      ask      [×]  │  │
│  │ write    src/**     allow    [×]  │  │
│  │ write    *.lock     deny       [×]  │  │
│  │ webfetch *          allow    [×]  │  │
│  └───────────────────────────────────┘  │
│                                         │
│  [Save Rules]                           │
│                                         │
└─────────────────────────────────────────┘
```

### Tab: MCP Servers

Manage MCP server connections.

```
┌─────────────────────────────────────────┐
│  MCP Servers                     [+ Add]│
├─────────────────────────────────────────┤
│                                         │
│  ┌─ Playwright ─────────────────────┐   │
│  │ Command: npx -y @playwright/mcp  │   │
│  │ Status: ● Connected (5 tools)    │   │
│  │ Tools: browser_navigate, click.. │   │
│  │                     [Edit] [×]   │   │
│  └──────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

### Tab: Shell

Shell configuration.

```
┌─────────────────────────────────────────┐
│  Shell Configuration                    │
├─────────────────────────────────────────┤
│                                         │
│  Shell: [Auto-detect ▼]                 │
│                                         │
│  Current: bash (Git Bash)               │
│  VS Code Default: Git Bash              │
│                                         │
│  ℹ The extension uses VS Code's         │
│    integrated terminal. No invisible     │
│    shells are spawned.                  │
│                                         │
│  [Save]                                 │
│                                         │
└─────────────────────────────────────────┘
```

### Tab: Browser

Browser automation settings.

```
┌─────────────────────────────────────────┐
│  Browser Automation                     │
├─────────────────────────────────────────┤
│                                         │
│  ☑ Enable browser automation            │
│                                         │
│  Browser: [Use system Chrome ▼]         │
│  ☐ Run headless (hidden browser)        │
│                                         │
│  Viewport: [1280] x [720]               │
│  Timeout:  [30000] ms                   │
│                                         │
│  ℹ Requires Playwright MCP server       │
│                                         │
│  [Save]                                 │
│                                         │
└─────────────────────────────────────────┘
```

### Tab: Notifications

Sound and alert preferences.

```
┌─────────────────────────────────────────┐
│  Notifications                          │
├─────────────────────────────────────────┤
│                                         │
│  ☑ Enable notification sounds           │
│                                         │
│  Sound: [default ▼]                     │
│                                         │
│  Events:                                │
│  ☑ Session completed                    │
│  ☑ Session error                        │
│  ☑ Permission needs attention           │
│  ☐ Question needs input                 │
│                                         │
│  [Test Sound]                           │
│  [Save]                                 │
│                                         │
└─────────────────────────────────────────┘
```

### Tab: General

General settings.

```
┌─────────────────────────────────────────┐
│  General                                │
├─────────────────────────────────────────┤
│                                         │
│  Font Size:    [13 ▼] px                │
│  Auto-Approve: [Off ▼]                  │
│  Show Tokens:  ☐ Show token throughput  │
│  Show Timeline: ☑ Show task timeline    │
│                                         │
│  [Save]                                 │
│                                         │
└─────────────────────────────────────────┘
```

## Configuration Hot-Reload

When the config file is saved, the backend detects the change and reloads:

1. File watcher detects config change
2. Backend invalidates cached config
3. New config is loaded and validated
4. SSE event `config:updated` is emitted
5. Extension forwards to webview
6. UI updates (agent list, permission rules, etc.)

## Configuration Validation

The config file is validated against a JSON Schema on save:

```typescript
const ConfigSchema = z.object({
  provider: ProviderSchema,
  agent: z.record(AgentSchema).optional(),
  permission: PermissionSchema.optional(),
  shell: z.enum(["auto", "bash", "zsh", "pwsh", "powershell"]).optional(),
  mcp: McpConfigSchema.optional(),
  // ...
})

function validateConfig(content: string): ValidationResult {
  const parsed = JSONC.parse(content)
  const result = ConfigSchema.safeParse(parsed)
  
  if (!result.success) {
    return {
      valid: false,
      errors: result.error.errors.map(e => ({
        path: e.path.join("."),
        message: e.message,
      })),
    }
  }
  
  return { valid: true }
}
```

## Settings Persistence

Changes made in the settings UI are saved to the config file:

1. User edits a setting in the webview
2. Webview sends `updateConfig` message to extension
3. Extension calls `PATCH /v2/config` on the backend
4. Backend validates and writes to config file
5. Backend emits `config:updated` SSE event
6. All connected webviews receive the update
