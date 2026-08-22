/**
 * Feedback context
 *
 * Tracks per-message thumbs up/down ratings (in-memory only).
 * The context exposes a single `rate()` callback that updates local state.
 *
 * State is not persisted — ratings reset on page reload / session switch.
 */

import { createContext, useContext, createSignal, onCleanup } from "solid-js"
import type { ParentComponent, Accessor } from "solid-js"
import { useVSCode } from "./vscode"
import type { ExtensionMessage } from "../types/messages"
import { buildFeedbackProperties, type Rating, type RateInput } from "./feedback-payload"

export type { Rating, RateInput } from "./feedback-payload"

interface FeedbackContextValue {
  getRating: (messageID: string) => Rating | undefined
  rate: (input: RateInput) => void
}

const FeedbackContext = createContext<FeedbackContextValue>()

export const FeedbackProvider: ParentComponent = (props) => {
  const vscode = useVSCode()
  const [ratings, setRatings] = createSignal<Record<string, Rating>>({})

  const unsubscribe = vscode.onMessage((message: ExtensionMessage) => {
    // No-op: telemetry has been removed
  })

  onCleanup(unsubscribe)

  const getRating = (messageID: string) => ratings()[messageID]

  const rate = (input: RateInput) => {
    const prev = ratings()[input.messageID]

    setRatings((current) => {
      const updated = { ...current }
      if (input.next === null) delete updated[input.messageID]
      else updated[input.messageID] = input.next
      return updated
    })
  }

  const value: FeedbackContextValue = { getRating, rate }

  return <FeedbackContext.Provider value={value}>{props.children}</FeedbackContext.Provider>
}

export function useFeedback(): FeedbackContextValue {
  const context = useContext(FeedbackContext)
  if (!context) throw new Error("useFeedback must be used within a FeedbackProvider")
  return context
}
