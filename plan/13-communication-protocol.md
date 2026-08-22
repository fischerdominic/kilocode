# Communication Protocol

This document describes the communication protocols between all components of the extension.

## Protocol Overview

```
┌─────────────┐  postMessage  ┌─────────────┐   HTTP+SSE   ┌─────────────┐
│  Webview     │◄────────────►│  Extension   │◄──────────►│  Backend     │
│  (SolidJS)   │   TypeScript │  (Node.js)   │  JSON/SSE   │  (CLI)       │
└─────────────┘              └─────────────┘              └─────────────┘
```

### Layer 1: Webview ↔ Extension

**Transport:** VS Code's `vscode.postMessage()` API
**Format:** Typed JSON objects
**Direction:** Bidirectional

All messages are fully typed TypeScript interfaces. The extension acts as a relay between the webview and backend.

**Message Flow:**
1. Webview sends a `WebviewMessage` via `vscode.postMessage()`
2. Extension receives it, processes it (may call backend API)
3. Extension sends results back via `webview.postMessage()`
4. Webview receives `ExtensionMessage` and updates UI

**Type Safety:**
Both sides share a common message type definition file (`types/messages/index.ts`). The extension compiles this for Node.js, and the webview compiles it for the browser.

### Layer 2: Extension ↔ Backend

**Transport:** HTTP REST + Server-Sent Events (SSE)
**Format:** JSON over HTTP
**Direction:** Bidirectional (REST is request/response, SSE is server→client)
**Auth:** Bearer token (random password in `YOUR_EXT_SERVER_PASSWORD` env var)

**REST Endpoints:**
- Standard HTTP methods (GET, POST, PATCH, DELETE)
- URL-encoded paths with session/provider IDs
- JSON request/response bodies

**SSE Event Stream:**
- Single endpoint: `GET /v2/events`
- Events are JSON objects with `type` and `data` fields
- Extension subscribes and forwards relevant events to the webview
- Automatic reconnection on disconnect

## Message Types

### Extension → Webview Messages

```typescript
// Connection
type ExtensionMessage =
  | { type: "ready"; serverInfo: ServerInfo; extensionVersion: string }
  | { type: "connectionState"; state: "connected" | "connecting" | "disconnected"; error?: string }

// Sessions
| { type: "sessionCreated"; session: SessionInfo }
| { type: "sessionDeleted"; sessionID: string }
| { type: "sessionUpdated"; session: SessionInfo }
| { type: "sessionTitle"; sessionID: string; title: string }
| { type: "loadSessionsSuccess"; sessions: SessionInfo[] }

// Messages (streaming)
| { type: "messageChunk"; sessionID: string; messageID: string; text: string; role: "assistant" | "user" }
| { type: "messageComplete"; sessionID: string; messageID: string }
| { type: "messageError"; sessionID: string; messageID: string; error: string }

// Tool calls
| { type: "toolCall"; sessionID: string; messageID: string; toolID: string; args: any }
| { type: "toolResult"; sessionID: string; messageID: string; toolID: string; output: string; error?: string }

// Permissions
| { type: "permissionRequest"; request: PermissionRequest }
| { type: "permissionCleared"; requestID: string }
| { type: "permissionBatch"; requests: PermissionRequest[] }

// Questions
| { type: "questionRequest"; question: QuestionRequest }
| { type: "questionCleared"; questionID: string }

// Configuration
| { type: "configLoaded"; config: Config }
| { type: "configUpdated"; config: Config }

// Providers
| { type: "providersLoaded"; providers: Provider[] }
| { type: "providerSelected"; provider: ModelSelection }

// Agents
| { type: "agentsLoaded"; agents: AgentInfo[] }
| { type: "agentSelected"; agent: string }

// Errors
| { type: "errorBanner"; message: string; details?: string }

// Notifications
| { type: "notification"; title: string; message: string; sound?: boolean }
```

### Webview → Extension Messages

