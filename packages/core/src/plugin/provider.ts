// kilocode_change - removed all built-in provider plugin imports and array entries
import type { PluginInternal } from "./internal"
import type { Scope } from "effect"

export const ProviderPlugins: PluginInternal.Plugin<PluginInternal.Requirements | Scope.Scope>[] = []
