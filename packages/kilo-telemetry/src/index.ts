export namespace Telemetry {
  export async function init(_options: { dataPath: string; version: string; enabled: boolean }): Promise<void> {}
  export function setEnabled(_value: boolean) {}
  export function isEnabled(): boolean { return false }
  export async function updateIdentity(_token: string | null, _accountId?: string): Promise<void> {}
  export function track(_event: string, _properties?: Record<string, unknown>) {}
  export function trackCliStart() {}
  export function flushInBackground() {}
  export function trackCliExit(_exitCode?: number) {}
  export function trackSessionStart(_sessionId: string, _model?: string, _provider?: string) {}
  export function trackSessionEnd(_sessionId: string, _stats?: Record<string, unknown>) {}
  export function trackSessionMessage(_sessionId: string, _source: "user" | "assistant") {}
  export function trackLlmCompletion(_properties: Record<string, unknown>) {}
  export function trackCommandUsed(_command: string) {}
  export function trackToolUsed(_tool: string, _sessionId?: string) {}
  export function trackAgentUsed(_agent: string, _sessionId?: string) {}
  export function trackPlanFollowup(_sessionId: string, _choice: string) {}
  export function trackSuggestionAccepted(_properties: Record<string, unknown>) {}
  export function trackSuggestionShown(_properties: Record<string, unknown>) {}
  export function trackIndexingStarted(_properties: Record<string, unknown>) {}
  export function trackIndexingCompleted(_properties: Record<string, unknown>) {}
  export function trackIndexingFileCount(_properties: Record<string, unknown>) {}
  export function trackIndexingBatchRetry(_properties: Record<string, unknown>) {}
  export function trackIndexingError(_properties: Record<string, unknown>) {}
  export function trackShareCreated(_sessionId: string) {}
  export function trackShareDeleted(_sessionId: string) {}
  export function trackMcpServerConnected(_server: string) {}
  export function trackMcpServerError(_server: string, _error?: string) {}
  export function trackRemoteConnectionOpened() {}
  export function trackAuthSuccess(_provider: string) {}
  export function trackAuthLogout(_provider: string) {}
  export function trackError(_error: string, _context?: string) {}
  export function trackFeedback(_props: Record<string, unknown>) {}
  export async function shutdown(_timeoutMs?: number): Promise<void> {}
}

export enum TelemetryEventName {
  CLI_START = "cli.start",
  CLI_EXIT = "cli.exit",
  SESSION_START = "session.start",
  SESSION_END = "session.end",
  SESSION_MESSAGE = "session.message",
  LLM_COMPLETION = "llm.completion",
  COMMAND_USED = "command.used",
  TOOL_USED = "tool.used",
  AGENT_USED = "agent.used",
  PLAN_FOLLOWUP = "plan.followup",
  SUGGESTION_ACCEPTED = "suggestion.accepted",
  SUGGESTION_SHOWN = "suggestion.shown",
  INDEXING_STARTED = "indexing.started",
  INDEXING_COMPLETED = "indexing.completed",
  INDEXING_FILE_COUNT = "indexing.file_count",
  INDEXING_BATCH_RETRY = "indexing.batch_retry",
  INDEXING_ERROR = "indexing.error",
  SHARE_CREATED = "share.created",
  SHARE_DELETED = "share.deleted",
  MCP_SERVER_CONNECTED = "mcp.server.connected",
  MCP_SERVER_ERROR = "mcp.server.error",
  REMOTE_CONNECTION_OPENED = "remote.connection.opened",
  AUTH_SUCCESS = "auth.success",
  AUTH_LOGOUT = "auth.logout",
  ERROR = "error",
  FEEDBACK_SUBMITTED = "feedback.submitted",
}

export namespace Identity {
  export function setDataPath(_dataPath: string) {}
  export async function getMachineId(): Promise<string> { return "anonymous" }
  export function getDistinctId(): string { return "anonymous" }
  export function getOrganizationId(): string | undefined { return undefined }
  export function getUserId(): string | undefined { return undefined }
  export async function updateFromKiloAuth(_token: string | null, _accountId?: string): Promise<void> {}
}

export type ReviewCommand = "review"
export type TelemetryProperties = Record<string, unknown>
