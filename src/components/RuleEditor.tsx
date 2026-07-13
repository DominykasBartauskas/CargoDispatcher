import { ItemSelect } from './ItemSelect'
import type { RuleMode, Train, Update } from '../lib/types'

interface Props {
  train: Train
  stopIdx: number
  kind: 'load' | 'unload'
  update: Update
}

/** Load/unload rule editor shown inside each route stop. */
export function RuleEditor({ train, stopIdx, kind, update }: Props) {
  const rule = train.stops[stopIdx][kind]

  const withRule = (fn: (r: { mode: RuleMode; items: string[] }) => void) =>
    update((s) => {
      const w = s.worlds[s.active]
      const t = w.trains.find((t) => t.id === train.id)
      if (t) fn(t.stops[stopIdx][kind])
    })

  return (
    <div className="rulewrap">
      <select
        value={rule.mode}
        onChange={(e) => withRule((r) => (r.mode = e.target.value as RuleMode))}
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
