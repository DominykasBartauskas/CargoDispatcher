import { newDronePort } from '../lib/model'
import { useReorder } from '../lib/useReorder'
import { DeleteButton } from './DeleteButton'
import { ReorderHandle } from './ReorderHandle'
import { ItemSelect } from './ItemSelect'
import type { DronePort, Update, World } from '../lib/types'

interface Props {
  world: World
  collapsed: Record<string, boolean>
  update: Update
}

export function DronePortsView({ world, collapsed, update }: Props) {
  const withPort = (id: string, fn: (p: DronePort) => void) =>
    update((s) => {
      const p = s.worlds[s.active].dronePorts.find((x) => x.id === id)
      if (p) fn(p)
    })

  const { handleProps, cardProps, overId, draggingId, moveProps } = useReorder(
    world.dronePorts.map((x) => x.id),
    (fromId, toId) =>
    update((s) => {
      const arr = s.worlds[s.active].dronePorts
      const from = arr.findIndex((x) => x.id === fromId)
      const to = arr.findIndex((x) => x.id === toId)
      if (from > -1 && to > -1 && from !== to) arr.splice(to, 0, arr.splice(from, 1)[0])
    }),
  )

  const removePort = (id: string) =>
    update((s) => {
      const w = s.worlds[s.active]
      w.dronePorts = w.dronePorts.filter((x) => x.id !== id)
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
          List what each port sends out · a linked drone flies it to the paired port · drag ⠿ or ↑↓ to reorder
        </span>
        <span style={{ display: 'flex', gap: 6 }}>
          <button
            className="btn small"
            onClick={() => update((s) => s.worlds[s.active].dronePorts.forEach((x) => (s.collapsed[x.id] = true)))}
          >
            Collapse all
          </button>
          <button
            className="btn small"
            onClick={() => update((s) => s.worlds[s.active].dronePorts.forEach((x) => delete s.collapsed[x.id]))}
          >
            Expand all
          </button>
          <button
            className="btn primary"
            onClick={() =>
              update((s) =>
                void s.worlds[s.active].dronePorts.push(newDronePort(s.worlds[s.active].dronePorts.length + 1)),
              )
            }
          >
            + Add drone port
          </button>
        </span>
      </div>

      {!world.dronePorts.length && <div className="empty">No drone ports yet.</div>}

      {world.dronePorts.map((p) => {
        const closed = !!collapsed[p.id]
        const nItems = (p.items || []).filter((x) => x.item).length
        return (
          <div
            key={p.id}
            className={`card ${overId === p.id ? 'dragover' : ''} ${draggingId === p.id ? 'dragging' : ''}`}
            data-kind="droneport"
            {...cardProps(p.id)}
          >
            <div className="cardhead">
              <ReorderHandle handle={handleProps(p.id)} move={moveProps(p.id)} />
              <button
                className={`chev ${closed ? 'closed' : ''}`}
                title={closed ? 'Expand' : 'Collapse'}
                onClick={() =>
                  update((s) => {
                    if (s.collapsed[p.id]) delete s.collapsed[p.id]
                    else s.collapsed[p.id] = true
                  })
                }
              >
                ▼
              </button>
              <input
                type="text"
                className="name"
                defaultValue={p.name}
                onBlur={(e) => {
                  const v = e.target.value.trim()
                  withPort(p.id, (x) => (x.name = v || x.name))
                }}
              />
              <span className="spacer" />
              <span className="label">
                sends {nItems} item{nItems === 1 ? '' : 's'}
              </span>
              <DeleteButton title={`Delete ${p.name}`} onConfirm={() => removePort(p.id)} />
            </div>

            {!closed && (
              <div className="plats">
                <div className="plat load">
                  <span className="pos">SENDS</span>
                  <div className="platitems">
                    {(p.items || []).map((pi, j) => (
                      <div className="platitem" key={j}>
                        <ItemSelect
                          kind="solid"
                          value={pi.item}
                          onChange={(v) =>
                            withPort(p.id, (x) => {
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
                            withPort(p.id, (x) => {
                              if (!x.items[j]) x.items[j] = { item: '', rate: 0 }
                              x.items[j].rate = Math.max(0, +e.target.value || 0)
                            })
                          }
                        />
                        <span className="dimtxt mono">/min</span>
                        <button
                          className="btn small ghost"
                          title="Remove item"
                          onClick={() => withPort(p.id, (x) => x.items.splice(j, 1))}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <button
                      className="btn small"
                      onClick={() => withPort(p.id, (x) => x.items.push({ item: '', rate: 60 }))}
                    >
                      + Item
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}
