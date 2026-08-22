# Session Management

Sessions represent conversations between the user and the AI agent. This document covers session creation, persistence, history, and lifecycle.

## Session Data Model

```typescript
interface Session {
  // Identity
  id: string                    // UUID v4
  title: string                 // Auto-generated or user-renamed
  agent: string                 // Agent ID (e.g., "code", "explore")
  model: string                 // Model ID used
  
  // Context
  directory: string             // Workspace directory
  worktree?: string             // Worktree directory (if applicable)
  
  // Timestamps
  createdAt: number             // Unix timestamp (ms)
  updatedAt: number             // Last activity timestamp (ms)
  
  // State
  status: SessionStatus         // Current status
  
  // Content
  messages: Message[]           // Conversation messages
  
  // Metadata
  usage?: TokenUsage            // Token consumption
  error?: string                // Error message if status is "error"
  tags?: string[]               // User-defined tags for organization
}

type SessionStatus = 
  | "idle"          // Waiting for input
  | "running"       // Actively generating
  | "paused"        // Aborted by user
  | "error"         // Encountered an error
  | "completed"     // Generation finished normally
```

## Message Data Model

```typescript
interface Message {
  id: string                    // Unique message ID
  role: "user" | "assistant" | "system"
  timestamp: number
  
  // Content
  content: MessageContent[]     // Array of content parts
  
  // Tool interactions
  toolCalls?: ToolCall[]        // Tools called by assistant
  toolResults?: ToolResult[]    // Results from tool calls
  
  // Metadata
  usage?: TokenUsage
  error?: string
}

interface MessageContent {
  type: "text" | "image" | "file"
  text?: string
  path?: string                 // For image/file attachments
  mimeType?: string
}

interface ToolCall {
  id: string
  toolID: string
  args: any
  status: "pending" | "running" | "completed" | "error"
}

interface ToolResult {
  toolCallID: string
  output: string
  error?: string
  metadata?: Record<string, any>
}

interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}
```

## Session Creation

### Trigger

A new session is created when:
1. User clicks "New Task" button
2. User sends a message in an empty chat
3. User explicitly requests a new session

### Creation Flow

```
1. User clicks "New Task" or sends first message
        │
        ▼
2. Extension calls POST /v2/sessions
   Body: { agent, model, directory, title }
        │
        ▼
3. Backend creates session:
   - Generates UUID
   - Initializes message list with system prompt
   - Sets status to "idle"
   - Saves to disk
        │
        ▼
4. Backend responds with session info
        │
        ▼
5. Extension sends sessionCreated event to webview
        │
        ▼
6. Webview displays new empty chat
```

### Auto-Generated Title

The first user message is used to generate a title:

```
User: "Fix the login bug in auth.ts"
        │
        ▼
Backend calls LLM to generate a title:
  "Summarize this conversation in 5 words or less"
        │
        ▼
Title: "Fix login bug in auth.ts"
```

## Session Persistence

### Storage Location

```
~/.local/share/your-extension/storage/
└── sessions/
    ├── session-abc123.json     # Individual session files
    ├── session-def456.json
    └── index.json              # Index of all sessions
```

### Session File Format

```json
{
  "id": "session-abc123",
  "title": "Fix login bug in auth.ts",
  "agent": "code",
  "model": "llama3.1:8b",
  "directory": "/home/user/project",
  "createdAt": 1710000000000,
  "updatedAt": 1710001200000,
  "status": "completed",
  "messages": [
    {
      "id": "msg-001",
      "role": "user",
      "timestamp": 1710000000000,
      "content": [{ "type": "text", "text": "Fix the login bug..." }]
    },
    {
      "id": "msg-002",
      "role": "assistant",
      "timestamp": 1710000060000,
      "content": [{ "type": "text", "text": "I'll fix the login bug..." }],
      "toolCalls": [
        { "id": "tc-001", "toolID": "read", "args": { "path": "/home/user/project/src/auth.ts" }, "status": "completed" }
      ]
    }
  ],
  "usage": {
    "promptTokens": 2500,
    "completionTokens": 800,
    "totalTokens": 3300
  }
}
```

### Index File

```json
{
  "sessions": [
    {
      "id": "session-abc123",
      "title": "Fix login bug in auth.ts",
      "agent": "code",
      "model": "llama3.1:8b",
      "directory": "/home/user/project",
      "createdAt": 1710000000000,
      "updatedAt": 1710001200000,
      "status": "completed",
      "messageCount": 12
    }
  ]
}
```

The index file is lightweight and contains only metadata. Full session data is in individual files.

## Session History

### History View

The history panel shows all past sessions:

```
┌─────────────────────────────────────┐
│  Session History              [×]   │
├─────────────────────────────────────┤
│                                     │
│  [Search sessions...]               │
│                                     │
│  Today                              │
│  ┌───────────────────────────────┐  │
│  │ Fix login bug in auth.ts      │  │
│  │ code · llama3.1:8b · 12 msgs │  │
│  │ 2:30 PM                       │  │
│  ├───────────────────────────────┤  │
│  │ Add dark mode to settings     │  │
│  │ code · codestral · 24 msgs   │  │
│  │ 1:15 PM                       │  │
│  └───────────────────────────────┘  │
│                                     │
│  Yesterday                          │
│  ┌───────────────────────────────┐  │
│  │ Set up CI pipeline            │  │
│  │ plan · llama3.1:8b · 8 msgs  │  │
│  │ Yesterday                     │  │
│  └───────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

### Loading History

```typescript
// Extension loads sessions from backend
async function loadSessions() {
  const sessions = await connectionService.fetch<SessionsList>("/v2/sessions")
  webview.postMessage({ type: "loadSessionsSuccess", sessions })
}

