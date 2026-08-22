# Plan: Remove Built-in Providers — Custom-Only Self-Hosted

## Goals

- Remove all 32+ built-in AI providers (Anthropic, OpenAI, Google, Azure, etc.)
- Only allow user-configured custom providers via `kilo.json`
- Custom providers support **OpenAI-compatible APIs only** (universal for self-hosted LLM servers)
- No default model — chat is unusable until a provider is configured
- Strip all provider catalog UI (icons, picker, popularity ranking)
- Disable auto-starting watch processes in VS Code

## Approach

- Mark all changes to shared upstream files with `kilocode_change` markers
- Place any Kilo-specific new code in `packages/opencode/src/kilocode/`
- Minimize changes to shared code to keep upstream merges clean

---

## Phase 1: VS Code Tasks — Disable Auto-Start Watch Processes

**Files:** `.vscode/tasks.json`

- [ ] Remove `"runOptions": { "runOn": "folderOpen" }` from the `VSCode - Watch` task
- [ ] Optionally remove the `VSCode - Watch` composite task entirely (or keep as manual task)

---

## Phase 2: Core Provider Loading — Remove Bundled SDKs and Catalog

**Files:** `packages/opencode/src/provider/provider.ts`

- [ ] Remove `BUNDLED_PROVIDERS` map (25+ AI SDK package imports)
- [ ] Remove `custom()` function that creates loaders for built-in providers
- [ ] Remove `fromModelsDevProvider()` / `fromModelsDevModel()` — catalog fetching from models.dev
- [ ] Remove `fetchKiloModels()` — Kilo Gateway model catalog fetching
- [ ] Keep only the custom provider loading path (from user config)
- [ ] Mark all removed/shared code with `kilocode_change` markers

**Files:** `packages/opencode/src/provider/model-cache.ts`

- [ ] Remove or stub out `ModelCache.Service` — no more catalog caching (5-min TTL, models.dev data)
- [ ] Remove `fetchKiloModels` / `fetchApertisModels` calls

**Files:** `packages/opencode/src/provider/models.ts`

- [ ] Remove `ModelsDev.Service.get()` calls
- [ ] Remove catalog data fetching logic

**Files:** `packages/opencode/src/kilocode/provider/provider.ts`

- [ ] Remove `KILO_BUNDLED_PROVIDERS` map
- [ ] Remove `KILO_MODEL_SCHEMA_EXTENSIONS`
- [ ] Remove `kiloCustomLoaders()` function
- [ ] Remove `customProviderVariants`
- [ ] Remove `patchCustomLoaderResult()`
- [ ] Remove `wrapFirstByte()`
- [ ] Mark all with `kilocode_change`

**Files:** `packages/opencode/src/kilocode/provider/metadata.ts`

- [ ] Remove provider metadata (icons, notes, priority ordering for built-in providers)
- [ ] Mark with `kilocode_change`

**Files:** `packages/opencode/src/kilocode/provider/model-filter.ts`

- [ ] Remove model filter that filters out models training on user prompts (no built-in models anymore)
- [ ] Mark with `kilocode_change`

**Files:** `packages/opencode/src/kilocode/provider/models-refresh.ts`

- [ ] Remove model refresh logic (no catalog to refresh)
- [ ] Mark with `kilocode_change`

**Files:** `packages/opencode/src/kilocode/provider/codex-refresh.ts`

- [ ] Remove Codex model refresh logic
- [ ] Mark with `kilocode_change`

**Files:** `packages/opencode/src/kilocode/provider/reasoning-summary.ts`

- [ ] Remove reasoning summary configuration (no built-in models)
- [ ] Mark with `kilocode_change`

---

## Phase 3: Plugin Registry — Remove Built-in Provider Plugins

**Files:** `packages/core/src/plugin/provider.ts`

- [ ] Remove registration of all 32 provider plugins (Alibaba, AmazonBedrock, Anthropic, Azure, etc.)
- [ ] Mark with `kilocode_change`

---

## Phase 4: Vercel AI SDK Provider Facades — Remove or Stub

**Files:** `packages/llm/src/providers/` (all files)

- [ ] Remove or stub all native LLM provider facades: Anthropic, AmazonBedrock, Azure, Cloudflare, GitHubCopilot, Google, OpenAI, OpenRouter, XAI, OpenAICompatible
- [ ] Keep only `openai-options.ts` (still needed for OpenAI-compatible custom providers)
- [ ] Mark with `kilocode_change`

---

## Phase 5: Kilo Gateway — Remove Sub-Provider Routing

**Files:** `packages/kilo-gateway/src/provider.ts`

