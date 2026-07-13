import { newTruckStation } from '../lib/model'
import { useDialogs } from '../lib/dialogs'
import { useReorder } from '../lib/useReorder'
import { ItemSelect } from './ItemSelect'
import type { TruckStation, TruckStationType, Update, World } from '../lib/types'

interface Props {
  world: World
  collapsed: Record<string, boolean>
  update: Update
}

export function TruckStationsView({ world, collapsed, update }: Props) {
  const dialogs = useDialogs()

  const withStation = (id: string, fn: (st: TruckStation) => void) =>
    update((s) => {
      const st = s.worlds[s.active].truckStations.find((x) => x.id === id)
      if (st) fn(st)
    })

  const { handleProps, cardProps, overId, draggingId } = useReorder((fromId, toId) =>
    update((s) => {
      const arr = s.worlds[s.active].truckStations
      const from = arr.findIndex((x) => x.id === fromId)
      const to = arr.findIndex((x) => x.id === toId)
      if (from > -1 && to > -1 && from !== to) arr.splice(to, 0, arr.splice(from, 1)[0])
    }),
  )

  const deleteStation = async (st: TruckStation) => {
    if (await dialogs.confirm(`Delete ${st.name}?`))
      update((s) => {
        const w = s.worlds[s.active]
        w.truckStations = w.truckStations.filter((x) => x.id !== st.id)
      })
  }

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
          Each truck station is a single dock · a fluid dock carries one fluid · drag ⠿ to reorder
        </span>
        <span style={{ display: 'flex', gap: 6 }}>
          <button
            className="btn small"
            onClick={() =>
              update((s) => s.worlds[s.active].truckStations.forEach((x) => (s.collapsed[x.id] = true)))
            }
          >
            Collapse all
          </button>
          <button
            className="btn small"
            onClick={() => update((s) => s.worlds[s.active].truckStations.forEach((x) => delete s.collapsed[x.id]))}
          >
            Expand all
          </button>
          <button
            className="btn primary"
            onClick={() =>
              update((s) =>
                void s.worlds[s.active].truckStations.push(newTruckStation(s.worlds[s.active].truckStations.length + 1)),
              )
            }
          >
            + Add truck station
          </button>
        </span>
      </div>

      {!world.truckStations.length && <div className="empty">No truck stations yet.</div>}

      {world.truckStations.map((st) => {
        const closed = !!collapsed[st.id]
        return (
          <div
            key={st.id}
            className={`card ${overId === st.id ? 'dragover' : ''} ${draggingId === st.id ? 'dragging' : ''}`}
            data-kind="truckstation"
            {...cardProps(st.id)}
          >
            <div className="cardhead">
              <span className="draghandle" title="Drag to reorder" {...handleProps(st.id)}>
                ⠿
              </span>
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
                {st.type === 'fluid' ? 'Fluid' : 'Regular'} · {st.mode === 'load' ? 'Load' : 'Unload'}
              </span>
              <button className="btn small ghost" onClick={() => deleteStation(st)}>
                ✕
              </button>
            </div>

            {!closed && (
              <div className="plats">
                <DockRow st={st} withStation={withStation} />
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}

function DockRow({
  st,
  withStation,
}: {
  st: TruckStation
  withStation: (id: string, fn: (st: TruckStation) => void) => void
}) {
  const setType = (type: TruckStationType) =>
    withStation(st.id, (x) => {
      x.type = type
      if (!(x.items || []).length) x.items = [{ item: '', rate: 60 }]
    })
  const setMode = (mode: 'load' | 'unload') =>
    withStation(st.id, (x) => {
      x.mode = mode
      if (mode === 'load' && !(x.items || []).length) x.items = [{ item: '', rate: 60 }]
    })

  return (
    <div className={`plat ${st.mode} ${st.type === 'fluid' ? 'fluid' : ''}`}>
      <span className="seg">
        <button className={st.type === 'regular' ? 'on regular' : ''} onClick={() => setType('regular')}>
          Regular
        </button>
        <button className={st.type === 'fluid' ? 'on fluid' : ''} onClick={() => setType('fluid')}>
          Fluid
        </button>
      </span>
      <span className="seg">
        <button className={st.mode === 'load' ? 'on load' : ''} onClick={() => setMode('load')}>
          Load
        </button>
        <button className={st.mode === 'unload' ? 'on unload' : ''} onClick={() => setMode('unload')}>
          Unload
        </button>
      </span>

      {st.mode === 'unload' ? (
        <span className="dimtxt">
          receives {st.type === 'fluid' ? 'a fluid' : 'solids'} that docked trucks drop here
        </span>
      ) : st.type === 'fluid' ? (
        <div className="platitems">
          <div className="platitem">
            <ItemSelect
              kind="fluid"
              value={(st.items[0] || { item: '' }).item}
              onChange={(v) =>
                withStation(st.id, (x) => {
                  if (!x.items[0]) x.items[0] = { item: '', rate: 60 }
                  x.items[0].item = v.trim()
                })
              }
            />
            <input
              type="number"
              min={0}
              step="any"
              value={(st.items[0] || { rate: 0 }).rate}
              onChange={(e) =>
                withStation(st.id, (x) => {
                  if (!x.items[0]) x.items[0] = { item: '', rate: 0 }
                  x.items[0].rate = Math.max(0, +e.target.value || 0)
                })
              }
            />
            <span className="dimtxt mono">m³/min</span>
          </div>
        </div>
      ) : (
        <div className="platitems">
          {(st.items || []).map((pi, j) => (
            <div className="platitem" key={j}>
              <ItemSelect
                kind="solid"
                value={pi.item}
                onChange={(v) =>
                  withStation(st.id, (x) => {
                    if (!x.items[j]) x.items[j] = { item: '', rate: 60 }
                    x.items[j].item = v.trim()
                  })
                }
              />
              <input
                type="number"
                min={0}
                step="any"
                value={pi.rate}
                onChange={(e) =>
                  withStation(st.id, (x) => {
                    if (!x.items[j]) x.items[j] = { item: '', rate: 0 }
                    x.items[j].rate = Math.max(0, +e.target.value || 0)
                  })
                }
              />
              <span className="dimtxt mono">/min</span>
              <button
                className="btn small ghost"
                title="Remove item"
                onClick={() => withStation(st.id, (x) => x.items.splice(j, 1))}
              >
                ✕
              </button>
            </div>
          ))}
          <button
            className="btn small"
            onClick={() => withStation(st.id, (x) => x.items.push({ item: '', rate: 60 }))}
          >
            + Item
          </button>
        </div>
      )}
    </div>
  )
}
