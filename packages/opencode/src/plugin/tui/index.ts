export interface HostPluginApi {
  postMessage(message: unknown): void
  getState(): unknown
  setState(state: unknown): void
}

export interface HostSlots {
  registerCommand(command: unknown): void
  registerProvider(provider: unknown): void
}

export function createCommandShim(name: string, handler: (...args: unknown[]) => unknown) {
  return { name, handler }
}

export interface PluginRuntime {
  register(plugin: unknown): void
}

export interface TuiPluginHost {
  postMessage(message: unknown): void
}

export function createPluginRuntime(host: TuiPluginHost): PluginRuntime {
  return { register() {} }
}

export type BuiltinTuiPlugin = unknown

export function createBuiltinPlugins(): BuiltinTuiPlugin[] {
  return []
}
