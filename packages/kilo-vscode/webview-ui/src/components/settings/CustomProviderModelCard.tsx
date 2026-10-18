import { Collapsible } from "@kilocode/kilo-ui/collapsible"
import { IconButton } from "@kilocode/kilo-ui/icon-button"
import { TextField } from "@kilocode/kilo-ui/text-field"
import { Show, createEffect, createSignal } from "solid-js"
import { useLanguage } from "../../context/language"

export type Translator = ReturnType<typeof useLanguage>["t"]

// undefined = not set; true/false = enable_thinking value
export type EnableThinkingValue = undefined | boolean
export type ThinkingTypeValue = undefined | "enabled" | "disabled" | "adaptive"
export type SplitReasoningValue = undefined | boolean
export type ReasoningEffortValue = undefined | "none" | "minimal" | "low" | "medium" | "high" | "xhigh"
export type OutputEffortValue = undefined | "low" | "medium" | "high" | "xhigh" | "max"
export type ChatTemplateArgsValue = undefined | boolean
export type Modality = "text" | "audio" | "image" | "video" | "pdf"

export type Modalities = {
  input?: Modality[]
  output?: Modality[]
}

export type VariantEntry = {
  name: string
  raw?: Record<string, unknown>
  enableThinking: EnableThinkingValue
  thinking: ThinkingTypeValue
  splitReasoning: SplitReasoningValue
  reasoningEffort: ReasoningEffortValue
  outputEffort: OutputEffortValue
  chatTemplateArgs: ChatTemplateArgsValue
}

export type ModelEntry = {
  id: string
  name: string
  reasoning: boolean
  supportsImages: boolean
  modalities: Modalities
  variants: VariantEntry[]
  context: string
  outputLimit: string
  costInput: string
  costOutput: string
  costCacheRead: string
  costCacheWrite: string
}

