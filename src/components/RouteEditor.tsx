import { newStop } from '../lib/model'
import { RuleEditor } from './RuleEditor'
import type { Stop } from '../lib/types'

interface Props {
  stops: Stop[]
  /** Stations this vehicle can be routed through (train or truck stations). */
  stations: { id: string; name: string }[]
  /** Mutate this vehicle's stops in place; the caller re-renders. */
  withStops: (fn: (stops: Stop[]) => void) => void
  /** Shown when there are no stations to route through yet. */
  emptyHint: string
  /** Catalog slice the rule item pickers offer (default: all). */
  itemKind?: 'all' | 'solid' | 'fluid'
}

/** Shared looped-route / stop builder used by trains and trucks. */
export function RouteEditor({ stops, stations, withStops, emptyHint, itemKind }: Props) {
  if (!stations.length)
    return (
      <div className="routeblock">
        <span className="label">Route</span>
        <div className="hint">{emptyHint}</div>
      </div>
    )

  const move = (si: number, dir: -1 | 1) =>
    withStops((ss) => {
      const j = si + dir
      if (j < 0 || j >= ss.length) return
      ;[ss[si], ss[j]] = [ss[j], ss[si]]
    })

  return (
    <div className="routeblock">
      <div className="routehead">
        <span className="label">
          Route · loop of {stops.length} stop{stops.length === 1 ? '' : 's'}
        </span>
        <span className="spacer" />
        <button
          className="btn small primary"
          onClick={() => withStops((ss) => ss.push(newStop(stations[0] ? stations[0].id : null)))}
        >
          + Add stop
        </button>
      </div>

      {stops.length === 0 && <div className="empty" style={{ padding: '8px 0' }}>No stops yet.</div>}

      {stops.map((stop, si) => (
        <div className="stop" key={si}>
          <div className="stoprow">
            <span className="stopnum">{si + 1}.</span>
            <select
              value={stop.stationId ?? ''}
              onChange={(e) => withStops((ss) => ss[si] && (ss[si].stationId = e.target.value))}
            >
              {stations.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name}
                </option>
              ))}
            </select>
            <span className="spacer" style={{ flex: 1 }} />
            <button className="btn small" disabled={si === 0} onClick={() => move(si, -1)}>
              ↑
            </button>
            <button className="btn small" disabled={si === stops.length - 1} onClick={() => move(si, 1)}>
              ↓
            </button>
            <button className="btn small ghost" onClick={() => withStops((ss) => ss.splice(si, 1))}>
              ✕
            </button>
          </div>
          <div className="rules">
            <span className="rlabel load">Load</span>
            <RuleEditor
              rule={stop.load}
              kind="load"
              itemKind={itemKind}
              withRule={(fn) => withStops((ss) => ss[si] && fn(ss[si].load))}
            />
            <span className="rlabel unload">Unload</span>
            <RuleEditor
              rule={stop.unload}
              kind="unload"
              itemKind={itemKind}
              withRule={(fn) => withStops((ss) => ss[si] && fn(ss[si].unload))}
            />
          </div>
        </div>
      ))}

      {stops.length > 1 && <div className="looparrow">↺ returns to stop 1</div>}
    </div>
  )
}
