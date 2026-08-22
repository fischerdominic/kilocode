// Local autocomplete model definitions (previously from @kilocode/kilo-gateway/autocomplete)
// Kept minimal for self-hosted mode — only OpenAI-compatible FIM models are relevant.

export type AutocompleteProviderID = string

export interface AutocompleteModelDef {
  readonly id: string
  readonly provider: string
  readonly providerID: string
  readonly model: string
  readonly modelID: string
  readonly fimModelID: string
  readonly kind: string
  readonly label: string
  readonly requestModel: string
  readonly temperature: number
}

export const AUTOCOMPLETE_MODELS: AutocompleteModelDef[] = [
  {
    id: "codestral-latest",
    provider: "openai-compatible",
    providerID: "openai-compatible",
    model: "codestral-latest",
    modelID: "codestral-latest",
    fimModelID: "codestral-latest",
    kind: "fim",
    label: "Codestral",
    requestModel: "codestral-latest",
    temperature: 0,
  },
  {
    id: "qwen-coder-plus",
    provider: "openai-compatible",
    providerID: "openai-compatible",
    model: "qwen-coder-plus",
    modelID: "qwen-coder-plus",
    fimModelID: "qwen-coder-plus",
    kind: "fim",
    label: "Qwen Coder Plus",
    requestModel: "qwen-coder-plus",
    temperature: 0,
  },
]

export const DEFAULT_AUTOCOMPLETE_MODEL: AutocompleteModelDef = AUTOCOMPLETE_MODELS[0]

export function getAutocompleteModel(provider: string | null | undefined, model: string | null | undefined): AutocompleteModelDef {
  if (!provider || !model) return DEFAULT_AUTOCOMPLETE_MODEL
  const found = AUTOCOMPLETE_MODELS.find((m) => m.provider === provider && m.model === model)
  return found ?? DEFAULT_AUTOCOMPLETE_MODEL
}

export function getAutocompleteModelById(modelId: string): AutocompleteModelDef {
  const found = AUTOCOMPLETE_MODELS.find((m) => m.id === modelId || m.fimModelID === modelId)
  return found ?? DEFAULT_AUTOCOMPLETE_MODEL
}

export function validAutocompleteModel(value: string): boolean {
  return AUTOCOMPLETE_MODELS.some((m) => m.id === value || m.fimModelID === value)
}

export function validAutocompleteProvider(value: string): boolean {
  return AUTOCOMPLETE_MODELS.some((m) => m.provider === value)
}
