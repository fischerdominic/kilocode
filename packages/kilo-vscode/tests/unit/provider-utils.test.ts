import { describe, it, expect } from "bun:test"
import { findModel, isModelValid } from "../../webview-ui/src/context/provider-utils"
import type { Provider } from "../../webview-ui/src/types/messages"

function makeProvider(id: string, name: string, modelIds: string[]): Provider {
  const models: Provider["models"] = {}
  for (const mid of modelIds) {
    models[mid] = { id: mid, name: mid.toUpperCase() }
  }
  return { id, name, models }
}

function flattenModels(providers: Record<string, Provider>): Array<any> {
  const result: Array<any> = []
  for (const providerID of Object.keys(providers)) {
    const provider = providers[providerID]!
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
}

describe("findModel", () => {
  const providers = {
    openai: makeProvider("openai", "OpenAI", ["gpt-4", "gpt-3.5"]),
    anthropic: makeProvider("anthropic", "Anthropic", ["claude-3"]),
  }
  const models = flattenModels(providers)

  it("returns undefined for null selection", () => {
    expect(findModel(models, null)).toBeUndefined()
  })

  it("finds model by providerID and modelID", () => {
    const result = findModel(models, { providerID: "openai", modelID: "gpt-4" })
    expect(result).not.toBeUndefined()
    expect(result?.id).toBe("gpt-4")
    expect(result?.providerID).toBe("openai")
  })

  it("returns undefined when providerID does not match", () => {
    expect(findModel(models, { providerID: "unknown", modelID: "gpt-4" })).toBeUndefined()
  })

  it("returns undefined when modelID does not match", () => {
    expect(findModel(models, { providerID: "openai", modelID: "unknown-model" })).toBeUndefined()
  })

  it("finds model from second provider", () => {
    const result = findModel(models, { providerID: "anthropic", modelID: "claude-3" })
    expect(result?.providerName).toBe("Anthropic")
  })

  it("returns undefined for empty model list", () => {
    expect(findModel([], { providerID: "openai", modelID: "gpt-4" })).toBeUndefined()
  })
})

describe("isModelValid", () => {
  const providers = {
    kilo: makeProvider("kilo", "Kilo Gateway", ["kilo-auto/free"]),
    openai: makeProvider("openai", "OpenAI", ["gpt-4o"]),
  }

  it("accepts a connected provider model", () => {
    expect(isModelValid(providers, ["openai"], { providerID: "openai", modelID: "gpt-4o" })).toBe(true)
  })

  it("rejects a disconnected non-kilo provider", () => {
    expect(isModelValid(providers, [], { providerID: "openai", modelID: "gpt-4o" })).toBe(false)
  })

  it("accepts kilo models when present in the catalog", () => {
    expect(isModelValid(providers, [], { providerID: "kilo", modelID: "kilo-auto/free" })).toBe(true)
  })

  it("rejects unknown models", () => {
    expect(isModelValid(providers, ["openai"], { providerID: "openai", modelID: "missing" })).toBe(false)
  })
})
