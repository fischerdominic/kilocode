import type { CustomProviderPackage } from "../../../../src/shared/provider-model"
import type { Modalities, ModelEntry, VariantEntry } from "./CustomProviderModelCard"

type Translator = (key: string, params?: Record<string, string>) => string

export type HeaderRow = {
  key: string
  value: string
}

export type FormState = {
  providerID: string
  name: string
  npm: CustomProviderPackage
  baseURL: string
  apiKey: string
  models: ModelEntry[]
  headers: HeaderRow[]
  saving: boolean
}

export type ModelFieldErrors = {
  id?: string
  name?: string
  context?: string
  outputLimit?: string
  costInput?: string
  costOutput?: string
  costCacheRead?: string
  costCacheWrite?: string
  variants?: Array<{ name?: string }>
}

export type FormErrors = {
  providerID: string | undefined
  name: string | undefined
  baseURL: string | undefined
  models: ModelFieldErrors[]
  headers: Array<{ key?: string; value?: string }>
}

type ValidateArgs = {
  form: FormState
  t: Translator
  editing: boolean
  disabledProviders: string[]
  existingProviderIDs: Set<string>
  /** Preserved env vars from the existing provider config (edit mode only) */
  existingEnv?: string[]
}

type ValidateResult = {
  errors: FormErrors
  result?: {
    providerID: string
    name: string
    key: string | undefined
    config: {
      npm: CustomProviderPackage
      name: string
      env?: string[]
      options: { baseURL: string; headers?: Record<string, string> }
      models: Record<string, unknown>
    }
  }
}

const PROVIDER_ID = /^[a-z0-9][a-z0-9-_]*$/

function checkVariant(v: VariantEntry, seen: Set<string>, t: Translator) {
  const n = v.name.trim()
  const path = `variants[${JSON.stringify(v.name)}]`
  if (!n) return { name: `${path}: ${t("provider.custom.error.required")}` }
  if (seen.has(n)) return { name: `${path}: ${t("provider.custom.error.duplicate")}` }
  seen.add(n)
  return { name: undefined }
}

function parseAmount(raw: string): number | undefined {
  const trimmed = raw.trim()
  if (!trimmed) return undefined
  const num = Number(trimmed)
  return Number.isFinite(num) ? num : undefined
}

function validPositive(raw: string, num: number | undefined): boolean {
  return raw !== "" && num !== undefined && num > 0
}

function validNonNegative(raw: string, num: number | undefined): boolean {
  return raw !== "" && num !== undefined && num >= 0
}

function checkLimit(m: ModelEntry, t: Translator) {
  const contextRaw = m.context.trim()
  const outputRaw = m.outputLimit.trim()
  const context = parseAmount(contextRaw)
  const output = parseAmount(outputRaw)
  const okContext = validPositive(contextRaw, context)
  const okOutput = validPositive(outputRaw, output)
  const invalid = t("provider.custom.models.number.invalid")
  const required = t("provider.custom.models.limit.outputRequired")

  const contextErr = contextRaw !== "" ? (okContext ? undefined : invalid) : outputRaw !== "" ? required : undefined
  const outputErr = outputRaw !== "" ? (okOutput ? undefined : invalid) : contextRaw !== "" ? required : undefined

  return {
    context: contextErr,
    outputLimit: outputErr,
    limit: okContext && okOutput ? { context: context as number, output: output as number } : undefined,
  }
}

