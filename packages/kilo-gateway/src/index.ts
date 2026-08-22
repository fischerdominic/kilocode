// ============================================================================
// Kilo Gateway - stripped down
// ============================================================================
// This package previously exposed provider facades, auth helpers, and gateway
// URL utilities. Those have been removed; only minimal constants and stubs
// remain so downstream packages that still import from here can typecheck.

// ---------------------------------------------------------------------------
// Constants consumed by other packages
// ---------------------------------------------------------------------------

export const KILO_OPENROUTER_BASE = "https://openrouter.ai/api/v1"

export const HEADER_FEATURE = "x-kilo-feature"
export const HEADER_ORGANIZATIONID = "x-kilo-organization-id"

export const PROMPTS = {
  system: "You are a helpful assistant.",
} as const

export const AI_SDK_PROVIDERS = [] as const

// ---------------------------------------------------------------------------
// Stubs — downstream code that still imports these will get no-ops.
// ---------------------------------------------------------------------------

export function getDefaultHeaders(): Record<string, string> {
  return {}
}

export function resolveKiloGatewayBaseUrl(input: {
  baseURL?: string
  token?: string
}): string {
  return input.baseURL ?? "https://api.kilo.ai/v1"
}

export async function fetchProfile(_token: string): Promise<{ email?: string } | null> {
  return null
}
