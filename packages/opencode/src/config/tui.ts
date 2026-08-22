export interface TuiConfig {
  keybinds: Record<string, string>
  [key: string]: unknown
}

export const TuiConfig = {} as TuiConfig
export const defaultConfig: TuiConfig = { keybinds: {} }

export interface TuiKeybind {
  key: string
  action: string
}

export const TuiKeybind = {} as TuiKeybind
