export interface HostPluginApi {
  postMessage(message: unknown): void
  getState(): unknown
  setState(state: unknown): void
}

export interface HostSlots {
  registerCommand(command: unknown): void
  registerProvider(provider: unknown): void
}
