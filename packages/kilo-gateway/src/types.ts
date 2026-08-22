// ============================================================================
// Authentication Types
// ============================================================================

export interface DeviceAuthInitiateResponse {
  code: string
  verificationUrl: string
  expiresIn: number
}

export interface DeviceAuthPollResponse {
  status: "pending" | "approved" | "denied" | "expired"
  token?: string
  userEmail?: string
}

export interface Organization {
  id: string
  name: string
  role: string
}

export interface KilocodeProfile {
  email: string
  name?: string
  organizations?: Organization[]
  selectedOrganizationId?: string
  hasPersonalAccount?: boolean
}

export interface KilocodeBalance {
  balance: number
}

export interface KiloPassState {
  currentPeriodBaseCreditsUsd: number
  currentPeriodUsageUsd: number
  currentPeriodBonusCreditsUsd: number
  nextBillingAt?: string | null
}

export interface PollOptions<T> {
  interval: number
  maxAttempts: number
  pollFn: () => Promise<PollResult<T>>
}

export interface PollResult<T> {
  continue: boolean
  data?: T
  error?: Error
}
