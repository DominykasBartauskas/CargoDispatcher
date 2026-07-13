import { newDrone } from '../lib/model'
import { useReorder } from '../lib/useReorder'
import { DeleteButton } from './DeleteButton'
import { ReorderHandle } from './ReorderHandle'
import type { Drone, Update, World } from '../lib/types'

interface Props {
  world: World
  collapsed: Record<string, boolean>
  update: Update
}

export function DronesView({ world, collapsed, update }: Props) {
  const withDrone = (id: string, fn: (d: Drone) => void) =>
    update((s) => {
      const d = s.worlds[s.active].drones.find((x) => x.id === id)
      if (d) fn(d)
    })

  const { handleProps, cardProps, overId, draggingId, moveProps } = useReorder(
    world.drones.map((x) => x.id),
    (fromId, toId) =>
    update((s) => {
      const arr = s.worlds[s.active].drones
      const from = arr.findIndex((x) => x.id === fromId)
      const to = arr.findIndex((x) => x.id === toId)
      if (from > -1 && to > -1 && from !== to) arr.splice(to, 0, arr.splice(from, 1)[0])
    }),
  )

  const removeDrone = (id: string) =>
    update((s) => {
      const w = s.worlds[s.active]
      w.drones = w.drones.filter((x) => x.id !== id)
    })

  const ports = world.dronePorts

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
          Each drone links a home port to one destination and shuttles cargo both ways · drag ⠿ or ↑↓ to reorder
        </span>
        <span style={{ display: 'flex', gap: 6 }}>
          <button
            className="btn small"
            onClick={() => update((s) => s.worlds[s.active].drones.forEach((x) => (s.collapsed[x.id] = true)))}
          >
            Collapse all
          </button>
          <button
            className="btn small"
            onClick={() => update((s) => s.worlds[s.active].drones.forEach((x) => delete s.collapsed[x.id]))}
          >
            Expand all
          </button>
          <button
            className="btn primary"
            onClick={() => update((s) => void s.worlds[s.active].drones.push(newDrone(s.worlds[s.active].drones.length + 1)))}
          >
            + Add drone
          </button>
        </span>
      </div>

      {!world.drones.length && (
        <div className="empty">No drones yet. Add one to link two drone ports.</div>
      )}

      {world.drones.map((dr) => {
        const closed = !!collapsed[dr.id]
        return (
          <div
            key={dr.id}
            className={`card ${overId === dr.id ? 'dragover' : ''} ${draggingId === dr.id ? 'dragging' : ''}`}
            data-kind="drone"
            {...cardProps(dr.id)}
          >
            <div className="cardhead">
              <ReorderHandle handle={handleProps(dr.id)} move={moveProps(dr.id)} />
              <button
                className={`chev ${closed ? 'closed' : ''}`}
                title={closed ? 'Expand' : 'Collapse'}
                onClick={() =>
                  update((s) => {
                    if (s.collapsed[dr.id]) delete s.collapsed[dr.id]
                    else s.collapsed[dr.id] = true
                  })
                }
              >
                ▼
              </button>
              <input
                type="text"
                className="name"
                defaultValue={dr.name}
                onBlur={(e) => {
                  const v = e.target.value.trim()
                  withDrone(dr.id, (d) => (d.name = v || d.name))
                }}
              />
              <span className="spacer" />
              <DeleteButton title={`Delete ${dr.name}`} onConfirm={() => removeDrone(dr.id)} />
            </div>

            {!closed && (
              <div className="routeblock">
                <span className="label">Route</span>
                {!ports.length ? (
                  <div className="hint">Add drone ports first, then link this drone's home and destination.</div>
                ) : (
                  <div className="rules" style={{ marginTop: 8 }}>
                    <span className="rlabel load">Home</span>
                    <select
                      value={dr.homeId ?? ''}
                      onChange={(e) => withDrone(dr.id, (d) => (d.homeId = e.target.value || null))}
                    >
                      <option value="">— select port —</option>
                      {ports.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <span className="rlabel unload">Destination</span>
                    <select
                      value={dr.destId ?? ''}
                      onChange={(e) => withDrone(dr.id, (d) => (d.destId = e.target.value || null))}
                    >
                      <option value="">— select port —</option>
                      {ports.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}
