# Permission System

The permission system controls what tools the AI agent can use, under what conditions, and whether user approval is required.

## Permission Actions

Every tool call is evaluated against a ruleset that determines one of three actions:

| Action | Behavior |
|---|---|
| `allow` | Execute immediately without prompting |
| `deny` | Block the tool call, return error to LLM |
| `ask` | Prompt the user for approval before executing |

## Permission Ruleset

A ruleset is an array of rules, each matching a permission type and file pattern:

```typescript
type PermissionRuleset = Array<{
  permission: string    // Tool category
  pattern: string       // Glob pattern for file paths ("*" matches all)
  action: "allow" | "deny" | "ask"
}>
```

### Permission Types

| Permission Key | Tools Affected | Description |
|---|---|---|
| `bash` | `bash` | Shell command execution |
| `read` | `read` | File reading |
| `write` | `write` | File creation/overwrite |
| `edit` | `edit`, `write`, `apply_patch` | Diff-based file editing |
| `patch` | `apply_patch` | Unified diff patch application |
| `grep` | `grep` | Text search |
| `glob` | `glob` | File pattern matching |
| `webfetch` | `webfetch` | HTTP URL fetching |
| `websearch` | `websearch` | Web search |
| `task` | `task` | Subagent spawning |
| `question` | `question` | User questions |
| `todo` | `todo` | Todo list management |
| `skill` | `skill` | Skill loading |
| `mcp_<server>` | All tools from MCP server | MCP tool execution |
| `external_directory` | File operations on specific dirs | External directory access |

## Permission Resolution Algorithm

When a tool call is made, the permission engine resolves the action:

```
1. Collect all rules matching the tool's permission type
   ├── From agent definition (agent.permission)
   ├── From global config (config.permission)
   └── From session overrides (if any)

2. Apply deny rules first (veto power)
   If ANY matching rule has action="deny" → BLOCK

3. Check for "ask" rules
   If ANY matching rule has action="ask" → PROMPT USER

4. If all matching rules have action="allow" → ALLOW

5. If no rules match → DEFAULT to "ask" (safe default)
```

### Wildcard Pattern Matching

Patterns use glob/wildcard syntax:

| Pattern | Matches |
|---|---|
| `*` | Any single path segment |
| `**` | Any number of path segments (recursive) |
| `*.env` | Files ending in .env |
| `src/**\/*.ts` | TypeScript files under src/ |
| `~/project/*` | Files under ~/project |

## Permission Configuration

### Global Permissions (kilo.jsonc)

Set default behavior for all agents:

```jsonc
{
  "permission": {
    // Simple scalar: all patterns get the same action
    "bash": "ask",
    "webfetch": "allow",
    "todo": "allow",
    
    // Pattern-specific: different actions per pattern
    "read": {
      "*": "allow",
      "*.env": "ask",
      "*.env.*": "ask",
      "*.env.example": "allow"
    },
    "write": {
      "src/**": "allow",
      "**/*.lock": "ask",
      "package.json": "ask"
    },
    
    // Deny specific patterns
    "edit": {
      "*": "allow",
      "*.lock": "deny",
      "node_modules/**": "deny"
    }
  }
}
```

### Per-Agent Permissions

Override global defaults for specific agents:

```jsonc
{
  "agent": {
    "code": {
      "permission": {
        "bash": "allow",
        "write": "allow"
        // Inherits read, grep, glob from global
      }
    },
    "explore": {
      "permission": {
        "bash": "deny",
        "write": "deny",
        "edit": "deny",
        "read": "allow"
      }
    }
  }
}
```

### Permission Precedence

When multiple rules match the same permission+pattern:

```
Agent-specific rules  (highest priority)
    + Config rules
    + Global rules
    + Session overrides
    = Final decision
```

More specific patterns override broader ones:

```
"src/components/*.ts": "allow"    ← More specific (wins)
"*": "ask"                         ← General fallback
```

## Auto-Approve

Auto-approve automatically allows all "ask" permissions.

### Toggle

```jsonc
{
  "autoApprove": {
    "enabled": false  // Toggle per-session or globally
  }
}
```

### VS Code Command

`your-ext.toggleAutoApprove` (Ctrl+Alt+A / Cmd+Alt+A) toggles auto-approve for the current session.

### Behavior

When auto-approve is enabled:
1. Permission requests are automatically answered with "allow"
2. No UI prompt is shown
3. A subtle indicator shows auto-approve is active
4. "deny" rules are still honored (safety veto)

### Auto-Approve with Rules

Fine-grained auto-approve: certain patterns are auto-approved while others still prompt:

```jsonc
{
  "permission": {
    "bash": {
      "npm install *": "allow",
      "npm test": "allow",
      "*": "ask"
    }
  }
}
```

## Permission UI

### Permission Request Dock

When a permission "ask" is triggered, a slide-out panel appears:

```
┌─────────────────────────────────────┐
│  Permission Request          [×]    │
├─────────────────────────────────────┤
│                                     │
│  Tool: bash                         │
│  Command: npm install --save react  │
│  Pattern: *                         │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  [Allow Once]  [Allow Always]  [Deny]│
│                                     │
│  ☐ Also approve all similar requests│
│                                     │
└─────────────────────────────────────┘
```

### Approval Options

| Button | Behavior |
|---|---|
| **Allow Once** | Approve this specific request only |
| **Allow Always** | Persist rule to config: `{permission: {bash: {command: "allow"}}}` |
| **Deny** | Block this request; also blocks all pending requests in the same session |

### Batch Approval

When multiple permission requests are pending:
1. They stack in the permission dock
2. User can approve/deny each individually
3. "Allow Always" on one creates a persistent rule for all future similar requests

## Permission Persistence

When the user clicks "Allow Always", the rule is saved to the global config:

```typescript
// Before "Allow Always" on: bash "npm install *"
// After:
{
  "permission": {
    "bash": {
      "npm install *": "allow"
    }
  }
}
```

This persists across sessions and restarts.

## Permission in the Settings UI

The settings panel includes a permission editor:

```
┌─────────────────────────────────────────┐
│  Permission Rules                       │
├─────────────────────────────────────────┤
│                                         │
│  Tool: [bash ▼]    Pattern: [*]        │
│  Action: [ask ▼]    [Add Rule]          │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ bash       *        ask      [×]  │  │
│  │ bash       npm test *  allow  [×] │  │
│  │ read       *.env     ask     [×]  │  │
│  │ write      src/**    allow   [×]  │  │
│  │ write      *.lock    deny      [×]  │  │
│  └───────────────────────────────────┘  │
│                                         │
│  [Save Rules]                           │
│                                         │
└─────────────────────────────────────────┘
```

## Security Considerations

### Deny is Absolute

A "deny" rule cannot be overridden by "allow" rules. This is the safety veto:

```jsonc
{
  "permission": {
    "bash": {
      "rm -rf /": "deny",     // Cannot be overridden
      "*": "ask"               // All other commands need approval
    }
  }
}
```

### Config Path Protection

Certain config file paths are always protected:
- The extension's own config directory
- System configuration files

These paths always require "ask" regardless of agent permissions.

### Session-Scoped Permissions

Permissions can be set per-session for temporary changes:

```typescript
// In-session permission override
session.setPermission({
  bash: { "docker *": "allow" }  // Only for this session
})
```

Session-scoped permissions are not persisted to config.