// Webview renders the list
function HistoryView() {
  const [sessions, setSessions] = useSessionList()
  const [filter, setFilter] = useState("")
  
  const filtered = sessions.filter(s => 
    s.title.toLowerCase().includes(filter.toLowerCase())
  )
  
  return (
    <div class="history-view">
      <input value={filter} onInput={e => setFilter(e.currentTarget.value)} />
      {groupByDate(filtered).map(group => (
        <div>
          <h3>{group.date}</h3>
          {group.sessions.map(session => (
            <SessionItem session={session} onClick={() => loadSession(session.id)} />
          ))}
        </div>
      ))}
    </div>
  )
}
```

### Session Search

Sessions can be searched by title, content, or tags:

```typescript
// Backend supports full-text search
GET /v2/sessions?search=login&limit=20&before=timestamp
```

## Session Lifecycle

### Active Session States

```
[idle] ──sendMessage──► [running] ──complete──► [completed]
  │                        │                       │
  │                        ├──abort──► [paused]    │
  │                        │                       │
  │                        └──error──► [error] ────┘
  │                        
  └──clear──► [idle] (new session)
```

### Aborting a Session

```
1. User clicks abort button or presses Escape
        │
        ▼
2. Extension sends POST /v2/sessions/:id/abort
        │
        ▼
3. Backend:
   a. Sends SIGINT to any running shell commands
   b. Interrupts LLM streaming
   c. Sets session status to "paused"
   d. Saves current state
        │
        ▼
4. Extension sends sessionUpdated event
        │
        ▼
5. Webview updates status indicator
```

### Clearing a Session

```
1. User clicks clear button or sends new message in empty chat
        │
        ▼
2. Extension sends POST /v2/sessions/:id/clear
        │
        ▼
3. Backend:
   a. Removes all messages from the session
   b. Resets status to "idle"
   c. Keeps agent, model, and directory settings
        │
        ▼
4. Webview shows empty chat with welcome state
```

### Deleting a Session

```
1. User right-clicks session in history → "Delete"
        │
        ▼
2. Extension sends DELETE /v2/sessions/:id
        │
        ▼
3. Backend:
   a. Deletes the session file
   b. Updates the index
        │
        ▼
4. Extension sends sessionDeleted event
        │
        ▼
5. Webview removes from history list
```

## Context Compaction

When a session approaches the model's context limit, compaction reduces the message history:

### Compaction Trigger

```typescript
const CONTEXT_THRESHOLD = 0.8  // Trigger at 80% of context window

function shouldCompact(session: Session, model: ModelInfo): boolean {
  const totalTokens = session.messages.reduce((sum, msg) => sum + countTokens(msg), 0)
  return totalTokens > model.contextLength * CONTEXT_THRESHOLD
}
```

### Compaction Process

```
1. Detect that session exceeds context threshold
        │
        ▼
2. Backend calls LLM to summarize older messages:
   "Summarize the following conversation, keeping key decisions,
    code changes, and important context:"
        │
        ▼
3. LLM returns a summary
        │
        ▼
4. Backend replaces old messages with the summary:
   [summary message] [recent messages...]
        │
        ▼
5. Session continues with reduced context
```

### Compaction UI

When compaction occurs, a system message is inserted:

```
┌─────────────────────────────────────┐
│  [Compacted: 15 messages summarized]│  ← Clickable to expand
├─────────────────────────────────────┤
│  User: Fix the login bug...         │
│  Assistant: I found the issue...    │
│  ...                                │
└─────────────────────────────────────┘
```

## Session Directory Isolation

Sessions are isolated by workspace directory:

```
~/.local/share/your-extension/storage/
└── sessions/
    ├── /home/user/project-a/
    │   ├── session-001.json
    │   └── session-002.json
    └── /home/user/project-b/
        ├── session-003.json
        └── session-004.json
```

This ensures:
- Sessions from different projects don't mix
- File paths in messages are relative to the correct workspace
- Permissions are evaluated against the correct directory

## Session Export

Sessions can be exported for sharing or backup:

```typescript
// Export as Markdown
POST /v2/sessions/:id/export
  ?format=markdown

// Export as JSON
POST /v2/sessions/:id/export
  ?format=json
```

**Markdown Export Format:**

```markdown
# Fix login bug in auth.ts

**Agent:** code · **Model:** llama3.1:8b · **Date:** 2024-03-15

---

**User:** Fix the login bug in auth.ts

**Assistant:** I'll look at the auth.ts file to find the issue.

> Tool: read auth.ts

```typescript
// auth.ts contents...
```

**Assistant:** I found the issue. The login function doesn't handle null emails...

> Tool: edit auth.ts

```diff
- if (email) {
+ if (email && email.trim()) {
```

---

*Exported at 2024-03-15 14:30 UTC*
```
