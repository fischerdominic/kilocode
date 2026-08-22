# Recommendations and Ideas

This document contains additional recommendations, feature ideas, and architectural considerations for your extension.

## Recommended Features to Implement

### Phase 1: Core (MVP)

These are essential for a usable extension:

1. **Single Provider Configuration**
   - OpenAI-compatible API connection
   - Model discovery and selection
   - Connection testing
   - API key management

2. **Basic Chat Interface**
   - Message sending and streaming
   - Markdown rendering
   - Code block display with syntax highlighting
   - Copy-to-clipboard

3. **Agent System**
   - At least 2 built-in agents (code + explore)
   - Agent switching in the UI
   - Per-agent permission profiles
   - System prompt configuration

4. **Tool Execution**
   - Shell commands via VS Code terminal
   - File read/write/edit
   - Grep and glob search
   - Web fetch

5. **Permission System**
   - Allow/ask/deny rules
   - Permission request UI (dock panel)
   - "Allow Always" persistence
   - Auto-approve toggle

6. **Session Management**
   - Create, switch, delete sessions
   - Session history browser
   - Session title (auto-generated)
   - Abort generation

7. **Settings UI**
   - Provider settings tab
   - Agent settings tab
   - Permission rules editor
   - General settings (font, auto-approve)

### Phase 2: Enhanced Experience

These significantly improve the user experience:

8. **MCP Tool Support**
   - MCP server configuration UI
   - Auto-discovery of MCP tools
   - Playwright MCP integration
   - Custom MCP server support

9. **Browser Automation**
   - Playwright-based browser control
   - Navigate, click, type, screenshot
   - Headless and visible modes
   - Permission control for browser tools

10. **Autocomplete**
    - Inline code completion
    - FIM model support
    - Debouncing and cancellation
    - Accept/dismiss gestures

11. **Notification System**
    - Sound alerts for events
    - VS Code notifications
    - In-UI status indicators
    - Configurable per-event sounds

12. **Context Management**
    - File attachment in messages
    - Drag-and-drop support
    - Image paste support
    - Open file context inclusion

### Phase 3: Advanced Features

These differentiate the extension:

13. **Multi-Agent Orchestration**
    - Subagent spawning from primary agent
    - Parallel task execution
    - Subagent result aggregation
    - Visual subagent tree in UI

14. **Smart Permissions**
    - Pattern-based auto-approval
    - Session-scoped permissions
    - Permission templates (safe/medium/unsafe)
    - Permission audit log

15. **Code Actions**
    - Right-click "Explain Code"
    - Right-click "Fix Code"
    - Right-click "Improve Code"
    - Terminal context menu actions

16. **Commit Message Generation**
    - AI-generated commit messages from diff
    - SCM panel button
    - Customizable prompt

17. **Session Export**
    - Export to Markdown
    - Export to JSON
    - Shareable session links

18. **Keyboard Shortcuts**
    - Focus chat input (Ctrl+Shift+A)
    - Toggle auto-approve (Ctrl+Alt+A)
    - Cycle agents (Ctrl+.)
    - New session (Ctrl+N)
    - Search messages (Ctrl+F)

## UI/UX Recommendations

### Design Principles

1. **Slim and Modern**
   - Minimal padding and margins
   - Compact message density
   - Collapsible sections for tool calls
   - Dark theme first (VS Code default)

2. **Responsive**
   - Adapts to sidebar width (250px - 600px)
   - Tab panel mode for wider layouts
   - Touch-friendly targets for remote use

3. **Performance-First**
   - Virtual scrolling for long chats
   - Lazy rendering of tool results
   - Debounced input processing
   - Minimal re-renders via SolidJS signals

### Layout Recommendations

**Sidebar Chat (narrow):**
```
┌─────────────────────────┐
│ Title    [⚙][◉][+]     │  ← Compact header
├─────────────────────────┤
│                         │
│  Messages (scroll)      │
│                         │
├─────────────────────────┤
│ [agent] [model] [📎]   │  ← Minimal rail
│ ┌─────────────────────┐ │
│ │ Type your message.. │ │  ← Compact input
│ └─────────────────────┘ │
└─────────────────────────┘
```

