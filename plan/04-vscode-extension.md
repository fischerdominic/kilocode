# VS Code Extension Architecture

The VS Code extension acts as a thin client that manages the backend lifecycle, provides the UI, and bridges VS Code APIs to the backend.

## Technology Stack

| Component | Technology | Rationale |
|---|---|---|
| Extension Host | TypeScript (Node.js) | VS Code extension API |
| Webview UI | SolidJS + TypeScript | Lightweight, performant SPA |
| Build | esbuild | Fast bundling for both extension and webview |
| Terminal | @xterm/xterm | Industry-standard terminal emulation |
| Icons | VS Code Codicons | Native VS Code icon integration |

## Extension Entry Point (`extension.ts`)

The entry point is responsible for:

1. **Creating the Connection Service** — Manages the backend child process lifecycle
2. **Registering Webview Providers** — Sidebar, tab panels, settings editor
3. **Registering Commands** — All VS Code commands the extension exposes
4. **Registering Keybindings** — Keyboard shortcuts for common actions
5. **Setting up Services** — Autocomplete, browser automation, attention, code actions
6. **Handling Deep Links** — URI handler for extension-specific URLs

### Activation Strategy

The extension activates on `onStartupFinished` — this ensures all VS Code services are ready before the extension registers commands, keybindings, autocomplete, and URI handlers. The backend is NOT spawned at activation time; it starts lazily when the first webview connects or autocomplete is triggered.

### Webview Provider Pattern

Three types of webview providers exist:

| Provider | Location | VS Code API | Purpose |
|---|---|---|---|
| `SidebarProvider` | Activity bar sidebar | `registerWebviewViewProvider` | Main chat interface |
| `TabPanelProvider` | Editor area (open in tab) | `createWebviewPanel` | Secondary chat panels |
| `SettingsProvider` | Editor area (open in editor) | `registerWebviewPanelSerializer` | Settings editor |

All providers use `retainContextWhenHidden: true` to keep the webview alive when switching panels. This avoids re-rendering the entire chat history when switching between sidebar and tab panels.

### Backend Connection Service

The `ConnectionService` is the central hub for all communication with the backend:

```
Extension Activation
        │
        ▼
┌───────────────────────┐
│  ConnectionService    │
│  ├── ServerManager    │── spawns `your-ext serve --port 0`
│  ├── HttpClient       │── HTTP REST client for requests
│  └── SSEClient        │── SSE event stream subscriber
└───────────────────────┘
        │
        ▼
┌───────────────────────┐
│  Backend (child proc) │
│  kilo serve --port 0  │
│  Random password auth │
└───────────────────────┘
```

**Lifecycle:**
1. First webview connects or autocomplete triggers → `ServerManager` spawns backend
2. Backend prints its port to stdout → captured by extension
3. Random password generated → passed via `YOUR_EXT_SERVER_PASSWORD` env var
4. Extension connects via HTTP + SSE using the captured port
5. If backend exits, `ServerManager` restarts it automatically
6. On extension deactivation, backend process is killed

**State Management:**
- `connected` — HTTP + SSE connected and ready
- `connecting` — Backend spawning or reconnecting
- `disconnected` — No backend process or connection lost
- `error` — Backend failed to start or connection failed

## Services

### Connection Service (`services/backend-connection.ts`)

Manages the backend process lifecycle and provides a unified interface for HTTP and SSE communication.

**Responsibilities:**
- Spawn and monitor the backend process
- Generate and manage authentication credentials
- Maintain HTTP client with retry logic
- Manage SSE connection with reconnection
- Emit state change events to subscribers
- Route SSE events to the correct webview provider

**Key Methods:**
```typescript
class ConnectionService {
  // Lifecycle
  start(): void
  stop(): void
  restart(): void
  
  // State
  getState(): ConnectionState
  onStateChange(callback: (state: ConnectionState) => void): Disposable
  
  // HTTP
  fetch<T>(path: string, options?: RequestInit): Promise<T>
  
  // SSE
  connectSSE(callback: (event: SSEEvent) => void): Disposable
  
  // Configuration
  getServerUrl(): string | undefined
  getPassword(): string | undefined
}
```

### Autocomplete Service (`services/autocomplete.ts`)

Provides inline code completion using the configured AI provider.

**Architecture:**
- Registers as a VS Code `CompletionItemProvider`
- On `onDidChangeTextDocument`, sends context to backend for completion
- Backend returns completion items via SSE
- Extension renders completions using VS Code's completion API

**Settings:**
```jsonc
{
  "autocomplete": {
    "enabled": true,
    "triggerCharacters": [".", "(", " ", "\n"],
    "maxItems": 3
  }
}
```

### Attention Service (`services/attention.ts`)

Handles notification sounds and visual alerts.

**Triggers:**
- Session completed successfully
- Session encountered an error
- Permission request needs attention
- Interactive question needs input

**Sound System:**
- Bundled WAV files for different event types
- Configurable sound selection in settings
- System notification sound option
- Mute toggle

