# Webview UI Architecture

The webview UI is a SolidJS single-page application that renders inside VS Code's webview container. It provides the chat interface, settings panel, and permission/question interaction surfaces.

## Technology Stack

| Component | Technology | Purpose |
|---|---|---|
| Framework | SolidJS 1.9+ | Reactive UI with fine-grained updates |
| Build | esbuild + esbuild-plugin-solid | Fast bundling with Solid JSX transform |
| Styling | CSS custom properties + @kobalte/core | VS Code theme integration |
| Terminal | @xterm/xterm 6.0 | Terminal emulation (if needed) |
| Icons | VS Code Codicons | Native VS Code icon set |
| Markdown | marked | Markdown rendering for messages |
| Virtualization | virtua | Virtual scroll for message lists |

## Provider Hierarchy

The webview uses SolidJS context providers for state management:

```
App
├── VSCodeProvider        # VS Code API bridge (postMessage)
├── ThemeProvider         # VS Code theme variables
├── I18nProvider          # Internationalization (if needed)
├── ServerProvider        # Backend connection state
├── ProviderProvider      # AI provider/model selection
├── SessionProvider       # Active session state
├── AgentProvider         # Agent selection
├── PermissionQueueProvider # Pending permission requests
├── ConfigProvider        # Configuration state
└── DialogProvider        # Modal dialog management
```

## Message Flow Architecture

### Extension ↔ Webview Communication

All communication goes through `vscode.postMessage()` with typed message objects.

**Extension → Webview Messages:**
```typescript
type ExtensionMessage =
  | ReadyMessage                    // Initial connection info
  | ConnectionStateMessage          // Backend connection state changes
  | SessionMessage                  // Session updates (create, delete, title)
  | MessageChunkMessage             // Streaming text chunk
  | ToolCallMessage                 // Tool call event
  | ToolResultMessage               // Tool result event
  | PermissionRequestMessage        // Permission needs approval
  | PermissionClearedMessage        // Permission request resolved
  | QuestionRequestMessage          // Interactive question
  | QuestionClearedMessage          // Question resolved
  | ErrorBannerMessage              // Error to display
  | ConfigLoadedMessage             // Configuration data
  | ProviderLoadedMessage           // Provider/model list
  | AgentLoadedMessage              // Agent list
  | NotificationMessage             // System notification
```

**Webview → Extension Messages:**
```typescript
type WebviewMessage =
  | SendMessageRequest              // User sends a message
  | AbortRequest                    // Abort current generation
  | CreateSessionRequest            // Start new session
  | ClearSessionRequest             // Clear current session
  | LoadMessagesRequest             // Load session history
  | LoadSessionsRequest             // Load all sessions
  | PermissionResponseRequest       // Approve/deny permission
  | QuestionReplyRequest            // Answer interactive question
  | ModelSelectionRequest           // Change model/provider
  | AgentSelectionRequest           // Change agent
  | ConfigUpdateRequest             // Update configuration
  | FocusInputRequest               // Focus chat input
```

### SSE Event Handling

The backend pushes real-time events via SSE. The extension receives these and forwards them to the active webview:

```
Backend SSE Event
        │
        ▼
Extension SSE Client
        │
        ▼
mapSSEEventToWebviewMessage(event)
        │
        ▼
Webview (via postMessage)
        │
        ▼
SolidJS context update → UI re-render
```

## Core UI Components

### Chat View (`components/chat/ChatView.tsx`)

The main chat interface that displays messages and accepts input.

**Layout:**
```
┌─────────────────────────────────────┐
│  TaskHeader                         │  ← Model, agent, status, abort button
├─────────────────────────────────────┤
│                                     │
│  MessageList (virtualized)          │  ← Scrollable message area
│  ┌─────────────────────────────┐    │
│  │ User Message                │    │
│  ├─────────────────────────────┤    │
│  │ Assistant Message           │    │
│  │   ┌─ Tool Call ────────┐   │    │
│  │   │ bash: npm install   │   │    │
│  │   │ [Approved] [Result] │   │    │
│  │   └─────────────────────┘   │    │
│  ├─────────────────────────────┤    │
│  │ Assistant Message (streaming)│   │
│  │   ...typing indicator       │    │
│  └─────────────────────────────┘    │
│                                     │
├─────────────────────────────────────┤
│  PromptRail                         │  ← Agent, model, attachments
├─────────────────────────────────────┤
│  PromptInput                      →│  ← Text input + send button
└─────────────────────────────────────┘
```

**Key Features:**
- Virtual scrolling for performance with long conversations
- Streaming text rendering with cursor animation
- Collapsible tool call sections
- Inline permission approval/denial
- Markdown rendering with code syntax highlighting
- Copy-to-clipboard for code blocks
- Timestamp display on messages

### Message List (`components/chat/MessageList.tsx`)

Virtualized list of messages using `virtua` for performance.

**Implementation:**
- Renders only visible messages + a buffer (typically 10 above/below viewport)
- Each message row is a separate SolidJS component for isolated reactivity
- Sticky headers for tool call groups
- Smooth scroll-to-bottom on new messages

### Transcript Row (`components/chat/TranscriptRow.tsx`)

Renders a single message with appropriate styling based on role.

**Message Types:**
- **User message**: Simple text with optional file attachments
- **Assistant text**: Markdown-rendered with streaming cursor
- **Tool call**: Collapsible card showing tool name, arguments, and result
- **Error**: Red-highlighted error message with details
- **System**: Grayed-out system messages (compaction, etc.)

### Prompt Input (`components/chat/PromptInput.tsx`)

Multi-line text input with autocomplete support.

