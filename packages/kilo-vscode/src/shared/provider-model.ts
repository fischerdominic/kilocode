export const CUSTOM_PROVIDER_PACKAGE = "@ai-sdk/openai-compatible" as const
export type CustomProviderPackage = typeof CUSTOM_PROVIDER_PACKAGE
export const PROVIDER_ID_PATTERN = /^[a-z0-9][a-z0-9-_]*$/

export function isCustomProviderPackage(value: unknown): value is CustomProviderPackage {
  return value === CUSTOM_PROVIDER_PACKAGE
}

export function parseModelString(raw: string | undefined | null) {
  if (!raw) return null
  const slash = raw.indexOf("/")
  if (slash <= 0 || slash >= raw.length - 1) return null
  return { providerID: raw.slice(0, slash), modelID: raw.slice(slash + 1) }
}
