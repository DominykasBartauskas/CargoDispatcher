import { ItemSelect } from './ItemSelect'
import type { Rule } from '../lib/types'

interface Props {
  rule: Rule
  kind: 'load' | 'unload'
  /** Mutate this rule in place; the caller re-renders. */
  withRule: (fn: (r: Rule) => void) => void
  /** Which catalog slice the "+ add item" picker offers (default: all). */
  itemKind?: 'all' | 'solid' | 'fluid'
  /** The active world's user-defined items (the "Other" group). */
  custom?: string[]
}

/** Load/unload rule editor shown inside each route stop (trains and trucks). */
export function RuleEditor({ rule, kind, withRule, itemKind = 'all', custom }: Props) {
  return (
    <div className="rulewrap">
      <select
        value={rule.mode}
        onChange={(e) => withRule((r) => (r.mode = e.target.value as Rule['mode']))}
      >
        <option value="any">Anything</option>
        <option value="none">None</option>
        <option value="list">Specific items</option>
      </select>
      {rule.mode === 'list' && (
        <>
          {(rule.items || []).map((it, ii) => (
            <span key={ii} className={`chip ${kind}`}>
              {it}
              <button title="Remove" onClick={() => withRule((r) => r.items.splice(ii, 1))}>
                ✕
              </button>
            </span>
          ))}
          <ItemSelect
            value=""
            kind={itemKind}
            custom={custom}
            placeholder="+ add item"
            onChange={(v) => {
              if (!v) return
              withRule((r) => {
                r.items = r.items || []
                if (!r.items.includes(v)) r.items.push(v)
              })
            }}
          />
        </>
      )}
    </div>
  )
}
