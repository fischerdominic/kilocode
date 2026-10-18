import { describe, expect, it } from "bun:test"
import { validateCustomProvider } from "../../webview-ui/src/components/settings/CustomProviderValidation"
import type { FormState } from "../../webview-ui/src/components/settings/CustomProviderValidation"

// Simple translator that returns the key so tests can assert on key names
const t = (key: string) => key

function model(
  extra: Partial<import("../../webview-ui/src/components/settings/CustomProviderModelCard").ModelEntry> = {},
) {
  return {
    id: "model-1",
    name: "Model One",
    reasoning: false,
    supportsImages: false,
    modalities: {},
    variants: [],
    context: "",
    outputLimit: "",
    costInput: "",
    costOutput: "",
    costCacheRead: "",
    costCacheWrite: "",
    ...extra,
  }
}

function base(): FormState {
  return {
    providerID: "my-provider",
    name: "My Provider",
    npm: "@ai-sdk/openai-compatible",
    baseURL: "https://example.com/v1",
    apiKey: "",
    models: [model()],
    headers: [],
    saving: false,
  }
}

function args(form: FormState) {
  return {
    form,
    t,
    editing: false,
    disabledProviders: [],
    existingProviderIDs: new Set<string>(),
  }
}

describe("validateCustomProvider – variant name validation", () => {
  it("persists the selected provider package", () => {
    const form = base()
    form.npm = "@ai-sdk/openai"

    expect(validateCustomProvider(args(form)).result?.config.npm).toBe("@ai-sdk/openai")
  })

  it("allows reconnecting a disabled provider id", () => {
    const form = base()
    const out = validateCustomProvider({
      ...args(form),
      disabledProviders: ["my-provider"],
      existingProviderIDs: new Set(["my-provider"]),
    })

    expect(out.result?.providerID).toBe("my-provider")
    expect(out.errors.providerID).toBeUndefined()
  })

  it("allows submit when reasoning is enabled with no variants", () => {
    const form = base()
    form.models[0].reasoning = true
    const out = validateCustomProvider(args(form))
    expect(out.result).toBeDefined()
    expect(out.errors.models[0].variants).toEqual([])
  })

  it("allows submit when reasoning is enabled with a named variant", () => {
    const form = base()
    form.models[0].reasoning = true
    form.models[0].variants = [
      {
        name: "fast",
        enableThinking: undefined,
        thinking: undefined,
        splitReasoning: undefined,
        outputEffort: undefined,
        reasoningEffort: undefined,
        chatTemplateArgs: undefined,
      },
    ]
    const out = validateCustomProvider(args(form))
    expect(out.result).toBeDefined()
    expect(out.errors.models[0].variants?.[0]?.name).toBeUndefined()
  })

  it("blocks submit and reports error when reasoning is enabled with an empty variant name", () => {
    const form = base()
    form.models[0].reasoning = true
    form.models[0].variants = [
      {
        name: "",
        enableThinking: undefined,
        thinking: undefined,
        splitReasoning: undefined,
        outputEffort: undefined,
        reasoningEffort: undefined,
        chatTemplateArgs: undefined,
      },
    ]
    const out = validateCustomProvider(args(form))
    expect(out.result).toBeUndefined()
    expect(out.errors.models[0].variants?.[0]?.name).toBe('variants[""]: provider.custom.error.required')
  })

  it("blocks submit and reports error when reasoning is enabled with a whitespace-only variant name", () => {
    const form = base()
    form.models[0].reasoning = true
    form.models[0].variants = [
      {
        name: "   ",
        enableThinking: undefined,
        thinking: undefined,
        splitReasoning: undefined,
        outputEffort: undefined,
        reasoningEffort: undefined,
        chatTemplateArgs: undefined,
      },
    ]
    const out = validateCustomProvider(args(form))
    expect(out.result).toBeUndefined()
    expect(out.errors.models[0].variants?.[0]?.name).toBe('variants["   "]: provider.custom.error.required')
  })

  it("blocks submit and reports duplicate error for two variants with the same name", () => {
    const form = base()
    form.models[0].reasoning = true
    form.models[0].variants = [
      {
        name: "fast",
        enableThinking: undefined,
        thinking: undefined,
        splitReasoning: undefined,
        outputEffort: undefined,
        reasoningEffort: undefined,
        chatTemplateArgs: undefined,
      },
      {
        name: "fast",
        enableThinking: undefined,
        thinking: undefined,
        splitReasoning: undefined,
        outputEffort: undefined,
        reasoningEffort: undefined,
        chatTemplateArgs: undefined,
      },
    ]
    const out = validateCustomProvider(args(form))
    expect(out.result).toBeUndefined()
    expect(out.errors.models[0].variants?.[1]?.name).toBe('variants["fast"]: provider.custom.error.duplicate')
  })

  it("ignores variants entirely when reasoning is disabled, even if they have empty names", () => {
    const form = base()
    form.models[0].reasoning = false
    form.models[0].variants = [
      {
        name: "",
        enableThinking: undefined,
        thinking: undefined,
        splitReasoning: undefined,
        outputEffort: undefined,
        reasoningEffort: undefined,
        chatTemplateArgs: undefined,
      },
    ]
    const out = validateCustomProvider(args(form))
    // No variant errors produced; form is allowed to submit
    expect(out.errors.models[0].variants).toEqual([])
    // Variant is not included in the saved config
    expect(out.result).toBeDefined()
    const saved = out.result!.config.models["model-1"] as Record<string, unknown>
    expect(saved.variants).toBeUndefined()
  })

  it("treats model IDs differing only in case as duplicates", () => {
    const form = base()
    form.models = [
      model({ id: "qwen2.5-coder:14b", name: "Qwen" }),
      model({ id: "QWEN2.5-CODER:14B", name: "Qwen Upper" }),
    ]
    const out = validateCustomProvider(args(form))
    expect(out.result).toBeUndefined()
    expect(out.errors.models[0].id).toBeUndefined()
    expect(out.errors.models[1].id).toBe("provider.custom.error.duplicate")
  })

  it("persists named variants in the saved config when reasoning is enabled", () => {
    const form = base()
    form.models[0].reasoning = true
    form.models[0].variants = [
      {
        name: "eco",
        enableThinking: true,
        thinking: "adaptive",
        splitReasoning: false,
        outputEffort: "max",
        reasoningEffort: "low",
        chatTemplateArgs: undefined,
      },
    ]
    const out = validateCustomProvider(args(form))
    expect(out.result).toBeDefined()
    const saved = out.result!.config.models["model-1"] as Record<string, unknown>
    expect(saved.variants).toEqual({
      eco: {
        enable_thinking: true,
        thinking: { type: "adaptive" },
        reasoning_split: false,
        effort: "max",
        reasoningEffort: "low",
      },
    })
  })

  it("preserves opaque variant options after the editor controls are removed", () => {
    const form = base()
    const raw = {
      thinking: { type: "adaptive", display: "summarized" },
      reasoningSummary: "auto",
      include: ["reasoning.encrypted_content"],
      customOption: { enabled: true },
    }
    form.models[0].reasoning = true
    form.models[0].variants = [
      {
        name: "high",
        raw,
        enableThinking: undefined,
        thinking: "adaptive",
        splitReasoning: undefined,
        outputEffort: undefined,
        reasoningEffort: undefined,
        chatTemplateArgs: undefined,
      },
    ]

    const out = validateCustomProvider(args(form))
    expect(out.result).toBeDefined()
    const saved = out.result!.config.models["model-1"] as Record<string, unknown>
    expect(saved.variants).toEqual({ high: raw })
  })

  it("serializes image modality when supportsImages is set", () => {
    const form = base()
    form.models[0].supportsImages = true
    const out = validateCustomProvider(args(form))
    expect(out.result).toBeDefined()
    const saved = out.result!.config.models["model-1"] as Record<string, unknown>
    expect(saved.modalities).toEqual({ input: ["text", "image"] })
  })

  it("omits modalities when supportsImages is not set on a text-only model", () => {
    const form = base()
    const out = validateCustomProvider(args(form))
    expect(out.result).toBeDefined()
    const saved = out.result!.config.models["model-1"] as Record<string, unknown>
    expect(saved.modalities).toBeUndefined()
  })

  it("preserves an existing image-only input when saving", () => {
    const form = base()
    form.models[0].modalities = { input: ["image"] }
    form.models[0].supportsImages = true
    const out = validateCustomProvider(args(form))
    expect(out.result).toBeDefined()
    const saved = out.result!.config.models["model-1"] as Record<string, unknown>
    expect(saved.modalities).toEqual({ input: ["image"] })
  })

  it("omits an empty input when image support is removed from an image-only model", () => {
    const form = base()
    form.models[0].modalities = { input: ["image"] }
    form.models[0].supportsImages = false
    const out = validateCustomProvider(args(form))
    expect(out.result).toBeDefined()
    const saved = out.result!.config.models["model-1"] as Record<string, unknown>
    expect(saved.modalities).toBeUndefined()
  })

  it("preserves output-only modalities when saving", () => {
    const form = base()
    form.models[0].modalities = { output: ["audio"] }
    const out = validateCustomProvider(args(form))
    expect(out.result).toBeDefined()
    const saved = out.result!.config.models["model-1"] as Record<string, unknown>
    expect(saved.modalities).toEqual({ output: ["audio"] })
  })

  it("preserves unsupported UI modalities when toggling image support", () => {
    const form = base()
    form.models[0].modalities = {
      input: ["text", "audio", "image", "video", "pdf"],
      output: ["text", "audio"],
    }
    form.models[0].supportsImages = false
    const out = validateCustomProvider(args(form))
    expect(out.result).toBeDefined()
    const saved = out.result!.config.models["model-1"] as Record<string, unknown>
    expect(saved.modalities).toEqual({ input: ["text", "audio", "video", "pdf"], output: ["text", "audio"] })
  })

  it("handles multiple models with reasoning and images toggled", () => {
    const form = base()
    form.models = [
      model({ id: "m1", name: "Model 1", reasoning: true, supportsImages: true }),
      model({ id: "m2", name: "Model 2", reasoning: true, supportsImages: false }),
    ]
    const out = validateCustomProvider(args(form))
    expect(out.result).toBeDefined()
    const m1 = out.result!.config.models["m1"] as Record<string, unknown>
    const m2 = out.result!.config.models["m2"] as Record<string, unknown>
    expect(m1.reasoning).toBe(true)
    expect(m1.modalities).toEqual({ input: ["text", "image"] })
    expect(m2.reasoning).toBe(true)
    expect(m2.modalities).toBeUndefined()
  })
})

