import type { Provider, ProviderModel, ModelSelection } from "../types/messages"

export type EnrichedModel = ProviderModel & { providerID: string; providerName: string }

/**
 * Find an enriched model from a flat model list by provider ID and model ID.
 */
export function findModel(models: EnrichedModel[], selection: ModelSelection | null): EnrichedModel | undefined {
  if (!selection) return undefined
  return models.find((m) => m.providerID === selection.providerID && m.id === selection.modelID)
}

/**
 * True when the selection points to an existing model in a connected provider.
 */
export function isModelValid(
  providers: Record<string, Provider>,
  connected: string[],
  selection: ModelSelection | null,
): boolean {
  if (!selection) return false
  const provider = providers[selection.providerID]
  if (!provider) return false
  if (selection.providerID !== "kilo" && !connected.includes(selection.providerID)) return false
  return !!provider.models[selection.modelID]
}
