# Browser Automation

Browser automation enables the AI agent to interact with web pages — navigate, click, fill forms, take screenshots, and extract data.

## Architecture

Browser automation is implemented as an MCP (Model Context Protocol) server. When enabled, the extension registers a Playwright-based MCP server with the backend, which exposes browser tools to the agent.

```
┌──────────────────────────────────────────────────┐
│  Agent (LLM)                                     │
│  Calls: browser_navigate, browser_click, etc.    │
└────────────────────┬─────────────────────────────┘
                     │ MCP Tool Call
                     ▼
┌──────────────────────────────────────────────────┐
│  Backend (your-ext serve)                        │
│  Forwards to Playwright MCP Server               │
└────────────────────┬─────────────────────────────┘
                     │ Stdio / HTTP
                     ▼
┌──────────────────────────────────────────────────┐
│  Playwright MCP Server                           │
│  Controls Chrome/Chromium via Playwright         │
│  - Navigate to URLs                              │
│  - Click elements                                │
│  - Type text                                     │
│  - Take screenshots                              │
│  - Execute JavaScript                            │
│  - Handle dialogs                                │
│  - Manage tabs                                   │
└──────────────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────┐
│  Chrome / Chromium Browser                       │
│  Visible window (unless headless)                │
└──────────────────────────────────────────────────┘
```

## Configuration

```jsonc
{
  "browserAutomation": {
    "enabled": true,
    "useSystemChrome": true,       // Use installed Chrome/Edge vs bundled Chromium
    "headless": false,             // Show browser window (false) or hidden (true)
    "chromePath": "",              // Custom Chrome executable path (empty = auto-detect)
    "viewport": {                  // Default viewport size
      "width": 1280,
      "height": 720
    },
    "timeout": 30000,              // Default navigation timeout (ms)
    "waitForNetworkIdle": true     // Wait for network to be idle after navigation
  }
}
```

## Available Browser Tools

When the Playwright MCP server is connected, the following tools are available:

### `browser_navigate`

Navigate to a URL.

```json
{
  "id": "mcp_playwright_browser_navigate",
  "description": "Navigate to a URL.",
  "parameters": {
    "type": "object",
    "properties": {
      "url": { "type": "string", "description": "URL to navigate to" },
      "waitUntil": { 
        "type": "string", 
        "enum": ["load", "domcontentloaded", "networkidle"],
        "description": "When to consider navigation successful"
      }
    },
    "required": ["url"]
  }
}
```

### `browser_click`

Click an element on the page.

```json
{
  "id": "mcp_playwright_browser_click",
  "description": "Click an element identified by selector.",
  "parameters": {
    "type": "object",
    "properties": {
      "selector": { "type": "string", "description": "CSS selector for the element" },
      "button": { "type": "string", "enum": ["left", "right", "middle"] },
      "doubleClick": { "type": "boolean" }
    },
    "required": ["selector"]
  }
}
```

### `browser_type`

Type text into an input element.

```json
{
  "id": "mcp_playwright_browser_type",
  "description": "Type text into an element.",
  "parameters": {
    "type": "object",
    "properties": {
      "selector": { "type": "string", "description": "CSS selector" },
      "text": { "type": "string", "description": "Text to type" },
      "submit": { "type": "boolean", "description": "Press Enter after typing" },
      "slowly": { "type": "boolean", "description": "Type one character at a time" }
    },
    "required": ["selector", "text"]
  }
}
```

### `browser_screenshot`

Take a screenshot of the page.

```json
{
  "id": "mcp_playwright_browser_screenshot",
  "description": "Take a screenshot of the current page.",
  "parameters": {
    "type": "object",
    "properties": {
      "fullPage": { "type": "boolean", "description": "Capture full scrollable page" },
      "path": { "type": "string", "description": "File path to save screenshot" }
    }
  }
}
```

### `browser_get_content`

Get the page content (HTML or text).

```json
{
  "id": "mcp_playwright_browser_get_content",
  "description": "Get the text or HTML content of the page.",
  "parameters": {
    "type": "object",
    "properties": {
      "type": { "type": "string", "enum": ["text", "html"], "default": "text" }
    }
  }
}
```

### `browser_evaluate`

Execute JavaScript in the page context.

