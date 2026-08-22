/**
 * Provider/model context
 * Manages custom provider state only — built-in provider catalog has been removed.
 * Selection is now per-session — see session.tsx.
 */

import { createContext, useContext, createSignal, createMemo, onCleanup } from "solid-js"
import type { ParentComponent, Accessor } from "solid-js"
import { useVSCode } from "./vscode"
import type { Provider, ProviderModel, ModelSelection, ExtensionMessage, ProviderAuthState } from "../types/messages"
import type { ProviderAuthMethod } from "@kilocode/sdk/v2/client"
import { findModel as _findModel, isModelValid as isValid } from "./provider-utils"

export type EnrichedModel = ProviderModel & { providerID: string; providerName: string }

interface ProviderContextValue {
  providers: Accessor<Record<string, Provider>>
  connected: Accessor<string[]>
  defaults: Accessor<Record<string, string>>
  defaultSelection: Accessor<ModelSelection>
  models: Accessor<EnrichedModel[]>
  findModel: (selection: ModelSelection | null) => EnrichedModel | undefined
  authMethods: Accessor<Record<string, ProviderAuthMethod[]>>
  authStates: Accessor<Record<string, ProviderAuthState>>
  isModelValid: (selection: ModelSelection | null) => boolean
}

export const ProviderContext = createContext<ProviderContextValue>()

export const ProviderProvider: ParentComponent = (props) => {
  const vscode = useVSCode()

  const [providers, setProviders] = createSignal<Record<string, Provider>>({})
  const [connected, setConnected] = createSignal<string[]>([])
  const [defaults, setDefaults] = createSignal<Record<string, string>>({})
  const [defaultSelection, setDefaultSelection] = createSignal<ModelSelection>({ providerID: "", modelID: "" })
  const [authMethods, setAuthMethods] = createSignal<Record<string, ProviderAuthMethod[]>>({})
  const [authStates, setAuthStates] = createSignal<Record<string, ProviderAuthState>>({})

  const models = createMemo<EnrichedModel[]>(() => {
    const result: EnrichedModel[] = []
    for (const providerID of Object.keys(providers())) {
      const provider = providers()[providerID]!
      for (const modelID of Object.keys(provider.models)) {
        result.push({
          ...provider.models[modelID]!,
          id: modelID,
          providerID,
          providerName: provider.name,
        })
      }
    }
    return result
  })

  function findModel(selection: ModelSelection | null): EnrichedModel | undefined {
    return _findModel(models(), selection)
  }

  function isModelValid(selection: ModelSelection | null): boolean {
    return isValid(providers(), connected(), selection)
  }

  const unsubscribe = vscode.onMessage((message: ExtensionMessage) => {
    if (message.type !== "providersLoaded") {
      return
    }

    setProviders(message.providers)
    setConnected(message.connected)
    setDefaults(message.defaults)
    setDefaultSelection(message.defaultSelection)
    setAuthMethods(message.authMethods)
    setAuthStates(message.authStates)
  })

  onCleanup(unsubscribe)

  vscode.postMessage({ type: "requestProviders" })

  const fallback = setTimeout(() => {
    if (Object.keys(providers()).length === 0) {
      vscode.postMessage({ type: "requestProviders" })
    }
  }, 3000)

  const unsubReady = vscode.onMessage((message: ExtensionMessage) => {
    if (message.type !== "extensionDataReady") return
    unsubReady()
    clearTimeout(fallback)
    if (Object.keys(providers()).length === 0) {
      vscode.postMessage({ type: "requestProviders" })
    }
  })

  onCleanup(() => {
    unsubReady()
    clearTimeout(fallback)
  })

  const value: ProviderContextValue = {
    providers,
    connected,
    defaults,
    defaultSelection,
    models,
    findModel,
    authMethods,
    authStates,
    isModelValid,
  }

  return <ProviderContext.Provider value={value}>{props.children}</ProviderContext.Provider>
}

export function useProvider(): ProviderContextValue {
  const context = useContext(ProviderContext)
  if (!context) {
    throw new Error("useProvider must be used within a ProviderProvider")
  }
  return context
}