```typescript
type WebviewMessage =
  // Session management
  | { type: "createSession" }
  | { type: "clearSession"; sessionID?: string }
  | { type: "deleteSession"; sessionID: string }
  | { type: "loadSessions" }
  | { type: "loadMessages"; sessionID: string; mode?: "replace" | "prepend"; before?: string; limit?: number }
  | { type: "renameSession"; sessionID: string; title: string }

  // Messaging
  | { type: "sendMessage"; text: string; files?: FileAttachment[]; agent?: string; modelID?: string }
  | { type: "abort"; sessionID: string }

  // Permissions
  | { type: "permissionResponse"; permissionId: string; response: "once" | "always" | "reject" }
  | { type: "allowEverything"; enable: boolean; sessionID?: string }

  // Questions
  | { type: "questionReply"; questionID: string; answer: string }

  // Model/Agent selection
  | { type: "selectModel"; providerID: string; modelID: string }
  | { type: "selectAgent"; agent: string }

  // Configuration
  | { type: "updateConfig"; patch: Partial<Config> }
  | { type: "updateProvider"; config: ProviderConfig }
  | { type: "updateAgent"; agent: AgentDefinition }
  | { type: "deleteAgent"; agentID: string }
  | { type: "updatePermission"; rules: PermissionRuleset }
  | { type: "updateMcpConfig"; servers: McpServerConfig[] }

  // UI actions
  | { type: "focusInput" }
  | { type: "toggleAutoApprove" }
  | { type: "togglePermissionDock" }
  | { type: "searchMessages"; query: string }
  | { type: "copyMessage"; messageID: string }
  | { type: "exportTranscript"; sessionID: string }
```

## SSE Event Format

```typescript
interface SSEEvent {
  type: string                    // Event type
  data: any                       // Event payload
  id?: string                     // Event ID (for reconnection)
  retry?: number                  // Reconnection delay (ms)
}

// Example events:
{ type: "session:message", data: { sessionID: "abc123", text: "Hello", role: "assistant" } }
{ type: "session:tool_call", data: { sessionID: "abc123", toolID: "bash", args: { command: "ls" } } }
{ type: "permission:asked", data: { id: "perm_001", permission: "bash", patterns: ["*"], tool: "bash" } }
{ type: "session:completed", data: { sessionID: "abc123", status: "completed" } }
{ type: "session:error", data: { sessionID: "abc123", error: "Provider timeout" } }
```

## Connection Lifecycle

### Extension Startup

```
1. Extension activates
2. ConnectionService created (no backend yet)
3. Webview providers registered
4. First webview connects or autocomplete triggers
5. ServerManager spawns backend: `your-ext-serve --port 0`
6. Backend prints port to stdout
7. Extension captures port, generates password
8. Extension connects HTTP + SSE
9. ReadyMessage sent to webview
```

### Reconnection

```
1. SSE connection drops
2. SSEClient detects disconnect
3. ServerManager checks if backend is still running
4. If running → SSEClient reconnects
5. If not running → ServerManager restarts backend
6. New connection established
7. ConnectionStateMessage sent to webview
8. Active sessions are restored via loadMessages
```

### Extension Shutdown

```
1. User closes VS Code or deactivates extension
2. deactivate() called
3. All webview providers disposed
4. SSE connection closed
5. Backend process killed
6. Cleanup complete
```

## Error Handling

### Connection Errors

| Scenario | Extension Behavior | Webview Display |
|---|---|---|
| Backend not started | Show "Starting..." spinner | Connecting indicator |
| Backend crashes | Restart backend, retry connection | "Reconnecting..." banner |
| Network error | Retry with backoff (1s, 2s, 4s, max 30s) | "Connection lost" with retry button |
| Auth failure | Log error, show settings prompt | "Authentication failed" error |

### Message Delivery

- SSE events are processed in order
- If a message is dropped, the next SSE connect will fetch missing messages via REST
- Session state is authoritative; webview state is derived

## Security

### Authentication

- Random password generated per extension session
- Passed to backend via environment variable
- Used as Bearer token for all HTTP requests
- Never logged or exposed in UI

### Content Security Policy

Webview HTML includes strict CSP:

```
default-src 'self';
script-src 'self' 'nonce-{random}';
style-src 'self' 'nonce-{random}' 'unsafe-inline';
font-src 'self' data:;
connect-src 'self' http://127.0.0.1:*;
img-src 'self' data:;
```

### Data Isolation

- Each extension instance has its own backend process
- Sessions are isolated by directory (workspace)
- Config is scoped to global vs project
- No data leaks between workspaces