- [ ] Remove `createKilo()` composite provider (wrapping OpenRouter, Alibaba, Anthropic, OpenAI, Mistral, OpenAICompatible)
- [ ] The gateway no longer needs to route to sub-providers since there are none

**Files:** `packages/kilo-gateway/src/provider-debug.ts`

- [ ] Remove debug version of Kilo provider

**Files:** `packages/kilo-gateway/src/gateway-metadata.ts`

- [ ] Remove gateway metadata extraction (no more routing metadata)

**Files:** `packages/kilo-gateway/src/loader.ts`

- [ ] Remove custom loader for kilo provider (no kilo provider anymore)

**Files:** `packages/kilo-gateway/src/types.ts`

- [ ] Remove `KiloProvider` composite type, `KiloProviderOptions`, `ProviderInfo`, `CustomLoaderResult`
- [ ] Keep only types needed for OpenAI-compatible API connections

**Files:** `packages/kilo-gateway/src/api/` (all files)

- [ ] Remove API clients for profile, balance, models, kilo-pass, notifications, modes, embedding models, URL resolution, KiloClaw
- [ ] These are all Kilo cloud services, not needed for self-hosted

**Files:** `packages/kilo-gateway/src/auth/` (all files)

- [ ] Remove device auth, token management, polling, legacy migration
- [ ] These are Kilo cloud auth, not needed for self-hosted

**Files:** `packages/kilo-gateway/src/server/` (all files)

- [ ] Remove HTTP routes for profile, organization, modes, FIM, edit, audio, models, notifications, cloud sessions, KiloClaw
- [ ] Keep only the bare minimum if any server functionality is needed

**Files:** `packages/kilo-gateway/src/index.ts`

- [ ] Update exports to match stripped-down gateway

---

## Phase 6: Config Schema — Simplify for Custom Providers Only

**Files:** `packages/core/src/v1/config/config.ts`

- [ ] Keep the `provider` field in `ConfigV1.Info` (users still configure custom providers here)
- [ ] Remove any auto-discovery or catalog-related config fields
- [ ] Mark with `kilocode_change`

**Files:** `packages/core/src/v1/config/provider.ts`

- [ ] Simplify `ConfigProviderV1.Info` to support only OpenAI-compatible provider configs:
  - `name` — provider name
  - `api` — API base URL
  - `env` — environment variable names for API key
  - `models` — model definitions
- [ ] Remove fields not relevant to OpenAI-compatible providers (e.g., `npm` for SDK packages)
- [ ] Mark with `kilocode_change`

**Files:** `packages/core/src/config/provider.ts` (V2 config)

- [ ] Simplify `ConfigV2.Provider.Info` for OpenAI-compatible only
- [ ] Remove `api.npm` field (no SDK packages to import)
- [ ] Mark with `kilocode_change`

**Files:** `packages/core/src/v1/config/provider-options.ts`

- [ ] Remove "lowerers" that translate provider-specific options into HTTP headers/URL/body for AI SDK packages
- - Keep only OpenAI-compatible option handling
- [ ] Mark with `kilocode_change`

---

## Phase 7: Auth System — Remove Built-in Provider Auth

**Files:** `packages/opencode/src/provider/auth.ts`

- [ ] Remove OAuth flows for built-in providers
- [ ] Keep API key auth for custom providers
- [ ] Remove plugin-based auth hooks for built-in providers
- [ ] Mark with `kilocode_change`

**Files:** `packages/opencode/src/kilocode/provider/cloud-auth.ts`

- [ ] Remove AWS Bedrock and Google Vertex auth helpers (no built-in cloud providers)
- [ ] Mark with `kilocode_change`

**Files:** `packages/opencode/src/kilocode/server/provider-auth-lifecycle.ts`

- [ ] Remove auth lifecycle side effects for built-in providers
- [ ] Mark with `kilocode_change`

**Files:** `packages/opencode/src/cli/cmd/providers.ts`

- [ ] Remove catalog fetching and provider sorting by priority
- - Keep only custom provider auth (API key)
- [ ] Mark with `kilocode_change`

---

## Phase 8: Server/HTTP API — Remove Catalog Endpoints

**Files:** `packages/opencode/src/server/routes/instance/httpapi/handlers/provider.ts`

- [ ] `GET /provider` — return only user-configured custom providers (no catalog data)
- [ ] `POST /provider/:providerID/authorize` — remove OAuth callback handlers
- [ ] `POST /provider/:providerID/callback` — remove OAuth callback handlers
- [ ] Mark with `kilocode_change`

**Files:** `packages/opencode/src/server/routes/instance/httpapi/handlers/config.ts`