describe("validateCustomProvider – limits and costs", () => {
  it("serializes limit and cost when all fields are set", () => {
    const form = base()
    form.models[0] = model({
      context: "262144",
      outputLimit: "8192",
      costInput: "2.0",
      costOutput: "10.0",
      costCacheRead: "0.1",
      costCacheWrite: "2.5",
    })
    const out = validateCustomProvider(args(form))
    expect(out.result).toBeDefined()
    const saved = out.result!.config.models["model-1"] as Record<string, unknown>
    expect(saved.limit).toEqual({ context: 262144, output: 8192 })
    expect(saved.cost).toEqual({ input: 2, output: 10, cache_read: 0.1, cache_write: 2.5 })
  })

  it("omits limit and cost when no fields are set", () => {
    const form = base()
    const out = validateCustomProvider(args(form))
    expect(out.result).toBeDefined()
    const saved = out.result!.config.models["model-1"] as Record<string, unknown>
    expect(saved.limit).toBeUndefined()
    expect(saved.cost).toBeUndefined()
  })

  it("serializes cost without cache fields when cache is not set", () => {
    const form = base()
    form.models[0] = model({ costInput: "1.5", costOutput: "7.5" })
    const out = validateCustomProvider(args(form))
    expect(out.result).toBeDefined()
    const saved = out.result!.config.models["model-1"] as Record<string, unknown>
    expect(saved.cost).toEqual({ input: 1.5, output: 7.5 })
    expect(saved.limit).toBeUndefined()
  })

  it("serializes limit without cost when only limits are set", () => {
    const form = base()
    form.models[0] = model({ context: "131072", outputLimit: "4096" })
    const out = validateCustomProvider(args(form))
    expect(out.result).toBeDefined()
    const saved = out.result!.config.models["model-1"] as Record<string, unknown>
    expect(saved.limit).toEqual({ context: 131072, output: 4096 })
    expect(saved.cost).toBeUndefined()
  })

  it("blocks submit when cost input is set but output cost is missing", () => {
    const form = base()
    form.models[0] = model({ costInput: "2.0" })
    const out = validateCustomProvider(args(form))
    expect(out.result).toBeUndefined()
    expect(out.errors.models[0].costOutput).toBe("provider.custom.models.cost.required")
  })

  it("blocks submit when cache cost is set but input and output costs are missing", () => {
    const form = base()
    form.models[0] = model({ costCacheRead: "0.1" })
    const out = validateCustomProvider(args(form))
    expect(out.result).toBeUndefined()
    expect(out.errors.models[0].costInput).toBe("provider.custom.models.cost.required")
    expect(out.errors.models[0].costOutput).toBe("provider.custom.models.cost.required")
  })

  it("blocks submit when context is set but output limit is missing", () => {
    const form = base()
    form.models[0] = model({ context: "262144" })
    const out = validateCustomProvider(args(form))
    expect(out.result).toBeUndefined()
    expect(out.errors.models[0].outputLimit).toBe("provider.custom.models.limit.outputRequired")
  })

  it("blocks submit when output limit is set but context is missing", () => {
    const form = base()
    form.models[0] = model({ outputLimit: "8192" })
    const out = validateCustomProvider(args(form))
    expect(out.result).toBeUndefined()
    expect(out.errors.models[0].context).toBe("provider.custom.models.limit.outputRequired")
  })

  it("blocks submit when a limit value is not a number", () => {
    const form = base()
    form.models[0] = model({ context: "abc", outputLimit: "8192" })
    const out = validateCustomProvider(args(form))
    expect(out.result).toBeUndefined()
    expect(out.errors.models[0].context).toBe("provider.custom.models.number.invalid")
  })

  it("blocks submit when a cost value is negative", () => {
    const form = base()
    form.models[0] = model({ costInput: "-1", costOutput: "10" })
    const out = validateCustomProvider(args(form))
    expect(out.result).toBeUndefined()
    expect(out.errors.models[0].costInput).toBe("provider.custom.models.number.invalid")
  })

  it("blocks submit when a limit value is zero", () => {
    const form = base()
    form.models[0] = model({ context: "0", outputLimit: "8192" })
    const out = validateCustomProvider(args(form))
    expect(out.result).toBeUndefined()
    expect(out.errors.models[0].context).toBe("provider.custom.models.number.invalid")
  })

  it("allows a zero cost", () => {
    const form = base()
    form.models[0] = model({ costInput: "0", costOutput: "0" })
    const out = validateCustomProvider(args(form))
    expect(out.result).toBeDefined()
    const saved = out.result!.config.models["model-1"] as Record<string, unknown>
    expect(saved.cost).toEqual({ input: 0, output: 0 })
  })
})
