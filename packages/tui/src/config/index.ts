export interface TuiConfig {
  keybinds: Record<string, string>
}

export const TuiConfig = {} as TuiConfig
export const defaultConfig: TuiConfig = { keybinds: {} }
