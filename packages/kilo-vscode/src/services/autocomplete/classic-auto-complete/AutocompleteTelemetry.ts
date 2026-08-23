import type { AutocompleteContext, CacheMatchType, FillInAtCursorSuggestion } from "../types"
import { getSuggestionKey as _getSuggestionKey } from "./telemetry-utils"

export type { AutocompleteContext, CacheMatchType, FillInAtCursorSuggestion }

export function getSuggestionKey(suggestion: FillInAtCursorSuggestion): string {
  return _getSuggestionKey(suggestion)
}

/**
 * Minimum time in milliseconds that a suggestion must be visible before
 * it counts as a "unique suggestion shown". This filters out suggestions
 * that flash briefly when the user is typing quickly.
 */
export const MIN_VISIBILITY_DURATION_MS = 300

/**
 * Maximum number of recent suggestion keys for which we've fired unique tracking.
 * Prevents unbounded growth over long sessions.
 */
const MAX_FIRED_UNIQUE_KEYS = 50

/**
 * Type of autocomplete being used
 * - "inline": Classic inline code completion in the editor
 * - "chat-textarea": Autocomplete in the chat input textarea
 */
export type AutocompleteType = "inline" | "chat-textarea"

/**
 * Tracks the currently displayed suggestion for visibility-based tracking.
 * Used to determine if a suggestion has been visible for MIN_VISIBILITY_DURATION_MS.
 */
interface VisibilityTrackingState {
  /** Unique key identifying the currently displayed suggestion */
  suggestionKey: string
  /** Timer that fires after MIN_VISIBILITY_DURATION_MS */
  timer: NodeJS.Timeout
  /** The source of the suggestion (llm or cache) */
  source: "llm" | "cache"
  /** Context for the suggestion */
  context: AutocompleteContext
  /** Length of the suggestion text */
  suggestionLength: number
}

/**
 * Tracking service for autocomplete events.
 * All capture methods are no-ops since telemetry has been disabled.
 */
export class AutocompleteTelemetry {
  private readonly autocompleteType: AutocompleteType
  /** Tracks the currently displayed suggestion for visibility-based tracking */
  private visibilityTracking: VisibilityTrackingState | null = null
  /**
   * Tracks suggestion keys for which unique tracking has already been fired.
   * Uses insertion order to evict the oldest keys when the cap is exceeded.
   */
  private firedUniqueKeys: Map<string, true> = new Map()

  private markSuggestionKeyAsFired(suggestionKey: string): void {
    _getSuggestionKey({ text: "", prefix: "", suffix: "", scope: "" } as FillInAtCursorSuggestion)
    insertWithLRUEviction(this.firedUniqueKeys, suggestionKey, true, MAX_FIRED_UNIQUE_KEYS)
  }

  /**
   * Create a new AutocompleteTelemetry instance
   * @param autocompleteType - The type of autocomplete (defaults to "inline" for backward compatibility)
   */
  constructor(autocompleteType: AutocompleteType = "inline") {
    this.autocompleteType = autocompleteType
  }

  private noop(): void {
    // Telemetry disabled
  }

  /**
   * Capture when a suggestion is requested, this is whenever our completion provider is invoked by VS Code
   */
  public captureSuggestionRequested(_context: AutocompleteContext): void {
    // Temporarily disabled for cost reduction
  }

  /**
   * Capture when a suggestion is filtered out by our software
   */
  public captureSuggestionFiltered(
    _reason: "empty_response" | "filtered_by_postprocessing",
    _context: AutocompleteContext,
  ): void {
    this.noop()
  }

  /**
   * Capture when a suggestion is found in cache/history
   */
  public captureCacheHit(_matchType: CacheMatchType, _context: AutocompleteContext, _suggestionLength: number): void {
    this.noop()
  }

  /**
   * Capture when a newly requested suggestion is returned to the user (so no cache hit)
   */
  public captureLlmSuggestionReturned(_context: AutocompleteContext, _suggestionLength: number): void {
    this.noop()
  }

  /**
   * Capture when an LLM request completes successfully
   */
  public captureLlmRequestCompleted(
    _properties: {
      latencyMs: number
      cost?: number
      inputTokens?: number
      outputTokens?: number
    },
    _context: AutocompleteContext,
  ): void {
    this.noop()
  }

  /**
   * Capture when an LLM request fails
   */
  public captureLlmRequestFailed(_properties: { latencyMs: number; error: string }, _context: AutocompleteContext): void {
    this.noop()
  }

  /**
   * Capture when a user accepts a suggestion
   */
  public captureAcceptSuggestion(_suggestionLength?: number): void {
    this.noop()
  }

  /**
   * Capture when a unique suggestion is shown to the user for the first time.
   */
  private captureUniqueSuggestionShown(_context: AutocompleteContext): void {
    this.noop()
  }

  /**
   * Start visibility tracking for a suggestion.
   * If the suggestion is still being displayed after MIN_VISIBILITY_DURATION_MS,
   * the unique suggestion tracking will be fired.
   */
  public startVisibilityTracking(
    suggestion: FillInAtCursorSuggestion,
    source: "llm" | "cache",
    context: AutocompleteContext,
  ): void {
    const suggestionKey = getSuggestionKey(suggestion)
    const suggestionLength = suggestion.text.length

    // If we're already tracking this exact suggestion, do nothing
    if (this.visibilityTracking?.suggestionKey === suggestionKey) {
      return
    }

    // Cancel any existing visibility tracking (different suggestion is now shown)
    this.cancelVisibilityTracking()

    // Don't track if we've already fired tracking for this suggestion
    if (this.firedUniqueKeys.has(suggestionKey)) {
      return
    }

    // Don't track empty suggestions
    if (suggestionLength === 0) {
      return
    }

    const timer = setTimeout(() => {
      this.captureUniqueSuggestionShown(context)
      this.markSuggestionKeyAsFired(suggestionKey)
      this.visibilityTracking = null
    }, MIN_VISIBILITY_DURATION_MS)

    this.visibilityTracking = {
      suggestionKey,
      timer,
      source,
      context,
      suggestionLength,
    }
  }

  /**
   * Cancel any pending visibility tracking.
   * Called when a different suggestion is shown or no suggestion is shown.
   */
  public cancelVisibilityTracking(): void {
    if (this.visibilityTracking) {
      clearTimeout(this.visibilityTracking.timer)
      this.visibilityTracking = null
    }
  }

  /**
   * Dispose of the tracking service, cleaning up any pending timers.
   */
  public dispose(): void {
    this.cancelVisibilityTracking()
  }
}

function insertWithLRUEviction<K, V>(map: Map<K, V>, key: K, _value: V, max_size: number): void {
  if (map.has(key)) return
  map.set(key, _value)
  if (map.size > max_size) {
    const firstKey = map.keys().next().value
    if (firstKey !== undefined) {
      map.delete(firstKey)
    }
  }
}
