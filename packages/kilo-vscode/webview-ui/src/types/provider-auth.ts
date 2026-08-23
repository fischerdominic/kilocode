export type ProviderAuthMethod = {
  type: "oauth" | "api"
  label?: string
  prompts?: Array<{
    type: "text" | "select"
    key: string
    message: string
    placeholder?: string
    when?: { key: string; op: "eq"; value: string }
    options?: Array<{ label: string; value: string; hint?: string }>
  }>
}

export type ProviderAuthAuthorization = {
  url: string
  method: "auto" | "code"
  instructions?: string
}
