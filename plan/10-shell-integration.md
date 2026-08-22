# Shell Integration

This extension uses VS Code's integrated terminal for all shell command execution — no invisible background shells.

## Design Philosophy

**Why VS Code Terminal?**

1. **Transparency**: The user can see exactly what commands are running
2. **Consistency**: Uses the user's configured default shell
3. **Environment**: Inherits VS Code's terminal environment variables
4. **Safety**: User can interrupt or kill any running command
5. **Familiarity**: Same terminal the user already uses for development

## Shell Configuration

### Settings

```jsonc
{
  "shell": "auto"  // "auto" | "bash" | "zsh" | "pwsh" | "powershell"
}
```

**Auto-detection:**
- Windows: Git Bash (if available), otherwise PowerShell
- macOS: zsh (default on modern macOS)
- Linux: $SHELL environment variable

### VS Code Shell Profile Integration

The extension respects VS Code's `terminal.integrated.defaultProfile.*` settings:

```jsonc
// VS Code settings.json
{
  "terminal.integrated.defaultProfile.windows": "Git Bash",
  "terminal.integrated.defaultProfile.osx": "zsh",
  "terminal.integrated.defaultProfile.linux": "bash"
}
```

When the backend needs to execute a shell command:
1. It sends the command to the extension via SSE
2. The extension creates or reuses a VS Code terminal
3. The terminal uses VS Code's configured default shell profile
4. The command is sent via `terminal.sendText()`

## Terminal Architecture

### Per-Session Terminal

Each active session gets its own VS Code terminal:

```
Session "Fix login bug"
    │
    ├── Terminal 1: "your-ext-session-abc123"
    │   ├── pwd → /home/user/project
    │   ├── npm install
    │   │   └── (output captured)
    │   ├── npm test
    │   │   └── (output captured)
    │   └── ...
    │
    └── (Terminal destroyed when session ends)
```

### Terminal Lifecycle

```
1. First shell command in a session
        │
        ▼
2. Extension creates a new VS Code terminal
   - Named: "your-ext-session-<session-id>"
   - Uses default shell profile
   - Located in the terminal tab bar
        │
        ▼
3. Commands are sent via terminal.sendText()
   - Each command is properly quoted/escaped
   - Output is captured from terminal buffer
        │
        ▼
4. When session ends or is cleared
        │
        ▼
5. Terminal is disposed (removed from VS Code)
```

### Terminal Reuse

The terminal is reused across multiple tool calls within the same session:

```
Session starts → Terminal created
    │
    Tool call: bash "npm install" → Sent to terminal
    Tool call: bash "npm test"    → Same terminal
    Tool call: bash "git status"  → Same terminal
    │
Session ends → Terminal destroyed
```

This preserves shell state (cd, environment variables, etc.) across commands.

## Command Execution Flow

```
LLM decides to call "bash" tool with args { command: "npm test" }
        │
        ▼
1. Permission engine evaluates (allow/ask/deny)
        │
        ▼
2. If allowed:
   a. Backend sends SSE event: { type: "shell:execute", sessionID, command }
   b. Extension receives event
   c. Extension gets/creates terminal for the session
   d. Extension calls terminal.sendText(command + "\n")
   e. Extension waits for output (polls terminal selection or uses onData)
   f. Extension sends output back to backend via SSE: { type: "shell:result", output }
        │
        ▼
3. Backend passes output to LLM as tool result
        │
        ▼
4. LLM continues with the result
```

## Output Capture

### Method: Terminal Selection

The extension captures output by selecting the terminal text after command execution:

```typescript
function captureTerminalOutput(terminal: vscode.Terminal, command: string): Promise<string> {
  return new Promise((resolve) => {
    // Send command
    terminal.sendText(command)
    
    // Wait for execution to complete (heuristic: wait for prompt)
    const timeout = setTimeout(() => {
      const output = getTerminalContent(terminal)
      resolve(output)
    }, 30000) // 30 second timeout
    
    // Alternative: detect command completion via prompt pattern
    // This is more reliable but requires shell integration
  })
}
```

### Timeout Handling

Each shell command has a configurable timeout (default: 60 seconds):

```jsonc
{
  "shell": {
    "defaultTimeout": 60000,
    "longRunningTimeout": 300000  // For build commands, etc.
  }
}
```

If a command exceeds the timeout:
1. The command is sent a SIGINT (Ctrl+C)
2. If still running, the terminal is reset
3. A timeout error is returned to the LLM

## Windows-Specific Considerations

### Hiding Console Windows

On Windows, spawning processes can create visible CMD windows. The extension handles this:

```typescript
// The VS Code terminal abstraction handles this automatically
// terminal.sendText() uses the integrated terminal which has no console window
```

### Shell Path Resolution

VS Code's terminal profiles handle platform-specific shell paths:

| Platform | Default Shell | Profile Name |
|---|---|---|
| Windows | Git Bash / PowerShell | "Git Bash" / "PowerShell" |
| macOS | zsh | "zsh" |
| Linux | bash | "bash" |

### Path Handling

VS Code terminals handle Windows path conventions automatically. The extension does not need to convert between POSIX and Windows paths.

## Terminal UI Integration

### Terminal Visibility

The terminal is visible in VS Code's terminal tab bar. Users can:
- See all active extension terminals
- Switch to a terminal to inspect output
- Manually type commands in the terminal
- Kill a terminal if needed

### Terminal Grouping

Extension terminals can be grouped separately from user terminals:

```jsonc
{
  "terminal.integrated.tabs.enabled": true,
  // Extension terminals use a specific profile name for grouping
}
```

## Error Handling

| Error | Handling |
|---|---|
| Command not found | Return stderr to LLM, suggest installation |
| Permission denied | Return error, suggest running as admin |
| Timeout | Send SIGINT, return timeout error |
| Terminal creation fails | Fall back to stdout/stderr capture |
| Shell integration unavailable | Use output polling as fallback |