function checkCost(m: ModelEntry, t: Translator) {
  const inputRaw = m.costInput.trim()
  const outputRaw = m.costOutput.trim()
  const cacheReadRaw = m.costCacheRead.trim()
  const cacheWriteRaw = m.costCacheWrite.trim()
  const input = parseAmount(inputRaw)
  const output = parseAmount(outputRaw)
  const cacheRead = parseAmount(cacheReadRaw)
  const cacheWrite = parseAmount(cacheWriteRaw)
  const okInput = validNonNegative(inputRaw, input)
  const okOutput = validNonNegative(outputRaw, output)
  const okCacheRead = validNonNegative(cacheReadRaw, cacheRead)
  const okCacheWrite = validNonNegative(cacheWriteRaw, cacheWrite)
  const set = inputRaw !== "" || outputRaw !== "" || cacheReadRaw !== "" || cacheWriteRaw !== ""
  const invalid = t("provider.custom.models.number.invalid")
  const required = t("provider.custom.models.cost.required")

  const inputErr = inputRaw !== "" ? (okInput ? undefined : invalid) : set ? required : undefined
  const outputErr = outputRaw !== "" ? (okOutput ? undefined : invalid) : set ? required : undefined
  const cacheReadErr = cacheReadRaw !== "" && !okCacheRead ? invalid : undefined
  const cacheWriteErr = cacheWriteRaw !== "" && !okCacheWrite ? invalid : undefined

  return {
    costInput: inputErr,
    costOutput: outputErr,
    costCacheRead: cacheReadErr,
    costCacheWrite: cacheWriteErr,
    cost:
      set && okInput && okOutput
        ? {
            input: input as number,
            output: output as number,
            ...(okCacheRead ? { cache_read: cacheRead as number } : {}),
            ...(okCacheWrite ? { cache_write: cacheWrite as number } : {}),
          }
        : undefined,
  }
}

export type ModelLimit = { context: number; output: number }
export type ModelCost = { input: number; output: number; cache_read?: number; cache_write?: number }

export type CheckedModel = ModelFieldErrors & {
  limit?: ModelLimit
  cost?: ModelCost
}

function checkModel(m: ModelEntry, seenModels: Set<string>, t: Translator): CheckedModel {
  const id = m.id.trim()
  const key = id.toLowerCase()
  let idErr: string | undefined
  if (!id) idErr = t("provider.custom.error.required")
  else if (seenModels.has(key)) idErr = t("provider.custom.error.duplicate")
  else seenModels.add(key)

  const nameErr = !m.name.trim() ? t("provider.custom.error.required") : undefined
  const seen = new Set<string>()
  const variants = m.reasoning ? m.variants.map((v) => checkVariant(v, seen, t)) : []
  const limit = checkLimit(m, t)
  const cost = checkCost(m, t)
  return {
    id: idErr,
    name: nameErr,
    context: limit.context,
    outputLimit: limit.outputLimit,
    costInput: cost.costInput,
    costOutput: cost.costOutput,
    costCacheRead: cost.costCacheRead,
    costCacheWrite: cost.costCacheWrite,
    variants,
    limit: limit.limit,
    cost: cost.cost,
  }
}

function checkHeader(h: HeaderRow, seenKeys: Set<string>, t: Translator) {
  const key = h.key.trim()
  const value = h.value.trim()
  if (!key && !value) return {}

  let keyErr: string | undefined
  if (!key) keyErr = t("provider.custom.error.required")
  else if (seenKeys.has(key.toLowerCase())) keyErr = t("provider.custom.error.duplicate")
  else seenKeys.add(key.toLowerCase())

  const valueErr = !value ? t("provider.custom.error.required") : undefined
  return { key: keyErr, value: valueErr }
}

function checkProviderID(id: string, editing: boolean, disabled: string[], existing: Set<string>, t: Translator) {
  const idErr = !id
    ? t("provider.custom.error.providerID.required")
    : !PROVIDER_ID.test(id)
      ? t("provider.custom.error.providerID.format")
      : undefined
  const existsErr =
    idErr || editing || !existing.has(id) || disabled.includes(id)
      ? undefined
      : t("provider.custom.error.providerID.exists")
  return { idErr, existsErr }
}

function serializeVariant(v: VariantEntry): [string, Record<string, unknown>] {
  if (v.raw) return [v.name.trim(), v.raw]
  const cfg: Record<string, unknown> = {}
  if (v.enableThinking !== undefined) cfg.enable_thinking = v.enableThinking
  if (v.thinking !== undefined) cfg.thinking = { type: v.thinking }
  if (v.splitReasoning !== undefined) cfg.reasoning_split = v.splitReasoning
  if (v.reasoningEffort !== undefined) cfg.reasoningEffort = v.reasoningEffort
  if (v.outputEffort !== undefined) cfg.effort = v.outputEffort
  if (v.chatTemplateArgs !== undefined) cfg.chat_template_args = { enable_thinking: v.chatTemplateArgs }
  return [v.name.trim(), cfg]
}