**Tab Panel Chat (wide):**
```
┌──────────────────────────────────────────┐
│ Fix login bug  ● Running  [▸][⚙][◉][+] │
├──────────┬───────────────────────────────┤
│ History  │  Messages (full width)        │
│          │                               │
│ • Session│  User: Fix the login bug...   │
│ • Session│  Assistant: I'll check...      │
│ • Session│    > Tool: read auth.ts       │
│          │    [output]                    │
│          │                               │
│          │  [agent] [model] [📎]         │
│          │  ┌─────────────────────────┐  │
│          │  │ Type your message...    │  │
│          │  └─────────────────────────┘  │
└──────────┴───────────────────────────────┘
```

### Color Scheme

Use VS Code theme variables exclusively:

```css
:root {
  --bg-primary: var(--vscode-editor-background);
  --bg-secondary: var(--vscode-sideBar-background);
  --bg-tertiary: var(--vscode-editorGroupHeader-tabsBackground);
  --fg-primary: var(--vscode-editor-foreground);
  --fg-secondary: var(--vscode-descriptionForeground);
  --fg-muted: var(--vscode-disabledForeground);
  --border: var(--vscode-panel-border);
  --accent: var(--vscode-charts-blue);
  --success: var(--vscode-charts-green);
  --warning: var(--vscode-charts-yellow);
  --error: var(--vscode-charts-red);
  --input-bg: var(--vscode-input-background);
  --input-fg: var(--vscode-input-foreground);
  --button-bg: var(--vscode-button-background);
  --button-fg: var(--vscode-button-foreground);
}
```

## Architecture Recommendations

### Build System

Use **esbuild** for fast builds:

```javascript
// esbuild.js
const extensionConfig = {
  entryPoints: ["src/extension.ts"],
  bundle: true,
  outfile: "dist/extension.js",
  format: "cjs",
  platform: "node",
  target: "node18",
  external: ["vscode"],
}

const webviewConfig = {
  entryPoints: ["webview-ui/src/index.tsx"],
  bundle: true,
  outfile: "dist/webview.js",
  format: "iife",
  platform: "browser",
  target: "es2022",
  plugins: [solidPlugin()],
}
```

### TypeScript Configuration

Separate tsconfig for extension and webview:

```jsonc
// tsconfig.json (extension)
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "node",
    "outDir": "dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}

// tsconfig.webview.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "jsxImportSource": "solid-js",
    "outDir": "dist",
    "strict": true
  },
  "include": ["webview-ui/src/**/*"]
}
```

### Backend Runtime

**Recommendation: Use Bun for the backend**

Benefits:
- Faster startup than Node.js
- Built-in TypeScript support
- Native WebSocket and SSE support
- Smaller binary size
- Better performance for I/O-bound work

If Bun is not available, fall back to Node.js 18+:

```jsonc
// package.json (backend)
{
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### State Management

Use SolidJS signals for webview state (no Redux, no Context heavy-lifting):

```typescript
// Instead of Redux/store patterns, use signals:
const [messages, setMessages] = createSignal<Message[]>([])
const [status, setStatus] = createSignal<SessionStatus>("idle")
const [permissionQueue, setPermissionQueue] = createSignal<PermissionRequest[]>([])

