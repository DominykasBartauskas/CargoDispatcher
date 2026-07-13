import { newTruck } from '../lib/model'
import { useDialogs } from '../lib/dialogs'
import { useReorder } from '../lib/useReorder'
import { RouteEditor } from './RouteEditor'
import type { Truck, TruckType, Update, World } from '../lib/types'

const TRUCK_TYPES: { key: TruckType; label: string }[] = [
  { key: 'truck', label: 'Truck' },
  { key: 'fluid-truck', label: 'Fluid Truck' },
  { key: 'tractor', label: 'Tractor' },
  { key: 'explorer', label: 'Explorer' },
]

interface Props {
  world: World
  collapsed: Record<string, boolean>
  update: Update
}

export function TrucksView({ world, collapsed, update }: Props) {
  const dialogs = useDialogs()

  const withTruck = (id: string, fn: (t: Truck, w: World) => void) =>
    update((s) => {
      const w = s.worlds[s.active]
      const t = w.trucks.find((t) => t.id === id)
      if (t) fn(t, w)
    })

  const { handleProps, cardProps, overId, draggingId } = useReorder((fromId, toId) =>
    update((s) => {
      const arr = s.worlds[s.active].trucks
      const from = arr.findIndex((x) => x.id === fromId)
      const to = arr.findIndex((x) => x.id === toId)
      if (from > -1 && to > -1 && from !== to) arr.splice(to, 0, arr.splice(from, 1)[0])
    }),
  )

  const deleteTruck = async (t: Truck) => {
    if (await dialogs.confirm(`Delete ${t.name}?`))
      update((s) => {
        const w = s.worlds[s.active]
        w.trucks = w.trucks.filter((x) => x.id !== t.id)
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
          Pick a vehicle type · fluid trucks carry one fluid, the rest carry solids · drag ⠿ to reorder
        </span>
        <span style={{ display: 'flex', gap: 6 }}>
          <button
            className="btn small"
            onClick={() => update((s) => s.worlds[s.active].trucks.forEach((x) => (s.collapsed[x.id] = true)))}
          >
            Collapse all
          </button>
          <button
            className="btn small"
            onClick={() => update((s) => s.worlds[s.active].trucks.forEach((x) => delete s.collapsed[x.id]))}
          >
            Expand all
          </button>
          <button
            className="btn primary"
            onClick={() => update((s) => void s.worlds[s.active].trucks.push(newTruck(s.worlds[s.active].trucks.length + 1)))}
          >
            + Add truck
          </button>
        </span>
      </div>

      {!world.trucks.length && (
        <div className="empty">No trucks yet. Add one to lay out a road network.</div>
      )}

      {world.trucks.map((tk) => {
        const closed = !!collapsed[tk.id]
        const fluid = tk.type === 'fluid-truck'
        return (
          <div
            key={tk.id}
            className={`card ${overId === tk.id ? 'dragover' : ''} ${draggingId === tk.id ? 'dragging' : ''}`}
            data-kind="truck"
            {...cardProps(tk.id)}
          >
            <div className="cardhead">
              <span className="draghandle" title="Drag to reorder" {...handleProps(tk.id)}>
                ⠿
              </span>
              <button
                className={`chev ${closed ? 'closed' : ''}`}
                title={closed ? 'Expand' : 'Collapse'}
                onClick={() =>
                  update((s) => {
                    if (s.collapsed[tk.id]) delete s.collapsed[tk.id]
                    else s.collapsed[tk.id] = true
                  })
                }
              >
                ▼
              </button>
              <input
                type="text"
                className="name"
                defaultValue={tk.name}
                onBlur={(e) => {
                  const v = e.target.value.trim()
                  withTruck(tk.id, (t) => (t.name = v || t.name))
                }}
              />
              <span className="spacer" />
              <button className="btn small ghost" onClick={() => deleteTruck(tk)}>
                ✕
              </button>
            </div>

            {!closed && (
              <>
                <div className="consist">
                  <span className="seg">
                    {TRUCK_TYPES.map(({ key, label }) => {
                      const on = tk.type === key
                      return (
                        <button
                          key={key}
                          className={on ? `on ${key === 'fluid-truck' ? 'fluid' : 'load'}` : ''}
                          onClick={() => withTruck(tk.id, (t) => (t.type = key))}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </span>
                </div>
                <div className="hint">
                  {fluid
                    ? 'A fluid truck docks fluid truck stations and carries one fluid.'
                    : 'A solid vehicle docks regular truck stations and carries solid items.'}
                </div>
                <RouteEditor
                  stops={tk.stops || []}
                  stations={world.truckStations}
                  withStops={(fn) => withTruck(tk.id, (t) => fn(t.stops))}
                  emptyHint="Add truck stations first, then define this truck's route here."
                  itemKind={fluid ? 'fluid' : 'solid'}
                />
              </>
            )}
          </div>
        )
      })}
    </>
  )
}
