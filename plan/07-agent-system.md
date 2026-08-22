# Agent System

Agents define the behavior, personality, tool permissions, and capabilities of the AI. Each agent has a unique identity, a system prompt, and a permission profile.

## Agent Definition

An agent is defined by the following properties:

```typescript
interface AgentDefinition {
  // Identity
  id: string                    // Unique identifier (e.g., "code", "explore")
  name: string                  // Display name (e.g., "Code Agent")
  displayName?: string          // Human-readable name for UI
  description: string           // What this agent does
  
  // Behavior
  mode: "primary" | "subagent"  // How the agent operates
  prompt?: string               // System prompt (supports {file:} references)
  temperature?: number          // 0.0 - 2.0, defaults to 0.7
  topP?: number                 // 0.0 - 1.0, defaults to 1.0
  
  // Model (optional override)
  model?: {
    providerID: string
    modelID: string
  }
  
  // Permissions (see Permission System doc)
  permission: PermissionRuleset
  
  // Execution (subagent only)
  steps?: number                // Max autonomous steps (default: 100)
  
  // Visual
  color?: string                // Hex color for UI highlighting
  hidden?: boolean              // Hide from agent selector
  
  // Requirements (optional)
  requirements?: AgentRequirements
}
```

## Built-in Agent Templates

### Code Agent (Primary)

The default coding agent with full tool access.

```jsonc
{
  "code": {
    "name": "Code Agent",
    "description": "Full-featured coding agent. Can read, write, edit files, run commands, and search code.",
    "mode": "primary",
    "prompt": "You are a helpful coding assistant...",
    "permission": {
      "bash": "allow",
      "read": "allow",
      "write": "allow",
      "edit": "allow",
      "grep": "allow",
      "glob": "allow",
      "webfetch": "allow",
      "todo": "allow"
    }
  }
}
```

### Explore Agent (Subagent)

Read-only agent for code exploration and research.

```jsonc
{
  "explore": {
    "name": "Explore Agent",
    "description": "Read-only code explorer. Can search and read files but cannot modify anything.",
    "mode": "subagent",
    "prompt": "You are a code exploration specialist. Your job is to find information...",
    "permission": {
      "read": "allow",
      "grep": "allow",
      "glob": "allow",
      "webfetch": "allow",
      "bash": "deny",
      "write": "deny",
      "edit": "deny"
    }
  }
}
```

### Plan Agent (Primary)

Planning mode that denies all edit tools.

```jsonc
{
  "plan": {
    "name": "Plan Agent",
    "description": "Planning mode. Analyzes code and creates plans without making changes.",
    "mode": "primary",
    "permission": {
      "read": "allow",
      "grep": "allow",
      "glob": "allow",
      "webfetch": "allow",
      "bash": "deny",
      "write": "deny",
      "edit": "deny",
      "apply_patch": "deny"
    }
  }
}
```

### General Agent (Subagent)

Parallel task execution subagent.

```jsonc
{
  "general": {
    "name": "General Agent",
    "description": "General-purpose subagent for parallel task execution.",
    "mode": "subagent",
    "permission": {
      "bash": "allow",
      "read": "allow",
      "write": "allow",
      "edit": "allow",
      "grep": "allow",
      "glob": "allow"
    }
  }
}
```

## Agent UI

### Agent Selector (Prompt Rail)

A dropdown in the prompt rail shows available agents:

```
┌─────────────────┐
│ ▾ Code Agent    │  ← Currently selected agent
│                 │
│ Code Agent      │
│ Explore Agent   │
│ Plan Agent      │
│ General Agent   │
└─────────────────┘
```

### Agent Cycling

Keyboard shortcut `Ctrl+.` (or `Cmd+.` on Mac) cycles through agents:

```
Ctrl+. → Code → Explore → Plan → General → Code → ...
```

### Agent Switching