// Components read signals reactively:
function MessageList() {
  const msgs = messages()  // Auto-subscribes
  return <For each={msgs()}>{msg => <TranscriptRow message={msg} />}</For>
}
```

### Error Boundaries

Wrap the webview in error boundaries to prevent crashes:

```typescript
// App.tsx
function ErrorBoundary({ children }) {
  const [error, setError] = createSignal<Error | null>(null)
  
  return (
    <ErrorBoundary
      onReset={() => setError(null)}
      fallback={error => <ErrorDisplay error={error()} />}
    >
      {children}
    </ErrorBoundary>
  )
}
```

## Security Recommendations

1. **Never log API keys** — Mask them in all output
2. **Validate all user input** — Config files, message text, file paths
3. **Sandbox shell commands** — Use VS Code terminal (already planned)
4. **Limit file access** — Only allow access within the workspace directory
5. **Rate limit API calls** — Prevent abuse of the provider
6. **Validate MCP server configs** — Don't execute arbitrary commands
7. **CSP for webview** — Strict Content Security Policy
8. **No eval()** — Never use eval or Function constructor

## Testing Strategy

### Unit Tests

Test individual modules:
- Config parsing and validation
- Permission evaluation
- Tool execution (mocked)
- Session serialization

### Integration Tests

Test component interactions:
- Message sending flow
- Permission request → approval flow
- Session creation → message → completion flow

### Visual Regression Tests

Test UI rendering:
- Chat layout at different widths
- Permission dock states
- Error states
- Dark/light theme

## Deployment Recommendations

### VS Code Extension Publishing

```jsonc
// package.json
{
  "publisher": "your-publisher",
  "name": "your-extension",
  "displayName": "Your Extension Name",
  "icon": "assets/icons/extension-icon.png",
  "galleryBanner": {
    "color": "#1e1e2e",
    "theme": "dark"
  },
  "categories": ["AI", "Chat", "Programming Languages"],
  "keywords": ["ai", "coding agent", "chat", "llm", "ollama"]
}
```

### VSIX Packaging

Include only necessary files:

```
.vscodeignore:
**/.git/**
**/.vscode-test/**
**/*.test.ts
**/*.spec.ts
**/test/**
**/*.map
**/node_modules/**
!**/@kilocode/**
```

### Update Channel

- Use `engines.vscode` to specify minimum VS Code version
- Semantic versioning for extension versions
- Changelog in CHANGELOG.md

## Performance Targets

| Metric | Target |
|---|---|
| Extension activation time | < 500ms |
| First message response | < 2s (local model) |
| Streaming token latency | < 100ms |
| Webview render time | < 50ms |
| Memory usage (idle) | < 100MB |
| Memory usage (active) | < 300MB |
| Build time (dev) | < 5s |
| Build time (prod) | < 15s |

## Future Considerations

### Multi-Provider Support (Optional)

If you later want to support multiple providers:
- Add a provider list in settings
- Allow per-session model selection
- Cache provider credentials securely
- Support OAuth flows for cloud providers

### Cloud Sync (Optional)

If you want session sync across machines:
- Export/import session archives
- Cloud storage backend (S3, etc.)
- End-to-end encryption for privacy

### Plugin System (Optional)

If you want extensibility:
- Custom tool plugins (TypeScript files)
- Custom agent definitions (Markdown files)
- Extension API for third-party plugins

### JetBrains Integration (Optional)

If you want a JetBrains plugin:
- Same backend (reuse the CLI)
- Different extension host (IntelliJ platform)
- Similar webview UI (Compose UI or webview)

## Development Workflow

### Recommended Tools

| Tool | Purpose |
|---|---|
| VS Code | Development IDE |
| Bun | Runtime + package manager |
| esbuild | Build system |
| TypeScript | Type checking |
| ESLint | Linting |
| Prettier | Code formatting |

### Development Commands

```bash
# Install dependencies
bun install

# Type check
bun run typecheck

# Build extension + webview
bun run build

# Watch mode (auto-rebuild on changes)
bun run watch

# Launch in VS Code with extension
bun run dev

# Run extension tests
bun run test
```

### Git Workflow

```bash
# Create feature branch
git checkout -b feat/browser-automation

# Make changes
# ...

# Commit with conventional commits
git commit -m "feat(browser): add Playwright MCP integration"

# Push and create PR
git push -u origin feat/browser-automation
gh pr create --title "feat(browser): add Playwright MCP"
```

## Summary

This extension should be:
- **Simple to configure** — Single provider, clear settings
- **Powerful in use** — Full tool access, MCP support, browser automation
- **Safe by default** — Permission prompts, VS Code terminal, deny-by-default
- **Fast and responsive** — SolidJS, virtual scrolling, streaming
- **Modern and slim** — Clean UI, dark theme, compact layout

The architecture separates concerns cleanly (extension ↔ backend), uses proven technologies (SolidJS, Hono, Vercel AI SDK), and follows VS Code extension best practices. Start with Phase 1 (core features), validate the architecture, then add Phase 2 and 3 features as needed.
