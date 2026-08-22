# Project Structure

## Directory Layout

```
your-extension/
├── package.json                    # Extension manifest (VS Code)
├── tsconfig.json                   # TypeScript config for extension host
├── tsconfig.webview.json           # TypeScript config for webview
├── esbuild.js                      # Build configuration (extension + webview)
├── .vscodeignore                   # Files excluded from VSIX package
├── assets/
│   ├── icons/
│   │   ├── extension-icon.png      # Activity bar icon
│   │   ├── extension-icon.svg      # Scalable icon variant
│   │   └── panel-icon.svg          # Panel/tab icon
│   └── audio/
│       └── notification.wav        # Notification sound
├── src/                            # Extension host code (Node.js)
│   ├── extension.ts                # Entry point, activation, command registration
│   ├── constants.ts                # Display names, IDs, defaults
│   ├── services/
│   │   ├── backend-connection.ts   # Backend lifecycle, spawn, HTTP/SSE client
│   │   ├── autocomplete.ts         # Inline completion provider
│   │   ├── attention.ts            # Notification sounds, visual alerts
│   │   ├── browser-automation.ts   # Playwright MCP registration
│   │   ├── code-actions.ts         # Editor/terminal context menu actions
│   │   ├── commit-message.ts       # AI-generated commit messages
│   │   ├── terminal.ts             # VS Code terminal integration
│   │   └── types.ts                # Shared type definitions
│   ├── providers/
│   │   ├── SidebarProvider.ts      # Sidebar webview view provider
│   │   ├── TabPanelProvider.ts     # Open-in-tab webview panel provider
│   │   └── SettingsProvider.ts     # Settings editor provider
│   ├── commands/
│   │   ├── toggle-auto-approve.ts  # Auto-approve toggle command
│   │   └── index.ts                # Command registry
│   └── util/
│       ├── process.ts              # Safe process spawning (Windows-aware)
│       ├── retry.ts                # Retry with backoff
│       └── vscode.ts               # VS Code API helpers
├── webview-ui/                     # Webview UI code (browser/SolidJS)
│   ├── src/
│   │   ├── index.tsx               # Webview entry point
│   │   ├── App.tsx                 # Root component, provider hierarchy
│   │   ├── types/
│   │   │   ├── messages/
│   │   │   │   ├── extension-messages.ts  # Extension → Webview messages
│   │   │   │   ├── webview-messages.ts    # Webview → Extension messages
│   │   │   │   ├── sessions.ts             # Session types
│   │   │   │   ├── providers.ts            # Provider/model types
│   │   │   │   ├── agents.ts               # Agent types
│   │   │   │   ├── config.ts               # Config types
│   │   │   │   ├── permissions.ts          # Permission request types
│   │   │   │   └── questions.ts            # Question types
│   │   │   └── index.ts
│   │   ├── context/
│   │   │   ├── server.tsx            # Backend connection state context
│   │   │   ├── session.tsx           # Active session context
│   │   │   ├── provider.tsx          # Provider/model selection context
│   │   │   ├── agent.tsx             # Agent selection context
│   │   │   ├── permission-queue.tsx  # Pending permissions context
│   │   │   ├── config.tsx            # Config state context
│   │   │   └── vscode.tsx            # VS Code API bridge context
│   │   ├── components/
│   │   │   ├── chat/
│   │   │   │   ├── ChatView.tsx      # Main chat container
│   │   │   │   ├── MessageList.tsx   # Virtualized message list
│   │   │   │   ├── TranscriptRow.tsx # Single message render
│   │   │   │   ├── PromptInput.tsx   # Text input with autocomplete
│   │   │   │   ├── PromptRail.tsx    # Attachment/agent/model selectors
│   │   │   │   ├── TaskHeader.tsx    # Session header (model, agent, status)
│   │   │   │   ├── TaskTimeline.tsx  # Session progress visualization
│   │   │   │   ├── PermissionDock.tsx # Approve/deny panel
│   │   │   │   ├── QuestionDock.tsx  # Interactive question panel
│   │   │   │   ├── AssistantMessage.tsx # AI response rendering
│   │   │   │   ├── VscodeUserMessage.tsx # User message rendering
│   │   │   │   ├── ErrorDisplay.tsx  # Error state rendering
│   │   │   │   └── WelcomeEmptyState.tsx # Empty state welcome
│   │   │   ├── settings/
│   │   │   │   ├── SettingsView.tsx  # Settings container
│   │   │   │   ├── ProviderSettings.tsx # Provider configuration
│   │   │   │   ├── AgentSettings.tsx  # Agent definition editor
│   │   │   │   ├── PermissionSettings.tsx # Permission rules editor
│   │   │   │   ├── ShellSettings.tsx    # Shell configuration
│   │   │   │   ├── BrowserSettings.tsx # Browser automation config
│   │   │   │   ├── NotificationSettings.tsx # Sound/alert config
│   │   │   │   └── GeneralSettings.tsx # General settings
│   │   │   ├── history/
│   │   │   │   ├── HistoryView.tsx   # Session history browser
│   │   │   │   └── SessionItem.tsx   # Single session in history
│   │   │   └── shared/
│   │   │       ├── Spinner.tsx       # Loading indicator
│   │   │       ├── IconButton.tsx    # Icon button component
│   │   │       ├── Dialog.tsx        # Modal dialog
│   │   │       └── Markdown.tsx      # Markdown renderer
│   │   ├── hooks/
│   │   │   ├── useVSCode.ts         # VS Code postMessage hook
│   │   │   ├── useSession.ts        # Session lifecycle hook
│   │   │   └── usePermission.ts     # Permission handling hook
│   │   ├── styles/
│   │   │   ├── global.css           # Global styles, CSS variables
│   │   │   ├── chat.css             # Chat-specific styles
│   │   │   └── settings.css         # Settings panel styles
│   │   └── utils/
│   │       ├── format.ts            # Number, time, size formatting
│   │       └── markdown.ts          # Markdown processing
│   └── tsconfig.json
├── backend/                          # Backend engine (standalone CLI)
│   ├── src/
│   │   ├── index.ts                  # Entry point, CLI commands
│   │   ├── server/
│   │   │   ├── server.ts            # Hono HTTP server setup
│   │   │   ├── routes/
│   │   │   │   ├── session.ts       # Session CRUD + streaming
│   │   │   │   ├── config.ts        # Config read/write
│   │   │   │   ├── provider.ts      # Provider management
│   │   │   │   ├── agent.ts         # Agent management
│   │   │   │   ├── tool.ts          # Tool listing + execution
│   │   │   │   ├── permission.ts    # Permission requests/replies
│   │   │   │   └── mcp.ts           # MCP client management
│   │   │   └── sse.ts               # SSE event stream handler
│   │   ├── config/
│   │   │   ├── config.ts            # Config file loading (kilo.jsonc)
│   │   │   ├── agent.ts             # Agent definition parsing
│   │   │   ├── permission.ts        # Permission rules parsing
│   │   │   └── mcp.ts               # MCP server configuration
│   │   ├── provider/
│   │   │   ├── provider.ts          # AI provider abstraction
│   │   │   ├── models.ts            # Model registry + selection
│   │   │   └── auth.ts              # API key / auth management
│   │   ├── agent/
│   │   │   ├── agent.ts             # Agent runtime + system prompts
│   │   │   └── permissions.ts       # Agent permission enforcement
│   │   ├── tool/
│   │   │   ├── registry.ts          # Tool registration + filtering
│   │   │   ├── shell.ts             # Shell command execution
│   │   │   ├── read.ts              # File reading
│   │   │   ├── write.ts             # File writing
│   │   │   ├── edit.ts              # File editing (diff-based)
│   │   │   ├── grep.ts              # Text search
│   │   │   ├── glob.ts              # File glob matching
│   │   │   ├── webfetch.ts          # HTTP fetching
│   │   │   └── mcp-tool.ts          # MCP tool wrapper
│   │   ├── session/
│   │   │   ├── session.ts           # Session lifecycle
│   │   │   ├── processor.ts         # Message processing pipeline
│   │   │   ├── llm.ts               # LLM inference orchestration
│   │   │   ├── compaction.ts        # Context compaction
│   │   │   └── storage.ts           # Session persistence (JSON files)
│   │   ├── permission/
│   │   │   ├── index.ts             # Permission evaluation engine
│   │   │   └── ruleset.ts           # Ruleset merging + matching
│   │   ├── mcp/
│   │   │   ├── index.ts             # MCP client manager
│   │   │   ├── catalog.ts           # MCP tool catalog
│   │   │   └── transports.ts        # Stdio + HTTP transport factory
│   │   ├── shell/
│   │   │   ├── executor.ts          # Shell command executor
│   │   │   └── vs-code-terminal.ts  # VS Code terminal bridge
│   │   └── util/
│   │       ├── log.ts               # Logging utility
│   │       ├── wildcard.ts          # Glob/wildcard pattern matching
│   │       └── process.ts           # Safe process spawning
│   └── package.json
└── README.md
```

## Key Design Principles

1. **Separation of concerns**: Extension host handles VS Code integration; backend handles AI logic
2. **Type safety**: All messages between extension and webview, and between extension and backend, are fully typed
3. **Modularity**: Each feature (providers, agents, tools, MCP) is a self-contained module
4. **No code copying**: Architecture is inspired by Kilo Code patterns but implemented from scratch
5. **Single provider focus**: The config and provider system is simplified for a single local provider
