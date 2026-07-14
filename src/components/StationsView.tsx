import { newPlatform, newStation } from '../lib/model'
import { useReorder } from '../lib/useReorder'
import { DeleteButton } from './DeleteButton'
import { ReorderHandle } from './ReorderHandle'
import { ItemSelect } from './ItemSelect'
import type { Platform, PlatformType, Station, Update, World } from '../lib/types'

interface Props {
  world: World
  collapsed: Record<string, boolean>
  update: Update
}

export function StationsView({ world, collapsed, update }: Props) {
  const withStation = (id: string, fn: (st: Station, w: World) => void) =>
    update((s) => {
      const w = s.worlds[s.active]
      const st = w.stations.find((x) => x.id === id)
      if (st) fn(st, w)
    })
  const withPlatform = (id: string, i: number, fn: (p: Platform) => void) =>
    withStation(id, (st) => {
      const p = st.platforms[i]
      if (p) fn(p)
    })

  const { handleProps, cardProps, overId, draggingId, moveProps } = useReorder(
    world.stations.map((x) => x.id),
    (fromId, toId) =>
    update((s) => {
      const arr = s.worlds[s.active].stations
      const from = arr.findIndex((x) => x.id === fromId)
      const to = arr.findIndex((x) => x.id === toId)
      if (from > -1 && to > -1 && from !== to) arr.splice(to, 0, arr.splice(from, 1)[0])
    }),
  )

  const removeStation = (id: string) =>
    update((s) => {
      const w = s.worlds[s.active]
      w.stations = w.stations.filter((x) => x.id !== id)
    })

  return (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 10,
          marginBottom: 14,
          flexWrap: 'wrap',
        }}
      >
        <span className="label">
          Platform N serves car position N of any docked train · drag ⠿ or ↑↓ to reorder
        </span>
        <span style={{ display: 'flex', gap: 6 }}>
          <button
            className="btn small"
            onClick={() => update((s) => s.worlds[s.active].stations.forEach((x) => (s.collapsed[x.id] = true)))}
          >
            Collapse all
          </button>
          <button
            className="btn small"
            onClick={() => update((s) => s.worlds[s.active].stations.forEach((x) => delete s.collapsed[x.id]))}
          >
            Expand all
          </button>
          <button
            className="btn primary"
            onClick={() =>
              update((s) => void s.worlds[s.active].stations.push(newStation(s.worlds[s.active].stations.length + 1)))
            }
          >
            + Add train station
          </button>
        </span>
      </div>

      {!world.stations.length && <div className="empty">No train stations yet.</div>}

      {world.stations.map((st) => {
        const closed = !!collapsed[st.id]
        const nLoad = st.platforms.filter((p) => p.type !== 'empty' && p.mode === 'load').length
        const nUnload = st.platforms.filter((p) => p.type !== 'empty' && p.mode === 'unload').length
        return (
          <div
            key={st.id}
            className={`card ${overId === st.id ? 'dragover' : ''} ${draggingId === st.id ? 'dragging' : ''}`}
            data-kind="station"
            {...cardProps(st.id)}
          >
            <div className="cardhead">
              <ReorderHandle handle={handleProps(st.id)} move={moveProps(st.id)} />
              <button
                className={`chev ${closed ? 'closed' : ''}`}
                title={closed ? 'Expand' : 'Collapse'}
                onClick={() =>
                  update((s) => {
                    if (s.collapsed[st.id]) delete s.collapsed[st.id]
                    else s.collapsed[st.id] = true
                  })
                }
              >
                ▼
              </button>
              <input
                type="text"
                className="name"
                defaultValue={st.name}
                onBlur={(e) => {
                  const v = e.target.value.trim()
                  withStation(st.id, (x) => (x.name = v || x.name))
                }}
              />
              <span className="spacer" />
              <span className="label">
                {st.platforms.length} platforms · {nLoad} load · {nUnload} unload
              </span>
              {!closed && (
                <button
                  className="btn small"
                  onClick={() => withStation(st.id, (x) => x.platforms.push(newPlatform()))}
                >
                  + Platform
                </button>
              )}
              <DeleteButton title={`Delete ${st.name}`} onConfirm={() => removeStation(st.id)} />
            </div>

            {!closed && (
              <div className="plats">
                {!st.platforms.length && <div className="empty">No platforms.</div>}
                {st.platforms.map((p, i) => (
                  <PlatformRow
                    key={i}
                    p={p}
                    i={i}
                    stationId={st.id}
                    custom={world.customItems}
                    withStation={withStation}
                    withPlatform={withPlatform}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}

function PlatformRow({
  p,
  i,
  stationId,
  custom,
  withStation,
  withPlatform,
}: {
  p: Platform
  i: number
  stationId: string
  custom: string[]
  withStation: (id: string, fn: (st: Station, w: World) => void) => void
  withPlatform: (id: string, i: number, fn: (p: Platform) => void) => void
}) {
  const setType = (type: PlatformType) =>
    withPlatform(stationId, i, (p) => {
      p.type = type
      if (!p.mode) p.mode = 'load'
      if (!(p.items || []).length) p.items = [{ item: '', rate: 60 }]
    })
  const setMode = (mode: 'load' | 'unload') =>
    withPlatform(stationId, i, (p) => {
      p.mode = mode
      if (p.mode === 'load' && !(p.items || []).length) p.items = [{ item: '', rate: 60 }]
    })

  return (
    <div className={`plat ${p.type === 'empty' ? 'empty' : p.mode} ${p.type === 'fluid' ? 'fluid' : ''}`}>
      <span className="pos">PLAT {i + 1}</span>
      <span className="seg">
        <button className={p.type === 'regular' ? 'on regular' : ''} onClick={() => setType('regular')}>
          Regular
        </button>
        <button className={p.type === 'fluid' ? 'on fluid' : ''} onClick={() => setType('fluid')}>
          Fluid
        </button>
        <button className={p.type === 'empty' ? 'on empty' : ''} onClick={() => setType('empty')}>
          Empty
        </button>
      </span>
      {p.type !== 'empty' && (
        <span className="seg">
          <button className={p.mode === 'load' ? 'on load' : ''} onClick={() => setMode('load')}>
            Load
          </button>
          <button className={p.mode === 'unload' ? 'on unload' : ''} onClick={() => setMode('unload')}>
            Unload
          </button>
        </span>
      )}

      {p.type === 'empty' ? (
        <span className="dimtxt">placeholder, exchanges no cargo</span>
      ) : p.mode === 'unload' ? (
        <span className="dimtxt">
          receives {p.type === 'fluid' ? 'a fluid' : 'solids'} that docked trains drop here
        </span>
      ) : p.type === 'fluid' ? (
        <div className="platitems">
          <div className="platitem">
            <ItemSelect
              kind="fluid"
              value={(p.items[0] || { item: '' }).item}
              onChange={(v) =>
                withPlatform(stationId, i, (p) => {
                  if (!p.items[0]) p.items[0] = { item: '', rate: 60 }
                  p.items[0].item = v.trim()
                })
              }
            />
            <input
              type="number"
              min={0}
              step="any"
              value={(p.items[0] || { rate: 0 }).rate}
              onChange={(e) =>
                withPlatform(stationId, i, (p) => {
                  if (!p.items[0]) p.items[0] = { item: '', rate: 0 }
                  p.items[0].rate = Math.max(0, +e.target.value || 0)
                })
              }
            />
            <span className="dimtxt mono">m³/min</span>
          </div>
        </div>
      ) : (
        <div className="platitems">
          {(p.items || []).map((pi, j) => (
            <div className="platitem" key={j}>
              <ItemSelect
                kind="solid"
                custom={custom}
                value={pi.item}
                onChange={(v) =>
                  withPlatform(stationId, i, (p) => {
                    if (!p.items[j]) p.items[j] = { item: '', rate: 60 }
                    p.items[j].item = v.trim()
                  })
                }
              />
              <input
                type="number"
                min={0}
                step="any"
                value={pi.rate}
                onChange={(e) =>
                  withPlatform(stationId, i, (p) => {
                    if (!p.items[j]) p.items[j] = { item: '', rate: 0 }
                    p.items[j].rate = Math.max(0, +e.target.value || 0)
                  })
                }
              />
              <span className="dimtxt mono">/min</span>
              <button
                className="btn small ghost"
                title="Remove item"
                onClick={() => withPlatform(stationId, i, (p) => p.items.splice(j, 1))}
              >
                ✕
              </button>
            </div>
          ))}
          <button
            className="btn small"
            onClick={() => withPlatform(stationId, i, (p) => p.items.push({ item: '', rate: 60 }))}
          >
            + Item
          </button>
        </div>
      )}

      <button
        className="btn small ghost"
        title="Remove platform"
        onClick={() => withStation(stationId, (st) => st.platforms.splice(i, 1))}
      >
        ✕
      </button>
    </div>
  )
}
