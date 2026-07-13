import { FLUID_GROUP, ITEM_GROUPS, ITEM_SET } from '../lib/catalog'

/** Which slice of the catalog to offer. */
type Kind = 'all' | 'solid' | 'fluid'

interface Props {
  value: string
  onChange: (value: string) => void
  kind?: Kind
  /** Label for the empty option (e.g. "— item —" or "+ add item"). */
  placeholder?: string
}

/**
 * Grouped item <select>, ported from the legacy itemOptions() helper. If the
 * stored value isn't in the catalog (older free-text data or edited imports),
 * it's kept as a "(custom)" option so nothing breaks.
 */
export function ItemSelect({ value, onChange, kind = 'all', placeholder = '— item —' }: Props) {
  const groups =
    kind === 'fluid' ? [FLUID_GROUP] : kind === 'solid' ? ITEM_GROUPS : [...ITEM_GROUPS, FLUID_GROUP]
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {value && !ITEM_SET.has(value) && <option value={value}>{value} (custom)</option>}
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
