export * as ConfigProviderOptionsV1 from "./provider-options"

type Options = Readonly<Record<string, unknown>>

export interface ProviderResult {
  readonly headers?: Record<string, string>
  readonly body?: Record<string, unknown>
  readonly url?: string
  readonly settings?: Record<string, unknown>
}

export interface Lowerer {
  readonly provider: (options: Options) => ProviderResult
  readonly request: (options: Options) => Record<string, unknown>
}

// kilocode_change start - simplified to generic option handling only (OpenAI-compatible custom providers)
export function get(_packageName?: string): Lowerer {
  return raw
}

const raw: Lowerer = {
  provider(options) {
    return { body: clone(options) }
  },
  request: clone,
}
// kilocode_change end

// kilocode_change start - removed provider-specific lowerers (openai, anthropic, google, azure, bedrock, openaiCompatible) and their helper functions
// kilocode_change end

function clone(options: Options) {
  return { ...options }
}
