// Comprehensive TUI stub package

// util/record
export function isRecord(value: unknown): boolean { return typeof value === "object" && value !== null }
export function isString(value: unknown): value is string { return typeof value === "string" }
export function isNumber(value: unknown): value is number { return typeof value === "number" }
export function isBoolean(value: unknown): value is boolean { return typeof value === "boolean" }
export function isNull(value: unknown): value is null { return value === null }
export function isUndefined(value: unknown): value is undefined { return value === undefined }

// util/locale
export const Locale = "en" as const
export type Locale = "en" | "de" | "es" | "fr" | "ja" | "ko" | "pl" | "ru" | "zh" | "zhTW"

// util/error
export function errorData(error: unknown): { message: string; stack?: string } {
  return { message: String(error) }
}
export function errorMessage(error: unknown): string {
  return String(error)
}

// config
export interface TuiConfig {
  keybinds: Record<string, string>
  [key: string]: unknown
}
export const TuiConfig = {} as TuiConfig
export const defaultConfig: TuiConfig = { keybinds: {} }

// config/keybind
export interface TuiKeybind {
  key: string
  action: string
}
export const TuiKeybind = {} as TuiKeybind

// context/theme
export function hasTheme(themes: Record<string, unknown>, name: string): boolean { return name in themes }
export function upsertTheme(themes: Record<string, unknown>, theme: unknown): Record<string, unknown> { return themes }

// context/exit
export interface Exit {
  code: number
  signal?: string
}

// plugin/slots
export interface HostPluginApi {
  postMessage(message: unknown): void
  getState(): unknown
  setState(state: unknown): void
}
export interface HostSlots {
  registerCommand(command: unknown): void
  registerProvider(provider: unknown): void
}

// plugin/command-shim
export function createCommandShim(name: string, handler: (...args: unknown[]) => unknown) {
  return { name, handler }
}

// plugin/runtime
export interface PluginRuntime {
  register(plugin: unknown): void
}
export interface TuiPluginHost {
  postMessage(message: unknown): void
}
export function createPluginRuntime(host: TuiPluginHost): PluginRuntime {
  return { register() {} }
}

// builtins
export type BuiltinTuiPlugin = unknown
export function createBuiltinPlugins(): BuiltinTuiPlugin[] {
  return []
}

// parsers-config
export default {}