```json
{
  "id": "mcp_playwright_browser_evaluate",
  "description": "Execute JavaScript in the browser.",
  "parameters": {
    "type": "object",
    "properties": {
      "expression": { "type": "string", "description": "JavaScript expression to evaluate" }
    },
    "required": ["expression"]
  }
}
```

### `browser_select_option`

Select an option in a dropdown.

```json
{
  "id": "mcp_playwright_browser_select_option",
  "description": "Select an option in a dropdown.",
  "parameters": {
    "type": "object",
    "properties": {
      "selector": { "type": "string" },
      "values": { "type": "array", "items": { "type": "string" } }
    },
    "required": ["selector", "values"]
  }
}
```

### `browser_handle_dialog`

Handle browser dialogs (alert, confirm, prompt).

```json
{
  "id": "mcp_playwright_browser_handle_dialog",
  "description": "Handle a browser dialog.",
  "parameters": {
    "type": "object",
    "properties": {
      "accept": { "type": "boolean", "description": "Accept or dismiss the dialog" },
      "promptText": { "type": "string", "description": "Text for prompt dialogs" }
    },
    "required": ["accept"]
  }
}
```

### `browser_press_key`

Press a keyboard key.

```json
{
  "id": "mcp_playwright_browser_press_key",
  "description": "Press a key.",
  "parameters": {
    "type": "object",
    "properties": {
      "key": { "type": "string", "description": "Key name (e.g., 'Enter', 'ArrowLeft', 'a')" }
    },
    "required": ["key"]
  }
}
```

### `browser_hover`

Hover over an element.

```json
{
  "id": "mcp_playwright_browser_hover",
  "description": "Hover over an element.",
  "parameters": {
    "type": "object",
    "properties": {
      "selector": { "type": "string", "description": "CSS selector" }
    },
    "required": ["selector"]
  }
}
```

## Browser Fetching (Web Content Extraction)

Beyond interactive automation, the agent can fetch and read web page content:

### `browser_get_content` (Text Mode)

Extracts visible text content from a page — useful for reading documentation, articles, or API responses rendered as HTML.

### `browser_get_content` (HTML Mode)

Returns the full HTML — useful for parsing structured data or understanding page structure.

### Use Cases

1. **Documentation Research**: Navigate to docs site → screenshot → read content
2. **Form Filling**: Navigate → type fields → submit → verify
3. **Web Testing**: Navigate to app → interact → screenshot → report
4. **Data Extraction**: Navigate → evaluate JS → extract data
5. **Login flows**: Navigate → type credentials → click submit → handle 2FA

## Security Considerations

### Isolation

- The browser runs in a separate process from the extension and backend
- Each session gets its own browser context (cookies, storage isolated)
- Browser processes are terminated when the session ends

### Visibility

- By default, the browser window is visible (non-headless)
- User can watch the agent interact with the browser in real-time
- Headless mode hides the browser window but logging still shows actions

### Network

- The browser uses the system's network configuration
- Proxy settings from VS Code are respected
- SSL certificates are validated using the OS trust store

## Permission Model

Browser automation tools require explicit permission:

```jsonc
{
  "permission": {
    "mcp_playwright": "ask"   // All Playwright MCP tools
  }
}
```

This can be set to "allow" for trusted workflows:

```jsonc
{
  "permission": {
    "mcp_playwright": "allow"
  }
}
```

## MCP Server Lifecycle

```
1. User enables browserAutomation in settings
        │
        ▼
2. Extension notifies backend of config change
        │
        ▼
3. Backend adds Playwright MCP server to config
        │
        ▼
4. On next tool resolution, backend spawns Playwright MCP process
   - Command: npx -y @playwright/mcp@latest
   - Transport: stdio
        │
        ▼
5. MCP server initializes, lists available tools
        │
        ▼
6. Tools are registered in the tool registry
        │
        ▼
7. Agent can now call browser tools
        │
        ▼
8. When session ends or browserAutomation disabled:
   - MCP process is terminated
   - Browser instance is closed
```

## Troubleshooting

| Issue | Solution |
|---|---|
| Chrome not found | Install Chrome/Edge or set `chromePath` in config |
| Browser won't start | Check if another Chrome instance is running |
| Navigation timeout | Increase `timeout` in config |
| Elements not found | Use `browser_get_content` to inspect page structure |
| Login required | Use `browser_type` to fill credentials first |
| CAPTCHA | Not solvable automatically; user must handle |