- [ ] `GET /config/providers` — return only custom providers
- [ ] Mark with `kilocode_change`

---

## Phase 9: VS Code Extension — Strip Provider UI

**Files:** `packages/kilo-vscode/webview-ui/src/context/provider.tsx`

- [ ] Remove provider catalog loading and management
- [ ] Keep only custom provider state management
- [ ] Remove default model selection (no defaults)

**Files:** `packages/kilo-vscode/webview-ui/src/context/provider-utils.ts`

- [ ] Remove `flattenModels()` if it depends on catalog data
- [ ] Keep `findModel()` and `isModelValid()` for custom provider models

**Files:** `packages/kilo-vscode/webview-ui/src/context/provider-shell.tsx`

- [ ] Remove provider shell context if it depends on built-in providers

**Files:** `packages/kilo-vscode/webview-ui/src/components/settings/provider-catalog.ts`

- [ ] Remove entire file — no more provider catalog UI (icon resolution, popularity ranking, sorting, fallback provider creation)

**Files:** `packages/kilo-vscode/webview-ui/src/components/settings/provider-visibility.ts`

- [ ] Remove provider visibility filtering for built-in providers
- [ ] Keep custom provider visibility toggle

**Files:** `packages/kilo-vscode/webview-ui/src/utils/local-providers.ts`

- [ ] Remove local provider constants (`lmstudio`, `atomic-chat`)

**Files:** `packages/kilo-vscode/webview-ui/src/utils/provider-action.ts`

- [ ] Remove provider action utilities that depend on built-in providers

**Files:** `packages/kilo-vscode/webview-ui/src/types/messages/providers.ts`

- [ ] Remove message types for catalog loading, provider discovery, etc.

**Files:** `packages/kilo-vscode/src/shared/provider-model.ts`

- [ ] Remove `KILO_PROVIDER_ID`, `KILO_AUTO`, `CUSTOM_PROVIDER_PACKAGES`, `PROVIDER_PRIORITY` constants
- [ ] Keep only custom provider constants

**Files:** `packages/kilo-vscode/src/shared/custom-provider.ts`

- [ ] Simplify custom provider schema to OpenAI-compatible only (remove npm package field, SDK-specific fields)

**Files:** `packages/kilo-vscode/src/kilo-provider-utils.ts`

- [ ] Remove provider info types and message mapping for built-in providers
- [ ] Keep utilities for custom provider messages

**Files:** `packages/kilo-vscode/src/provider-actions.ts`

- [ ] Remove provider action handlers for built-in providers
- [ ] Keep custom provider actions

**Files:** `packages/kilo-vscode/src/agent-manager/provider-multi-version.ts`

- [ ] Remove multi-version provider support if tied to built-in providers

**Files:** `packages/kilo-vscode/src/agent-manager/provider-lifecycle.ts`

- [ ] Simplify provider lifecycle for custom-only providers

**Files:** `packages/kilo-vscode/src/legacy-migration/provider-mapping.ts`

- [ ] Remove legacy provider migration mapping

---

## Phase 10: TUI Console — Simplify Provider Management

**Files:** `packages/kilo-console/src/routes/config/state/providers.ts`

- [ ] Remove built-in provider CRUD from TUI
- [ ] Keep custom provider add/edit/remove with OpenAI-compatible config
- [ ] Remove OAuth auth flows from TUI
- [ ] Keep API key auth flow

---

## Phase 11: UI Assets — Remove Provider Icons

**Files:** `packages/ui/src/assets/icons/provider/` (all SVG files)

- [ ] Remove all 100+ provider icon SVGs
- [ ] Keep or remove `provider-icon.tsx` component (remove if no longer needed)

---

## Phase 12: Documentation — Update References

**Files:** `packages/kilo-docs/lib/nav/ai-providers.ts`

- [ ] Remove navigation entries for all built-in providers
- [ ] Keep only custom provider documentation

---

## Phase 13: Verification

- [ ] Run `bun run typecheck` from root
- [ ] Run `bun run lint` from root
- [ ] Run `bun run typecheck` from `packages/opencode/`
- [ ] Run `bun test` from `packages/opencode/`
- [ ] Run `bun run typecheck` from `packages/kilo-vscode/`
- [ ] Run `bun run lint` from `packages/kilo-vscode/`
- [ ] Run `bun run knip` from `packages/kilo-vscode/`
- [ ] Run `bun run check-kilocode-change` from `packages/kilo-vscode/`
- [ ] Run `bun run script/check-opencode-annotations.ts --worktree` from root
- [ ] Verify VS Code no longer auto-starts watch processes on folder open
- [ ] Verify custom provider can be added and used with OpenAI-compatible API
