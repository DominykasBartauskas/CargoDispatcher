import { newTrain } from '../lib/model'
import { useReorder } from '../lib/useReorder'
import { DeleteButton } from './DeleteButton'
import { RouteEditor } from './RouteEditor'
import type { CarType, Train, Update, World } from '../lib/types'

const CAR_CLASS: Record<CarType, string> = { E: 'engine', F: 'freight', L: 'fluidcar' }
const CAR_LABEL: Record<CarType, string> = { E: 'Engine', F: 'Freight', L: 'Fluid' }
const nextCar: Record<CarType, CarType> = { E: 'F', F: 'L', L: 'E' }

interface Props {
  world: World
  collapsed: Record<string, boolean>
  update: Update
}

export function TrainsView({ world, collapsed, update }: Props) {
  const withTrain = (id: string, fn: (t: Train, w: World) => void) =>
    update((s) => {
      const w = s.worlds[s.active]
      const t = w.trains.find((t) => t.id === id)
      if (t) fn(t, w)
    })

  const { handleProps, cardProps, overId, draggingId } = useReorder((fromId, toId) =>
    update((s) => {
      const arr = s.worlds[s.active].trains
      const from = arr.findIndex((x) => x.id === fromId)
      const to = arr.findIndex((x) => x.id === toId)
      if (from > -1 && to > -1 && from !== to) arr.splice(to, 0, arr.splice(from, 1)[0])
    }),
  )

  const removeTrain = (id: string) =>
    update((s) => {
      const w = s.worlds[s.active]
      w.trains = w.trains.filter((x) => x.id !== id)
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
          Click a car to cycle engine / freight / fluid · car 0 is always the lead engine · drag ⠿ to
          reorder
        </span>
        <span style={{ display: 'flex', gap: 6 }}>
          <button
            className="btn small"
            onClick={() => update((s) => s.worlds[s.active].trains.forEach((x) => (s.collapsed[x.id] = true)))}
          >
            Collapse all
          </button>
          <button
            className="btn small"
            onClick={() => update((s) => s.worlds[s.active].trains.forEach((x) => delete s.collapsed[x.id]))}
          >
            Expand all
          </button>
          <button
            className="btn primary"
            onClick={() => update((s) => void s.worlds[s.active].trains.push(newTrain(s.worlds[s.active].trains.length + 1)))}
          >
            + Add train
          </button>
        </span>
      </div>

      {!world.trains.length && (
        <div className="empty">No trains yet. Add one to start laying out your network.</div>
      )}

      {world.trains.map((tr) => {
        const closed = !!collapsed[tr.id]
        return (
          <div
            key={tr.id}
            className={`card ${overId === tr.id ? 'dragover' : ''} ${draggingId === tr.id ? 'dragging' : ''}`}
            data-kind="train"
            {...cardProps(tr.id)}
          >
            <div className="cardhead">
              <span className="draghandle" title="Drag to reorder" {...handleProps(tr.id)}>
                ⠿
              </span>
              <button
                className={`chev ${closed ? 'closed' : ''}`}
                title={closed ? 'Expand' : 'Collapse'}
                onClick={() =>
                  update((s) => {
                    if (s.collapsed[tr.id]) delete s.collapsed[tr.id]
                    else s.collapsed[tr.id] = true
                  })
                }
              >
                ▼
              </button>
              <input
                type="text"
                className="name"
                defaultValue={tr.name}
                onBlur={(e) => {
                  const v = e.target.value.trim()
                  withTrain(tr.id, (t) => (t.name = v || t.name))
                }}
              />
              <span className="spacer" />
              {!closed && (
                <>
                  <button className="btn small" onClick={() => withTrain(tr.id, (t) => t.cars.push('F'))}>
                    + Car
                  </button>
                  <button
                    className="btn small"
                    disabled={tr.cars.length <= 1}
                    onClick={() => withTrain(tr.id, (t) => t.cars.length > 1 && t.cars.pop())}
                  >
                    − Car
                  </button>
                </>
              )}
              <DeleteButton title={`Delete ${tr.name}`} onConfirm={() => removeTrain(tr.id)} />
            </div>

            {!closed && (
              <>
                <div className="consist">
                  {tr.cars.map((c, i) => (
                    <div
                      key={i}
                      className={`railcar ${CAR_CLASS[c]} ${i === 0 ? 'locked' : ''}`}
                      title={i === 0 ? 'Lead engine (fixed)' : 'Click to cycle type'}
                      onClick={
                        i === 0 ? undefined : () => withTrain(tr.id, (t) => (t.cars[i] = nextCar[t.cars[i]]))
                      }
                    >
                      <span className="idx">{i}</span>
                      <span className="kind">{CAR_LABEL[c]}</span>
                      <span className="stripe" />
                    </div>
                  ))}
                </div>
                <div className="hint">
                  Car position N docks at platform N. Freight cars use regular platforms, fluid cars use
                  fluid platforms, and an engine at position N blocks that platform for this train.
                </div>
                <RouteEditor
                  stops={tr.stops || []}
                  stations={world.stations}
                  withStops={(fn) => withTrain(tr.id, (t) => fn(t.stops))}
                  emptyHint="Add train stations first, then define this train's route here."
                />
              </>
            )}
          </div>
        )
      })}
    </>
  )
}

