import type { KiloClient } from "@kilocode/sdk/v2/client"
import { sameDirectory } from "../kilo-provider-utils"

type State = {
  directory: string
  enabled: boolean
  available: boolean
  reason?: string
  version: number
}

function unavailable(state: State) {
  return new Error(state.reason ?? "Sandbox backend is unavailable")
}

function routed(state: State, dir: string) {
  if (!sameDirectory(state.directory, dir)) throw new Error("Sandbox status resolved a different directory")
}

function confirm(state: State, dir: string, desired: boolean) {
  routed(state, dir)
  if (desired && !state.available) throw unavailable(state)
  if (state.enabled !== desired) {
    throw new Error(`Sandbox remained ${state.enabled ? "enabled" : "disabled"} after reconciliation`)
  }
  return state
}

function cleanSandbox(state: { reason?: string | null | undefined; [k: string]: unknown }): State {
  return { ...state, reason: state.reason ?? undefined } as State
}

/** Ensure a new session uses the selected sandbox state before its first prompt. */
export async function ensureSandbox(client: KiloClient, sid: string, dir: string, desired: boolean): Promise<State> {
  const sandbox = client.sandbox
  const { data: current } = await sandbox.status({ sessionID: sid, directory: dir }, { throwOnError: true })
  const clean = cleanSandbox(current)
  routed(clean, dir)
  if (clean.enabled === desired) return confirm(clean, dir, desired)
  if (!clean.available) throw unavailable(clean)

  const { data: next } = await sandbox.toggle({ sessionID: sid, directory: dir }, { throwOnError: true })
  return confirm(cleanSandbox(next), dir, desired)
}
