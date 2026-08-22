export interface PluginRuntime {
  register(_plugin: unknown): void
}

export interface TuiPluginHost {
  postMessage(_message: unknown): void
}

export function createPluginRuntime(_host: TuiPluginHost): PluginRuntime {
  return { register() {} }
}