Switching agents mid-session:
1. Select a different agent from the dropdown
2. The current session continues with the new agent's permissions
3. A system message indicates the agent change
4. New messages use the new agent's system prompt

## Agent Loading

Agents are loaded from multiple sources, merged in order of precedence:

### 1. Built-in Agents

Always available, cannot be removed (but can be hidden):

```typescript
const BUILTIN_AGENTS: Record<string, AgentDefinition> = {
  code: { ... },
  explore: { ... },
  plan: { ... },
  general: { ... },
}
```

### 2. Config File Agents

Defined in `kilo.jsonc` under the `agent` key:

```jsonc
{
  "agent": {
    "my-agent": {
      "name": "My Custom Agent",
      "description": "Specialized for React development",
      "mode": "primary",
      "prompt": "You are a React specialist...",
      "permission": {
        "bash": "ask",
        "write": "allow"
      }
    }
  }
}
```

### 3. Markdown Agent Files

Agent definitions in `<config-dir>/agent/*.md` or `<config-dir>/agents/**/*.md`:

```markdown
---
name: "React Specialist"
description: "Expert in React, Next.js, and TypeScript"
mode: "primary"
temperature: 0.5
---

You are a React specialist. You follow React best practices including:
- Functional components with hooks
- Proper key props on lists
- Error boundaries
- Performance optimization with memo/useMemo/useCallback
```

The YAML frontmatter defines agent properties; the rest is the system prompt.

### Merge Order

```
Built-in agents (base)
    + Config file agents (override)
    + Markdown agent files (override)
    = Final agent list
```

## Agent System Prompt

The system prompt is constructed by combining:

1. **Base system prompt** (hardcoded, defines core behavior)
2. **Agent-specific prompt** (from config or Markdown)
3. **Instructions** (from config `instructions` array — files to read)
4. **Skill instructions** (from config `skills.paths` — dynamic skill loading)

```typescript
function buildSystemPrompt(agent: AgentDefinition, config: Config): string {
  const parts = []
  
  // 1. Base instructions
  parts.push(BASE_SYSTEM_PROMPT)
  
  // 2. Agent-specific prompt
  if (agent.prompt) {
    parts.push(agent.prompt)
  }
  
  // 3. Config instructions (files to include)
  for (const instruction of config.instructions ?? []) {
    const content = readFile(instruction)
    if (content) parts.push(`--- Instruction from ${instruction} ---\n${content}`)
  }
  
  // 4. Tool descriptions (added dynamically based on permissions)
  const availableTools = getToolsForAgent(agent)
  parts.push(formatToolDescriptions(availableTools))
  
  return parts.join("\n\n")
}
```

## Agent Requirements (Optional)

Agents can declare requirements that must be met before they can run:

```typescript
interface AgentRequirements {
  // Required MCP servers
  mcp?: string[]
  
  // Required skills
  skills?: string[]
  
  // Required tools
  tools?: string[]
  
  // Custom condition (evaluated at runtime)
  check?: (context: RequirementContext) => boolean
}
```

If requirements are not met, the agent shows a warning in the UI and cannot be selected until requirements are satisfied.

## Agent Modes

### Primary Mode

- The agent handles the main conversation
- Can spawn subagents for parallel work
- Full permission set as configured
- User interacts directly with this agent

### Subagent Mode

- Spawned by a primary agent to handle specific tasks
- Limited autonomous steps (configurable)
- Results are fed back to the primary agent
- Cannot spawn further subagents (to prevent infinite recursion)
- Typically read-only or narrowly scoped

## Agent Persistence

Agent definitions are persisted in the config file:

```jsonc
{
  "agent": {
    "my-agent": {
      "name": "My Custom Agent",
      "description": "For React work",
      "mode": "primary",
      "permission": { "bash": "ask" }
    }
  }
}
```

Changes are saved when:
- User creates a new agent in settings
- User edits an existing agent
- User deletes an agent
- User changes agent permissions