### Browser Automation Service (`services/browser-automation.ts`)

Manages the Playwright MCP server lifecycle.

**Flow:**
1. User enables browser automation in settings
2. Extension registers the Playwright MCP server configuration with the backend
3. Backend spawns the Playwright MCP process on first use
4. MCP tools become available to the agent
5. When disabled, MCP process is terminated

### Code Actions Service (`services/code-actions.ts`)

Provides right-click context menu actions in the editor and terminal.

**Editor Context Menu:**
- "Explain Code" — Send selected code to the agent for explanation
- "Fix Code" — Send selected code for bug fixing
- "Improve Code" — Send selected code for refactoring
- "Add to Context" — Add selected code to the current session context

**Terminal Context Menu:**
- "Add Terminal Content to Context" — Send terminal output to the agent
- "Fix This Command" — Send failing command to the agent for fixing
- "Explain This Command" — Send command to the agent for explanation

### Commit Message Service (`services/commit-message.ts`)

Generates AI-powered commit messages from the current git diff.

**Trigger:**
- Click the commit message icon in the Source Control panel
- Or use the command palette: "Generate Commit Message"

**Flow:**
1. Extension captures the current git diff
2. Sends diff to backend for analysis
3. Backend generates a commit message using the LLM
4. Extension inserts the message into the commit input

## Command Registration

All commands use the prefix `your-ext.` (e.g., `your-ext.focusChatInput`).

**Core Commands:**

| Command | Keybinding | Description |
|---|---|---|
| `your-ext.focusChatInput` | Ctrl+Shift+A | Focus the chat input field |
| `your-ext.toggleAutoApprove` | Ctrl+Alt+A | Toggle auto-approve for current session |
| `your-ext.openInTab` | — | Open chat in a new editor tab |
| `your-ext.explainCode` | — | Explain selected code |
| `your-ext.fixCode` | — | Fix selected code |
| `your-ext.improveCode` | — | Improve selected code |
| `your-ext.addToContext` | Ctrl+K Ctrl+A | Add selection to session context |
| `your-ext.generateCommitMessage` | — | Generate commit message from diff |
| `your-ext.cycleAgentMode` | Ctrl+. | Cycle through available agents |
| `your-ext.settingsButtonClicked` | — | Open settings panel |
| `your-ext.historyButtonClicked` | — | Show session history |
| `your-ext.plusButtonClicked` | — | Start a new session |

**Menu Contributions:**

```jsonc
{
  "menus": {
    "editor/context": [
      { "submenu": "your-ext.editorContextMenu", "group": "1_ai" }
    ],
    "your-ext.editorContextMenu": [
      { "command": "your-ext.explainCode", "group": "1@1" },
      { "command": "your-ext.fixCode", "group": "1@2" },
      { "command": "your-ext.improveCode", "group": "1@3" },
      { "command": "your-ext.addToContext", "group": "1@4" }
    ],
    "terminal/context": [
      { "submenu": "your-ext.terminalContextMenu", "group": "2_ai" }
    ],
    "your-ext.terminalContextMenu": [
      { "command": "your-ext.terminalAddToContext", "group": "1@1" },
      { "command": "your-ext.terminalFixCommand", "group": "1@2" },
      { "command": "your-ext.terminalExplainCommand", "group": "1@3" }
    ],
    "scm/title": [
      { "command": "your-ext.generateCommitMessage", "group": "navigation" }
    ]
  }
}
```

## Windows Process Spawning

On Windows, spawning child processes without `windowsHide: true` creates a visible CMD window. All process spawning must use a wrapper that enforces `windowsHide: true`:

```typescript
// util/process.ts
import { spawn as nodeSpawn, execFile as nodeExecFile } from "child_process"

export function spawn(command: string, args: string[], options?: SpawnOptions) {
  return nodeSpawn(command, args, { ...options, windowsHide: true })
}

export function execFile(file: string, args?: string[], options?: ExecFileOptions) {
  return nodeExecFile(file, args, { ...options, windowsHide: true })
}
```

## Webview HTML Generation

Webview HTML must include:
- CSP nonce for inline scripts
- VS Code theme CSS variables
- Bundled JS and CSS assets
- `data-theme="vscode"` attribute for theme bridge

```typescript
function buildWebviewHtml(uri: Uri, nonce: string): string {
  return `<!DOCTYPE html>
<html data-theme="vscode">
<head>
  <meta http-equiv="Content-Security-Policy" 
        content="default-src 'self' 'nonce-${nonce}'; 
                 script-src 'self' 'nonce-${nonce}'; 
                 style-src 'self' 'nonce-${nonce}' 'unsafe-inline';
                 font-src 'self' data:;">
  <style nonce="${nonce}">
    :root {
      --vscode-font-family: ${vscode.env.language === 'zh-cn' ? 'Segoe UI, Microsoft YaHei' : 'Segoe UI'};
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${getBundleUri('webview.js')}"></script>
</body>
</html>`
}
```