function modalities(m: ModelEntry): Modalities | undefined {
  const input = new Set(m.modalities.input ?? [])
  const existing = input.size > 0 || (m.modalities.output?.length ?? 0) > 0
  if (!existing && !m.supportsImages) return

  const image = input.has("image")
  const changed = image !== m.supportsImages
  if (m.supportsImages && !image) {
    input.add("text")
    input.add("image")
  }
  if (!m.supportsImages) input.delete("image")

  const include = input.size > 0 || (m.modalities.input !== undefined && !changed)
  if (!include && !m.modalities.output?.length) return

  return {
    ...(include ? { input: [...input] } : {}),
    ...(m.modalities.output?.length ? { output: m.modalities.output } : {}),
  }
}

function serializeModel(m: ModelEntry, checked: CheckedModel): [string, Record<string, unknown>] {
  const ventries = m.reasoning ? m.variants.filter((v) => v.name.trim()).map(serializeVariant) : []
  const entry: Record<string, unknown> = { name: m.name.trim() }
  const modes = modalities(m)
  if (m.reasoning) entry.reasoning = true
  if (modes) entry.modalities = modes
  if (checked.limit) entry.limit = checked.limit
  if (checked.cost) entry.cost = checked.cost
  if (ventries.length > 0) entry.variants = Object.fromEntries(ventries)
  return [m.id.trim(), entry]
}

function resolveEnv(rawEnv: string | undefined, savedEnv: string[] | undefined) {
  if (rawEnv) return { env: [rawEnv] }
  if (savedEnv) return { env: savedEnv }
  return {}
}

export function validateCustomProvider(input: ValidateArgs): ValidateResult {
  const providerID = input.form.providerID.trim()
  const name = input.form.name.trim()
  const baseURL = input.form.baseURL.trim()
  const apiKey = input.form.apiKey.trim()

  const rawEnv = apiKey.match(/^\{env:([^}]+)\}$/)?.[1]?.trim()
  // When editing and apiKey is empty, preserve existing env from the original config
  const savedEnv = input.editing && !apiKey ? input.existingEnv : undefined
  const key = apiKey && !rawEnv ? apiKey : undefined

  const { idErr, existsErr } = checkProviderID(
    providerID,
    input.editing,
    input.disabledProviders,
    input.existingProviderIDs,
    input.t,
  )

  const nameError = !name ? input.t("provider.custom.error.name.required") : undefined
  const urlError = !baseURL
    ? input.t("provider.custom.error.baseURL.required")
    : !/^https?:\/\//.test(baseURL)
      ? input.t("provider.custom.error.baseURL.format")
      : undefined

  const seenModels = new Set<string>()
  const modelErrors = input.form.models.map((m) => checkModel(m, seenModels, input.t))
  const modelsValid = modelErrors.every(
    (m) =>
      !m.id &&
      !m.name &&
      !m.context &&
      !m.outputLimit &&
      !m.costInput &&
      !m.costOutput &&
      !m.costCacheRead &&
      !m.costCacheWrite &&
      (m.variants ?? []).every((v) => !v.name),
  )

  const seenHeaders = new Set<string>()
  const headerErrors = input.form.headers.map((h) => checkHeader(h, seenHeaders, input.t))
  const headersValid = headerErrors.every((h) => !h.key && !h.value)

  const errors: FormErrors = {
    providerID: idErr ?? existsErr,
    name: nameError,
    baseURL: urlError,
    models: modelErrors,
    headers: headerErrors,
  }

  const ok = !idErr && !existsErr && !nameError && !urlError && modelsValid && headersValid
  if (!ok) return { errors }

  const headers = Object.fromEntries(
    input.form.headers
      .map((h) => ({ key: h.key.trim(), value: h.value.trim() }))
      .filter((h) => !!h.key && !!h.value)
      .map((h) => [h.key, h.value]),
  )

  const options = {
    baseURL,
    ...(Object.keys(headers).length ? { headers } : {}),
  }

  return {
    errors,
    result: {
      providerID,
      name,
      key,
      config: {
        npm: input.form.npm,
        name,
        ...resolveEnv(rawEnv, savedEnv),
        options,
        models: Object.fromEntries(input.form.models.map((m, i) => serializeModel(m, modelErrors[i] ?? {}))),
      },
    },
  }
}
