# Autocomplete System

Inline code autocomplete provides real-time code suggestions as the user types, powered by the configured AI provider.

## Overview

Autocomplete analyzes the current file context and sends it to the AI provider for completion predictions. Suggestions appear as ghost text in the editor.

## Architecture

```
User types in editor
        │
        ▼
VS Code detects text change
        │
        ▼
Extension sends context to backend
   (current file, cursor position, surrounding code)
        │
        ▼
Backend calls provider's completion endpoint
   (FIM — Fill In the Middle — model)
        │
        ▼
Backend streams completion back to extension
        │
        ▼
Extension renders ghost text in editor
        │
        ▼
User accepts (Tab) or dismisses (Esc/Type more)
```

## Configuration

```jsonc
{
  "autocomplete": {
    "enabled": true,
    "model": "codestral:latest",        // Model for completions
    "triggerCharacters": [".", "(", " ", "\n", ">", "/"],
    "maxItems": 3,                      // Max concurrent completions
    "debounceMs": 150,                  // Delay before sending request
    "maxLength": 5000                   // Max context length sent
  }
}
```

## Completion Models

Autocomplete typically uses a different model than chat — one optimized for Fill-In-the-Middle (FIM) completion:

| Model Type | Purpose | Example |
|---|---|---|
| FIM (Fill in Middle) | Code completion | CodeLlama-FIM, StarCoder2-FIM |
| FIM (via chat API) | Completion via chat endpoint | Any model with system prompt |

If the configured provider doesn't have a dedicated FIM model, the extension can use the chat model with a FIM-style prompt:

```
<fim_prefix>
{code_before_cursor}
<fim_suffix>
{code_after_cursor}
<fim_middle>
```

## VS Code Integration

### CompletionItemProvider

The extension registers as a VS Code `CompletionItemProvider`:

```typescript
class YourExtCompletionProvider implements vscode.CompletionItemProvider {
  async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): Promise<vscode.CompletionItem[]> {
    // 1. Get document context
    const context = await this.getCompletionContext(document, position)
    
    // 2. Send to backend
    const completions = await this.connectionService.fetchCompletions(context)
    
    // 3. Convert to VS Code CompletionItems
    return completions.map(c => this.toCompletionItem(c))
  }
}
```

### Ghost Text Rendering

VS Code renders completion suggestions as ghost text (inline gray text) automatically when `CompletionItem.insertText` is set:

```typescript
const item = new vscode.CompletionItem("suggestion", vscode.CompletionItemKind.Text)
item.insertText = "function myFunc() {\n  // ...\n}"
item.range = new vscode.Range(position, position)  // Insert at cursor
item.detail = "your-ext"
item.sortText = "0"  // Show first
```

### Accept / Dismiss

| Key | Action |
|---|---|
| `Tab` | Accept the completion |
| `Enter` | Accept (if completion is on its own line) |
| `Escape` | Dismiss the completion |
| Any other key | Dismiss and continue typing |

## Context Building

The extension sends relevant context to the backend for completion:

```typescript
interface CompletionContext {
  // Current file
  filePath: string
  languageId: string
  content: string           // Full file content
  cursorPosition: { line, character }
  
  // Surrounding code (window around cursor)
  prefix: string            // Code before cursor
  suffix: string            // Code after cursor
  
  // Open files (for cross-file context)
  openFiles: Array<{
    filePath: string
    content: string
    languageId: string
  }>
  
  // Git diff (optional, for aware completions)
  gitDiff?: string
}
```

### Context Window Management

To stay within token limits:
1. Take N lines before and after cursor
2. Include full content of currently open small files (< 200 lines)
3. Include file path and language for semantic context
4. Truncate if total exceeds `maxLength`

## Performance Considerations

### Debouncing

Requests are debounced to avoid flooding the provider:

```typescript
let debounceTimer: ReturnType<typeof setTimeout>
const DEBOUNCE_MS = 150

function onTextChanged() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    sendCompletionRequest()
  }, DEBOUNCE_MS)
}
```

### Cancellation

When the user types while a completion is pending, the previous request is cancelled:

```typescript
const controller = new AbortController()

async function sendCompletionRequest() {
  controller.abort()  // Cancel previous request
  const newController = new AbortController()
  controller = newController
  
  const result = await fetch("/v2/autocomplete", {
    signal: controller.signal,
    // ...
  })
}
```

### Rate Limiting

The extension limits concurrent completion requests:

```typescript
const MAX_CONCURRENT = 3
let activeRequests = 0

async function requestCompletion() {
  if (activeRequests >= MAX_CONCURRENT) return
  activeRequests++
  try {
    return await fetchCompletion()
  } finally {
    activeRequests--
  }
}
```

## Privacy Considerations

### What is Sent

- Current file content (full text)
- Cursor position
- Open file paths and content (if small)
- Language ID

### What is NOT Sent

- File names (only paths for context, not displayed to LLM)
- Workspace files not currently open
- Credentials or secrets (unless in the current file)
- Other users' data

### Local Processing

If using a local provider (Ollama, etc.), all completion data stays on the user's machine. No data is sent to external servers.

## Disabling Autocomplete

Users can disable autocomplete entirely:

```jsonc
{
  "autocomplete": {
    "enabled": false
  }
}
```

Or exclude specific file patterns:

```jsonc
{
  "autocomplete": {
    "enabled": true,
    "excludePatterns": [
      "*.min.js",
      "*.css",
      "**/node_modules/**",
      "**/.git/**"
    ]
  }
}
```

## Troubleshooting

| Issue | Solution |
|---|---|
| No suggestions appear | Check `autocomplete.enabled` is true |
| Suggestions are slow | Increase `debounceMs` or use a faster model |
| Suggestions are wrong | Try a different completion model |
| Suggestions don't update | Check provider connectivity |
| Ghost text not visible | Check VS Code `editor.inlineSuggest.enabled` |
