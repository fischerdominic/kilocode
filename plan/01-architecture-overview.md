# Architecture Overview

## System Design Philosophy

This extension follows a **two-process architecture**: a VS Code extension host (Node.js) acts as a thin client, and a standalone backend engine (the "CLI") runs as a child process providing the full AI agent runtime. The two communicate over HTTP + SSE using a typed SDK.

```
┌─────────────────────────────────────────────────────────────────┐
│                     VS Code Host Process                        │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Extension Entry (extension.ts)                           │  │
│  │  ├── Connection Service (manages backend lifecycle)        │  │
│  │  ├── Webview Providers (sidebar, tab panels, settings)     │  │
│  │  ├── Autocomplete Service                                 │  │
│  │  ├── Browser Automation Service                           │  │
│  │  ├── Attention/Notification Service                       │  │
│  │  ├── Code Actions (editor + terminal context menus)        │  │
│  │  └── Commit Message Generation                            │  │
│  └──────────────────────────┬────────────────────────────────┘  │
│                             │ VS Code postMessage API           │
│  ┌──────────────────────────┴────────────────────────────────┐  │
│  │  Webview (SolidJS UI)                                     │  │
│  │  ├── Chat View (sidebar + tab panels)                     │  │
│  │  ├── Settings Panel                                       │  │
│  │  ├── Permission Dock (approve/deny UI)                    │  │
│  │  ├── Question Dock (interactive prompts)                  │  │
│  │  └── Session History Browser                              │  │
│  └───────────────────────────────────────────────────────────┘  │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTP REST + SSE (localhost)
                               │ Port: dynamically assigned (random)
                               │ Auth: random password via env var
┌──────────────────────────────┴──────────────────────────────────┐
│                    Backend Engine (CLI Process)                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Hono HTTP Server + SSE Event Stream                      │  │
│  │  ├── Config System (kilo.jsonc, opencode.jsonc)            │  │
│  │  ├── Provider System (AI model connections)                │  │
│  │  ├── Agent System (defined behaviors + permissions)        │  │
│  │  ├── Tool Registry (built-in + MCP + plugin tools)         │  │
│  │  ├── Permission Engine (allow/ask/deny ruleset)            │  │
│  │  ├── Session Manager (create, run, persist)                │  │
│  │  ├── MCP Client Manager (stdio + HTTP transports)          │  │
│  │  ├── Shell Executor (VS Code terminal integration)         │  │
│  │  ├── Browser Automation (Playwright)                       │  │
│  │  └── Vercel AI SDK (model inference abstraction)           │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Core Design Decisions

### Why Two Processes?

1. **Isolation**: The AI agent runs in a separate process. If it crashes or hangs, the VS Code extension remains responsive.
2. **Long-running sessions**: Agent sessions can run for minutes or hours. A child process survives extension reloads.
3. **Resource management**: The backend can manage its own memory, file handles, and subprocesses independently.
4. **Reusability**: The same backend can be consumed by multiple clients (VS Code, JetBrains, CLI TUI).

### Communication Protocol

- **HTTP REST**: For request/response calls (create session, list sessions, fetch config, etc.)
- **SSE (Server-Sent Events)**: For real-time streaming (message chunks, permission requests, session status updates)
- **Typed SDK**: Auto-generated TypeScript client from OpenAPI spec ensures type safety on both sides

### UI Framework Choice

- **SolidJS** for the webview UI: Lightweight (smaller bundle than React), fine-grained reactivity, excellent performance for chat-heavy interfaces
- **@kobalte/core** for accessible primitives: Headless UI components with VS Code theme integration
- **@xterm/xterm** for terminal emulation: Industry-standard terminal component for embedded shells

## Simplified Scope (vs Kilo Code)

| Feature | Kilo Code | Your Extension |
|---|---|---|
| Provider support | 500+ models, multi-provider | Single local provider |
| Agent system | Multiple built-in + custom agents | Custom agents with permissions |
| MCP support | Full MCP client (stdio + HTTP) | MCP tools (stdio + HTTP) |
| Agent Manager | Multi-session worktree orchestration | Not needed (single session focus) |
| Cloud sync | Kilo Gateway, remote sessions | Not needed |
| Autocomplete | Inline code completion | Optional: provider model completion |
| Browser automation | Playwright-based | Playwright-based |
| Marketplace | Extension marketplace | Not needed |
| Telemetry | Removed — no analytics or tracing | Not needed |
| i18n | 20+ languages | Not needed |
| Memory/RAG | Project memory indexing | Not needed initially |
| Code review | Diff viewer, PR integration | Not needed initially |
| Worktrees | Git worktree isolation | Not needed |
| Speech-to-text | Audio input support | Not needed |
| Image generation | DALL-E integration | Not needed |
