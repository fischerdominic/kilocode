# Provider System

The provider system manages the connection to a single AI model provider. Unlike Kilo Code which supports 500+ providers, this extension is designed for a single local or remote provider.

## Provider Configuration

### Settings UI

The provider settings panel provides a simple form:

```
┌─────────────────────────────────────────┐
│  AI Provider Configuration              │
├─────────────────────────────────────────┤
│                                         │
│  Provider Name:  [My Local Ollama __]   │
│  Base URL:       [http://localhost:11434]│
│  API Key:        [••••••••••••••••]     │
│  Model:          [llama3.1:8b ▼]        │
│                                         │
│  [Test Connection]  [Save]              │
│                                         │
│  Status: ✓ Connected                    │
│  Context Window: 128,000 tokens         │
│  Available Models: 3                    │
│                                         │
└─────────────────────────────────────────┘
```

### Configuration Schema

```jsonc
{
  "provider": {
    "id": "local",
    "name": "My Local Ollama",
    "type": "openai-compatible",    // "openai-compatible" | "custom"
    "base_url": "http://localhost:11434/v1",
    "api_key": "",                   // Empty for local, required for remote
    "default_model": "llama3.1:8b",
    "models": {
      "llama3.1:8b": {
        "contextLength": 128000,
        "maxOutput": 8192,
        "supportsVision": false,
        "supportsTools": true
      },
      "codestral:latest": {
        "contextLength": 32000,
        "maxOutput": 4096,
        "supportsVision": false,
        "supportsTools": true
      }
    },
    // Optional: timeout for API calls (ms)
    "timeout": 120000,
    // Optional: custom headers
    "headers": {}
  }
}
```

## Provider Types

### OpenAI-Compatible Provider

Most local and remote LLM servers expose an OpenAI-compatible API. This includes:

| Server | Base URL | Notes |
|---|---|---|
| Ollama | `http://localhost:11434/v1` | Most popular local option |
| vLLM | `http://localhost:8000/v1` | High-performance serving |
| LM Studio | `http://localhost:1234/v1` | Desktop GUI for local models |
| Text Generation WebUI | `http://localhost:5000/v1` | Auto-detect API path |
| KoboldAI | `http://localhost:5001/v1` | Creative writing focus |
| Custom OpenAI API | `https://api.example.com/v1` | Any OpenAI-compatible endpoint |

**API Compatibility:**
- Chat Completions endpoint (`/v1/chat/completions`)
- Models listing endpoint (`/v1/models`)
- Streaming responses (SSE)
- Tool/function calling

### Provider Connection Flow

```
1. User enters base_url + api_key + model in settings
        │
        ▼
2. Extension sends TEST_CONNECTION to backend
        │
        ▼
3. Backend calls /v1/models on the provider
        │
        ▼
4. If successful → cache model info, update status
   If failed → show error message with troubleshooting
        │
        ▼
5. Save configuration to config file
        │
        ▼
6. All future sessions use this provider
```

### Model Discovery

When a provider is configured, the backend attempts to discover available models:

```typescript
async function discoverModels(baseUrl: string, apiKey: string): Promise<ModelInfo[]> {
  const response = await fetch(`${baseUrl}/models`, {
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {}
  })
  
  if (!response.ok) return []
  
  const data = await response.json()
  return data.data.map((model: any) => ({
    id: model.id,
    name: model.id,
    contextLength: model.context_length ?? 4096,
    maxOutput: model.max_tokens ?? 4096,
  }))
}
```

If discovery fails, the user can manually specify model details in the config.

## Provider State Management

### In the Backend

```typescript
class ProviderService {
  // Current provider configuration
  private config: ProviderConfig
  
  // Cached model information
  private modelCache: Map<string, ModelInfo>
  
  // Connection status
  private status: "disconnected" | "connected" | "error"
  
  // Get the default model
  getDefaultModel(): ModelInfo
  
  // Get a specific model
  getModel(modelID: string): ModelInfo | undefined
  
  // List all available models
  listModels(): ModelInfo[]
  
  // Create a chat completion stream
  streamChat(messages: Message[], options: ChatOptions): AsyncIterable<StreamChunk>
  
  // Validate the connection
  validate(): Promise<boolean>
}
```

### In the Webview

The provider state is exposed via SolidJS context:

```typescript
// context/provider.tsx
export const [ProviderState, setProviderState] = createSignal<ProviderState>({
  config: null,
  models: {},
  defaultModel: null,
  status: "disconnected",
  error: null,
})

// Component usage
function ModelSelector() {
  const state = useProvider()
  return (
    <select value={state.defaultModel?.id}
            onChange={(e) => selectModel(e.target.value)}>
      {Object.values(state.models).map(model => (
        <option value={model.id}>{model.name}</option>
      ))}
    </select>
  )
}
```

## Model Selection in Chat

Each chat session can optionally override the default model:

```
Prompt Rail:
┌──────────┐ ┌──────────────────┐ ┌────┐
│ code ▼   │ │ llama3.1:8b ▼    │ │ 📎 │
└──────────┘ └──────────────────┘ └────┘
   Agent          Model            Attach
```

**Behavior:**
- Model selector shows all models from the configured provider
- Default model is pre-selected
- Per-session model override is stored in the session data
- Changing the model mid-session starts a new logical turn

## Error Handling

### Connection Errors

| Error | User Message | Recovery |
|---|---|---|
| ECONNREFUSED | "Cannot connect to provider at {url}. Is the server running?" | Check server status |
| ETIMEDOUT | "Connection to provider timed out" | Increase timeout in settings |
| 401 Unauthorized | "Invalid API key" | Check API key in settings |
| 404 Not Found | "Model endpoint not found" | Check base URL path |
| 500 Server Error | "Provider server error" | Check provider logs |
| SSL Error | "SSL certificate error" | Check certificate or use HTTP |

### Streaming Errors

| Error | Behavior |
|---|---|
| Network drop during stream | Show "Connection interrupted" banner, attempt reconnect |
| Provider rate limit | Show "Rate limited" with retry-after time |
| Token limit reached | Auto-compact or end session with warning |
| Invalid response format | Show error, allow retry |

## Autocomplete Provider (Optional)

If autocomplete is enabled, a separate completion model can be configured:

```jsonc
{
  "autocomplete": {
    "enabled": true,
    "model": "codestral:latest",
    "provider": "local",
    "triggerCharacters": [".", "(", " ", "\n", ">"]
  }
}
```

The autocomplete uses a different model (typically a smaller FIM — Fill in the Middle — model) optimized for code completion rather than chat.
