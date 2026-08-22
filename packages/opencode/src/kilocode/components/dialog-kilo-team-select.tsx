/**
 * Kilo Gateway Team Selection Dialog
 *
 * Allows switching between organizations and personal account.
 * Marks the current team with "→ (current)" indicator.
 */

import { DialogSelect } from "@tui/ui/dialog-select"

interface Organization {
  id: string
  name: string
  role?: string
}

interface DialogKiloTeamSelectProps {
  organizations: Organization[]
  currentOrgId?: string | null
  hasPersonalAccount?: boolean
  onSelect: (orgId: string | null) => Promise<void>
}

export function DialogKiloTeamSelect(props: DialogKiloTeamSelectProps) {
  const options = props.organizations.map((org) => ({
    value: org.id,
    title: org.name,
    hint: org.id === props.currentOrgId ? "→ (current)" : undefined,
  }))

  return (
    <DialogSelect
      title="Select Team"
      options={options}
      current={props.currentOrgId || null}
      onSelect={async (option: any) => {
        await props.onSelect(option.value)
      }}
    />
  )
}
