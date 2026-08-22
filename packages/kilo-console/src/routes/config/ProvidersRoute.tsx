import { For, Show } from "solid-js"
import { Button } from "@kilocode/kilo-web-ui/button"
import { Card } from "@kilocode/kilo-web-ui/card"
import { IconButton } from "@kilocode/kilo-web-ui/icon-button"
import { StatusTag } from "@kilocode/kilo-web-ui/status-tag"
import { ConfirmDialog } from "../../components/ConfirmDialog"
import { SearchField } from "../../components/SearchField"
import { ConfigCountTag as CountTag, ConfigPage, SourceBadge } from "./ConfigPage"
import { useProviderSettings } from "./state/providers"

export function ProvidersRoute() {
  const state = useProviderSettings()
  const project = () => state.ctx.query()?.scope === "project"

  return (
    <Show when={state.snap()}>
      {(data) => (
        <ConfigPage
          title={
            <span class="config-title-count">
              Providers
              <CountTag>{state.configured().length}</CountTag>
            </span>
          }
          description="Credentials and endpoints for upstream model providers. Each provider exposes one or more models."
          actions={
            <>
              <Button
                icon="plus"
                variant="primary"
                disabled={Boolean(state.ctx.saving()) || project()}
                onClick={state.add}
              >
                Add provider
              </Button>
            </>
          }
        >
          <Show when={project()}>
            <Card class="banner" variant="info">
              Providers are global credentials. Project settings show inherited providers as read-only.
            </Card>
          </Show>

          <SearchField
            label="Filter providers"
            value={state.search()}
            placeholder="Filter by name or ID..."
            onValue={state.setSearch}
          />

          <div class="providers">
            <Show when={state.visible().length} fallback={<p class="empty">No providers match this filter.</p>}>
              <For each={state.visible()}>
                {(provider) => (
                  <article class="provider configured-provider" classList={{ inherited: provider.inherited }}>
                    <div class="provider-title">
                      <span class="provider-icon" />
                      <div>
                        <strong>{provider.name}</strong>
                        <span>{provider.id}</span>
                      </div>
                    </div>
                    <div class="tags">
                      <SourceBadge
                        source={provider.source}
                        inherited={provider.inherited}
                        overridden={provider.overridden}
                      />
                      <span class="provider-model-count">{`${provider.models} ${provider.models === 1 ? "model" : "models"}`}</span>
                      <Show when={data().providers.connected.includes(provider.id)}>
                        <StatusTag status="connected" />
                      </Show>
                      <Show when={data().providers.failed.includes(provider.id)}>
                        <StatusTag status="failed" />
                      </Show>
                    </div>
                    <div class="provider-actions">
                      <IconButton
                        icon="edit"
                        variant="ghost"
                        aria-label={`Edit ${provider.name}`}
                        disabled={Boolean(state.ctx.saving()) || project() || provider.editable === false}
                        onClick={() => state.edit(provider)}
                      />
                      <IconButton
                        icon="trash"
                        variant="ghost"
                        aria-label={`Delete ${provider.name}`}
                        disabled={Boolean(state.ctx.saving()) || project() || provider.editable === false}
                        onClick={() => state.ask(provider)}
                      />
                    </div>
                  </article>
                )}
              </For>
            </Show>
          </div>

          <Show when={state.mode() !== "closed"}>
            <div class="drawer-scrim" onClick={state.close} />
            <aside class="provider-drawer" aria-label="Provider configuration">
              <Show
                when={state.mode() === "form"}
                fallback={
                  <>
                    <header class="drawer-header">
                      <div>
                        <h2>Add provider</h2>
                        <span>Enter credentials for a custom OpenAI-compatible provider.</span>
                      </div>
                      <Button variant="ghost" aria-label="Close provider overlay" onClick={state.close}>
                        X
                      </Button>
                    </header>
                    <div class="provider-form">
                      <label class="required-field">
                        Provider ID
                        <input
                          value={state.id()}
                          spellcheck={false}
                          onInput={(event) => state.setId(event.currentTarget.value)}
                        />
                      </label>
                      <label class="required-field">
                        Display name
                        <input value={state.name()} onInput={(event) => state.setName(event.currentTarget.value)} />
                      </label>
                      <label class="optional-field">
                        API key
                        <input
                          value={state.apiKey()}
                          placeholder="sk-... or {env:PROVIDER_API_KEY}"
                          spellcheck={false}
                          onInput={(event) => state.setApiKey(event.currentTarget.value)}
                        />
                      </label>
                      <label class="optional-field">
                        Base URL
                        <input
                          value={state.baseURL()}
                          placeholder="https://api.example.com/v1"
                          spellcheck={false}
                          onInput={(event) => state.setBaseURL(event.currentTarget.value)}
                        />
                      </label>
                      <label class="optional-field">
                        NPM package
                        <input
                          value={state.npm()}
                          placeholder="@ai-sdk/openai-compatible"
                          spellcheck={false}
                          onInput={(event) => state.setNpm(event.currentTarget.value)}
                        />
                      </label>
                      <label class="optional-field">
                        API identifier
                        <input
                          value={state.api()}
                          placeholder="openai-compatible"
                          spellcheck={false}
                          onInput={(event) => state.setApi(event.currentTarget.value)}
                        />
                      </label>
                      <label class="optional-field">
                        Model whitelist
                        <input
                          value={state.whitelist()}
                          placeholder="model-a, model-b"
                          spellcheck={false}
                          onInput={(event) => state.setWhitelist(event.currentTarget.value)}
                        />
                      </label>
                      <label class="optional-field">
                        Model blacklist
                        <input
                          value={state.blacklist()}
                          placeholder="model-a, model-b"
                          spellcheck={false}
                          onInput={(event) => state.setBlacklist(event.currentTarget.value)}
                        />
                      </label>
                      <label class="wide optional-field">
                        Extra options JSON
                        <textarea
                          value={state.options()}
                          spellcheck={false}
                          placeholder={'{\n  "timeout": 300000\n}'}
                          onInput={(event) => state.setOptions(event.currentTarget.value)}
                        />
                      </label>
                      <label class="wide optional-field">
                        Model overrides JSON
                        <textarea
                          value={state.models()}
                          spellcheck={false}
                          placeholder={'{\n  "model-id": { "name": "Model Name" }\n}'}
                          onInput={(event) => state.setModels(event.currentTarget.value)}
                        />
                      </label>
                    </div>
                    <footer class="drawer-footer">
                      <Button variant="ghost" onClick={state.close}>
                        Cancel
                      </Button>
                      <Button variant="primary" disabled={Boolean(state.ctx.saving())} onClick={state.save}>
                        Save Provider
                      </Button>
                    </footer>
                  </>
                }
              >
                <header class="drawer-header provider-config-header">
                  <div class="provider-title provider-drawer-title">
                    <span class="provider-icon" />
                    <div>
                      <h2>{state.name() || state.selected()?.name || state.id() || "Provider"}</h2>
                      <span>{state.id() || "New provider"}</span>
                    </div>
                  </div>
                  <Button variant="ghost" aria-label="Close provider overlay" onClick={state.close}>
                    X
                  </Button>
                </header>

                <div class="provider-form">
                  <label class="required-field">
                    Provider ID
                    <input
                      value={state.id()}
                      spellcheck={false}
                      onInput={(event) => state.setId(event.currentTarget.value)}
                    />
                  </label>
                  <label class="required-field">
                    Display name
                    <input value={state.name()} onInput={(event) => state.setName(event.currentTarget.value)} />
                  </label>
                  <label class="optional-field">
                    API key
                    <input
                      value={state.apiKey()}
                      placeholder="sk-... or {env:PROVIDER_API_KEY}"
                      spellcheck={false}
                      onInput={(event) => state.setApiKey(event.currentTarget.value)}
                    />
                  </label>
                  <label class="optional-field">
                    Base URL
                    <input
                      value={state.baseURL()}
                      placeholder="https://api.example.com/v1"
                      spellcheck={false}
                      onInput={(event) => state.setBaseURL(event.currentTarget.value)}
                    />
                  </label>
                  <label class="optional-field">
                    NPM package
                    <input
                      value={state.npm()}
                      placeholder="@ai-sdk/openai-compatible"
                      spellcheck={false}
                      onInput={(event) => state.setNpm(event.currentTarget.value)}
                    />
                  </label>
                  <label class="optional-field">
                    API identifier
                    <input
                      value={state.api()}
                      placeholder="openai-compatible"
                      spellcheck={false}
                      onInput={(event) => state.setApi(event.currentTarget.value)}
                    />
                  </label>
                  <label class="optional-field">
                    Model whitelist
                    <input
                      value={state.whitelist()}
                      placeholder="model-a, model-b"
                      spellcheck={false}
                      onInput={(event) => state.setWhitelist(event.currentTarget.value)}
                    />
                  </label>
                  <label class="optional-field">
                    Model blacklist
                    <input
                      value={state.blacklist()}
                      placeholder="model-a, model-b"
                      spellcheck={false}
                      onInput={(event) => state.setBlacklist(event.currentTarget.value)}
                    />
                  </label>
                  <label class="wide optional-field">
                    Extra options JSON
                    <textarea
                      value={state.options()}
                      spellcheck={false}
                      placeholder={'{\n  "timeout": 300000\n}'}
                      onInput={(event) => state.setOptions(event.currentTarget.value)}
                    />
                  </label>
                  <label class="wide optional-field">
                    Model overrides JSON
                    <textarea
                      value={state.models()}
                      spellcheck={false}
                      placeholder={'{\n  "model-id": { "name": "Model Name" }\n}'}
                      onInput={(event) => state.setModels(event.currentTarget.value)}
                    />
                  </label>
                </div>

                <footer class="drawer-footer">
                  <Button variant="ghost" onClick={state.close}>
                    Cancel
                  </Button>
                  <Button variant="primary" disabled={Boolean(state.ctx.saving())} onClick={state.save}>
                    Save Provider
                  </Button>
                </footer>
              </Show>
            </aside>
          </Show>
          <ConfirmDialog
            open={Boolean(state.pending())}
            title={`Delete provider ${state.pending()?.name ?? ""}?`}
            message={`This removes ${state.pending()?.id ?? "the provider"} from the current configuration.`}
            confirm="Delete"
            busy={Boolean(state.ctx.saving())}
            onCancel={state.cancel}
            onConfirm={state.confirm}
          />
        </ConfigPage>
      )}
    </Show>
  )
}
