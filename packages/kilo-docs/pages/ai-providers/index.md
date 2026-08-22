---
title: "AI Providers"
description: "Configure and connect different AI model providers to Kilo Code"
---

# AI Providers

Kilo Code supports a wide variety of AI providers, giving you flexibility in how you power your AI-assisted development workflow. Choose from cloud providers, local models, or AI gateways based on your needs.

## Getting Started

The fastest way to get started is with **Kilo Code's built-in provider**, which requires no configuration. Simply sign in and start coding.

For users who want to use their own API keys or need specific models, we support over 30 providers.

## Provider Categories

### Cloud Providers

Third-party cloud providers offering powerful models via API:

- **[Alibaba Cloud](/docs/ai-providers/alibaba)** - DashScope and Qwen models through Model Studio
- **[Cloudflare](/docs/ai-providers/cloudflare)** - Workers AI and Cloudflare AI Gateway
- **[Groq](/docs/ai-providers/groq)** - Fast inference hardware
- **[Cerebras](/docs/ai-providers/cerebras)** - Wafer-scale AI inference
- **[Fireworks AI](/docs/ai-providers/fireworks)** - Open-source model hosting
- **[Mixlayer](/docs/ai-providers/mixlayer)** - AI inference platform

### Local & Self-Hosted

Run models on your own hardware for privacy and offline use:

- **[Atomic Chat](/docs/ai-providers/atomic-chat)** - Local models with TurboQuant inference and auto-discovery in Kilo Code
- **[Anaconda Desktop](/docs/ai-providers/anaconda-desktop)** - Discover and connect to a local text-generation model server
- **[Ollama](/docs/ai-providers/ollama)** - Easy local model management
- **[LM Studio](/docs/ai-providers/lmstudio)** - Desktop app for local models

### AI Gateways

Route requests through unified APIs with additional features:

- **[Requesty](/docs/ai-providers/requesty)** - Smart routing and fallbacks
- **[DaoXE](/docs/ai-providers/daoxe)** - Connect multiple model families through one API
- **[Unbound](/docs/ai-providers/unbound)** - AI gateway
- **[ZenMux](/docs/ai-providers/zenmux)** - AI gateway
- **[Vercel AI Gateway](/docs/ai-providers/vercel-ai-gateway)** - Vercel's AI routing layer
- **[Cloudflare AI Gateway](/docs/ai-providers/cloudflare)** - Route providers through your Cloudflare account

## Choosing a Provider

| Priority | Recommended Provider |
|---|---|
| Ease of use | [Kilo Code (built-in)](/docs/ai-providers/kilocode) |
| Best value | Third-party cloud providers |
| Privacy/Offline | Ollama or LM Studio |
| Enterprise | Cloud provider of choice |

## Why Use Multiple Providers?

- **Cost** - Compare pricing across providers for different tasks
- **Reliability** - Backup options when a provider has outages
- **Models** - Access exclusive or specialized models
- **Regional** - Better latency in certain locations

## Disabling Providers

You can prevent specific providers from loading using `disabled_providers` in your `kilo.json` (or `kilo.jsonc`). This is useful to hide providers that you don't intend to use.

```json
{
  "$schema": "https://app.kilo.ai/config.json",
  "disabled_providers": ["kilo", "openai"]
}
```

To allow only specific providers and disable everything else, use `enabled_providers` instead:

```json
{
  "$schema": "https://app.kilo.ai/config.json",
  "enabled_providers": ["groq"]
}
```

Both fields accept provider IDs — the lowercase identifier used in the `provider/model` format (e.g. `kilo`, `groq`, `ollama`).

## Next Steps

- **New to Kilo Code?** Start with the [Kilo Code provider](/docs/ai-providers/kilocode) - no setup required
- **Have an API key?** Jump to your provider's page for configuration instructions
- **Want to compare?** Check out [Model Selection](/docs/code-with-ai/agents/model-selection) for guidance on choosing models