type ModelCardProps = {
  m: ModelEntry
  errors: {
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
  t: Translator
  canRemove: boolean
  onChangeId: (val: string) => void
  onChangeName: (val: string) => void
  onChangeReasoning: (val: boolean) => void
  onChangeSupportsImages: (val: boolean) => void
  onChangeContext: (val: string) => void
  onChangeOutputLimit: (val: string) => void
  onChangeCostInput: (val: string) => void
  onChangeCostOutput: (val: string) => void
  onChangeCostCacheRead: (val: string) => void
  onChangeCostCacheWrite: (val: string) => void
  onRemove: () => void
}

export function ModelCard(props: ModelCardProps) {
  const issue = () => props.errors.variants?.find((error) => error.name)?.name

  const hasValues = () =>
    props.m.context !== "" ||
    props.m.outputLimit !== "" ||
    props.m.costInput !== "" ||
    props.m.costOutput !== "" ||
    props.m.costCacheRead !== "" ||
    props.m.costCacheWrite !== ""

  const [open, setOpen] = createSignal(hasValues())

  // Reveal the section when validation flags a field inside it, so the error isn't hidden.
  createEffect(() => {
    const hasError =
      !!props.errors.context ||
      !!props.errors.outputLimit ||
      !!props.errors.costInput ||
      !!props.errors.costOutput ||
      !!props.errors.costCacheRead ||
      !!props.errors.costCacheWrite
    if (hasError) setOpen(true)
  })

  return (
    <div
      style={{
        display: "flex",
        "flex-direction": "column",
        gap: "8px",
        padding: "8px",
        border: "1px solid var(--border-weak-base, var(--vscode-panel-border))",
        "border-radius": "6px",
      }}
    >
      {/* Model id + name + remove */}
      <div style={{ display: "flex", gap: "8px", "align-items": "flex-end" }}>
        <div style={{ flex: 1 }}>
          <TextField
            label={props.t("provider.custom.models.id.label")}
            placeholder={props.t("provider.custom.models.id.placeholder")}
            value={props.m.id}
            onChange={props.onChangeId}
            validationState={props.errors.id ? "invalid" : undefined}
            error={props.errors.id}
          />
        </div>
        <div style={{ flex: 1 }}>
          <TextField
            label={props.t("provider.custom.models.name.label")}
            placeholder={props.t("provider.custom.models.name.placeholder")}
            value={props.m.name}
            onChange={props.onChangeName}
            validationState={props.errors.name ? "invalid" : undefined}
            error={props.errors.name}
          />
        </div>
        <IconButton
          type="button"
          icon="trash"
          variant="ghost"
          onClick={props.onRemove}
          disabled={!props.canRemove}
          aria-label={props.t("provider.custom.models.remove")}
          style={{ "margin-bottom": "4px" }}
        />
      </div>

      {/* Reasoning and Image toggles */}
      <div style={{ display: "flex", gap: "16px", "align-items": "center", "flex-wrap": "wrap" }}>
        <label
          style={{
            display: "flex",
            "align-items": "center",
            gap: "8px",
            cursor: "pointer",
            "font-size": "var(--kilo-font-size-13)",
            color: "var(--vscode-foreground)",
          }}
        >
          <input
            type="checkbox"
            checked={props.m.reasoning}
            onChange={(e) => props.onChangeReasoning(e.currentTarget.checked)}
          />
          {props.t("provider.custom.models.reasoning.label")}
        </label>

        <label
          style={{
            display: "flex",
            "align-items": "center",
            gap: "8px",
            cursor: "pointer",
            "font-size": "var(--kilo-font-size-13)",
            color: "var(--vscode-foreground)",
          }}
        >
          <input
            type="checkbox"
            checked={props.m.supportsImages}
            onChange={(e) => props.onChangeSupportsImages(e.currentTarget.checked)}
          />
          {props.t("provider.custom.models.modalities.image")}
        </label>
      </div>

      {/* Limits & costs — collapsed by default to save space */}
      <Collapsible variant="ghost" open={open()} onOpenChange={setOpen}>
        <Collapsible.Trigger>
          <span
            style={{
              "font-size": "var(--kilo-font-size-12)",
              "font-weight": "500",
              color: "var(--text-weak-base)",
            }}
          >
            {props.t("provider.custom.models.limitsCosts.label")}
          </span>
          <Collapsible.Arrow />
        </Collapsible.Trigger>
        <Collapsible.Content>
          <div style={{ display: "flex", "flex-direction": "column", gap: "8px", "padding-top": "8px" }}>
            <div style={{ display: "flex", gap: "8px", "flex-wrap": "wrap" }}>
              <div style={{ flex: 1, "min-width": "100px" }}>
                <TextField
                  type="number"
                  min="1"
                  step="1"
                  label={props.t("provider.custom.models.limit.context")}
                  placeholder="262144"
                  value={props.m.context}
                  onChange={props.onChangeContext}
                  validationState={props.errors.context ? "invalid" : undefined}
                  error={props.errors.context}
                />
              </div>
              <div style={{ flex: 1, "min-width": "100px" }}>
                <TextField
                  type="number"
                  min="1"
                  step="1"
                  label={props.t("provider.custom.models.limit.output")}
                  placeholder="8192"
                  value={props.m.outputLimit}
                  onChange={props.onChangeOutputLimit}
                  validationState={props.errors.outputLimit ? "invalid" : undefined}
                  error={props.errors.outputLimit}
                />
              </div>
              <div style={{ flex: 1, "min-width": "100px" }}>
                <TextField
                  type="number"
                  min="0"
                  step="any"
                  label={props.t("provider.custom.models.cost.input")}
                  placeholder="2.0"
                  value={props.m.costInput}
                  onChange={props.onChangeCostInput}
                  validationState={props.errors.costInput ? "invalid" : undefined}
                  error={props.errors.costInput}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px", "flex-wrap": "wrap" }}>
              <div style={{ flex: 1, "min-width": "100px" }}>
                <TextField
                  type="number"
                  min="0"
                  step="any"
                  label={props.t("provider.custom.models.cost.output")}
                  placeholder="10.0"
                  value={props.m.costOutput}
                  onChange={props.onChangeCostOutput}
                  validationState={props.errors.costOutput ? "invalid" : undefined}
                  error={props.errors.costOutput}
                />
              </div>
              <div style={{ flex: 1, "min-width": "100px" }}>
                <TextField
                  type="number"
                  min="0"
                  step="any"
                  label={props.t("provider.custom.models.cost.cacheRead")}
                  placeholder="0.1"
                  value={props.m.costCacheRead}
                  onChange={props.onChangeCostCacheRead}
                  validationState={props.errors.costCacheRead ? "invalid" : undefined}
                  error={props.errors.costCacheRead}
                />
              </div>
              <div style={{ flex: 1, "min-width": "100px" }}>
                <TextField
                  type="number"
                  min="0"
                  step="any"
                  label={props.t("provider.custom.models.cost.cacheWrite")}
                  placeholder="2.5"
                  value={props.m.costCacheWrite}
                  onChange={props.onChangeCostCacheWrite}
                  validationState={props.errors.costCacheWrite ? "invalid" : undefined}
                  error={props.errors.costCacheWrite}
                />
              </div>
            </div>
          </div>
        </Collapsible.Content>
      </Collapsible>

      <Show when={issue()}>
        {(error) => (
          <span
            role="alert"
            style={{ "font-size": "var(--kilo-font-size-12)", color: "var(--vscode-errorForeground)" }}
          >
            {error()}
          </span>
        )}
      </Show>
    </div>
  )
}
