import { CUSTOM_GROUP_LABEL, FLUID_GROUP, ITEM_GROUPS, ITEM_SET } from '../lib/catalog'
import type { ItemGroup } from '../lib/catalog'

/** Which slice of the catalog to offer. */
type Kind = 'all' | 'solid' | 'fluid'

interface Props {
  value: string
  onChange: (value: string) => void
  kind?: Kind
  /** Label for the empty option (e.g. "— item —" or "+ add item"). */
  placeholder?: string
  /** The active world's user-defined items (shown as an "Other" group). */
  custom?: string[]
}

/**
 * Grouped item <select>, ported from the legacy itemOptions() helper. If the
 * stored value isn't in the catalog or the world's custom items (older
 * free-text data or edited imports), it's kept as a "(custom)" option so
 * nothing breaks.
 */
export function ItemSelect({ value, onChange, kind = 'all', placeholder = '— item —', custom = [] }: Props) {
  const base =
    kind === 'fluid' ? [FLUID_GROUP] : kind === 'solid' ? ITEM_GROUPS : [...ITEM_GROUPS, FLUID_GROUP]
  /* Custom items are free-text solids, so they join every slice except the
     fluid-only one. parseCustomItems already drops catalog collisions. */
  const otherGroup: ItemGroup | null =
    kind !== 'fluid' && custom.length ? [CUSTOM_GROUP_LABEL, custom] : null
  const groups = otherGroup ? [...base, otherGroup] : base

  const known = ITEM_SET.has(value) || custom.includes(value)

  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {value && !known && <option value={value}>{value} (custom)</option>}
      {groups.map(([label, items]) => (
        <optgroup key={label} label={label}>
          {items.map((i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}