**Features:**
- Auto-resize height (grows with content, max 6 lines)
- Ctrl+Enter to send, Shift+Enter for new line
- File attachment via drag-and-drop or button
- Agent/model quick selectors
- Chat autocomplete (if enabled)
- Image paste support
- Token count display

### Prompt Rail (`components/chat/PromptRail.tsx`)

Toolbar above the input with quick-access controls.

**Controls:**
- Agent selector (dropdown with current agent highlighted)
- Model selector (dropdown with current model highlighted)
- File attachment button
- Memory toggle (if enabled)
- Indexing status indicator

### Task Header (`components/chat/TaskHeader.tsx`)

Header bar showing session metadata and controls.

**Elements:**
- Session title (editable)
- Current model name
- Current agent name
- Status indicator (running/idle/error)
- Abort button (shown when running)
- Token usage display (if enabled)
- History button
- New session button
- Settings button

### Task Timeline (`components/chat/TaskTimeline.tsx`)

Visual progress indicator showing session flow.

**Displays:**
- Message count
- Tool calls count
- Current step in the loop
- Time elapsed
- Tokens consumed

### Permission Dock (`components/chat/PermissionDock.tsx`)

Slide-out panel for handling permission requests.

**Layout:**
```
┌─────────────────────────────────────┐
│  Permission Request          [×]    │
├─────────────────────────────────────┤
│  Tool: bash                         │
│  Command: npm install               │
│  Pattern: *                         │
│                                     │
│  [Allow Once] [Allow Always] [Deny] │
│                                     │
│  ☑ Also approve all similar requests│
└─────────────────────────────────────┘
```

**Behavior:**
- Appears as a slide-out panel on the right
- Stacks multiple pending requests
- "Allow Always" persists the rule to config
- "Allow Once" applies only to this request
- Keyboard shortcut: Enter to approve, Shift+Enter to deny

### Question Dock (`components/chat/QuestionDock.tsx`)

Interactive question panel for when the agent needs user input.

**Layout:**
```
┌─────────────────────────────────────┐
│  Question                      [×]  │
├─────────────────────────────────────┤
│  The agent needs to know:           │
│  "Which package manager do you     │
│   use: npm, yarn, or pnpm?"         │
│                                     │
│  [npm] [yarn] [pnpm]                │
│  ─────────────────                  │
│  [Custom answer...]    [Cancel]     │
└─────────────────────────────────────┘
```

### Welcome Empty State (`components/chat/WelcomeEmptyState.tsx`)

Displayed when no session exists or a session is empty.

**Content:**
- Extension logo and name
- Quick-start prompt suggestions
- Feature highlights (agents, MCP tools, browser automation)
- Link to settings for first-time setup

### Settings View (`components/settings/`)

Full settings editor rendered in a webview panel.

**Tabs:**
1. **Provider** — Configure the AI provider (URL, API key, model)
2. **Agents** — Define and edit agents (name, description, prompt, permissions)
3. **Permissions** — Global permission rules (allow/ask/deny per tool)
4. **MCP Servers** — Add/remove MCP server configurations
5. **Shell** — Shell selection and configuration
6. **Browser** — Browser automation settings
7. **Notifications** — Sound and alert preferences
8. **General** — Font size, language, auto-approve default

## Styling System

### CSS Custom Properties (VS Code Theme Bridge)

The webview reads VS Code's CSS variables to match the host theme:

```css
:root {
  --vscode-font-family: var(--vscode-font-family);
  --vscode-font-size: var(--vscode-font-size);
  --vscode-editor-bg: var(--vscode-editor-background);
  --vscode-editor-fg: var(--vscode-editor-foreground);
  --vscode-border: var(--vscode-panel-border);
  --vscode-input-bg: var(--vscode-input-background);
  --vscode-input-fg: var(--vscode-input-foreground);
  --vscode-button-bg: var(--vscode-button-background);
  --vscode-button-fg: var(--vscode-button-foreground);
  --vscode-danger: var(--vscode-errorForeground);
  --vscode-success: var(--vscode-charts-green);
  --vscode-warning: var(--vscode-warningForeground);
  --vscode-info: var(--vscode-charts-blue);
}
```

### Responsive Design

The UI adapts to different panel widths:

| Width | Layout |
|---|---|
| < 300px | Collapsed sidebar, minimal controls |
| 300-500px | Standard sidebar with scrollable content |
| 500-800px | Full sidebar with permission dock |
| > 800px | Tab panel layout with maximum readability |

### Dark/Light Theme

All colors use VS Code theme variables. No hardcoded colors. The `data-theme` attribute on the HTML root triggers the correct variable set.

## Virtualization Strategy

For long conversations, the message list uses virtual scrolling:

1. **virtua** library provides `FixedSizeList` for message rows
2. Each row has a fixed height (calculated from content)
3. Only visible rows + 10 above + 10 below are rendered
4. Tool call sections are collapsible to reduce height
5. Scroll position is preserved when switching between sessions

## Markdown Rendering

Messages containing Markdown are rendered using `marked` with custom extensions:

- **Code blocks**: Syntax highlighting via highlight.js or Prism
- **Tables**: Styled with VS Code theme colors
- **Inline code**: Monospace with background highlight
- **Links**: Open in VS Code via `vscode.open` command
- **Images**: Display inline with max-width constraint
- **Task lists**: Checkbox rendering

## Keyboard Shortcuts (in Webview)

| Shortcut | Action |
|---|---|
| Enter | Send message |
| Shift+Enter | New line |
| Ctrl+Enter | Send (alternative) |
| Escape | Cancel streaming / Close dock |
| Ctrl+/ | Toggle permission dock |
| Ctrl+Shift+K | Clear session |
| Ctrl+N | New session |
| Ctrl+F | Search messages |
| Tab | Autocomplete accept (if suggestion visible) |
| Escape | Dismiss autocomplete |
