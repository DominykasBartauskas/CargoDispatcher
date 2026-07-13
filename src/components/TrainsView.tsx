import { newStop, newTrain } from '../lib/model'
import { useDialogs } from '../lib/dialogs'
import { useReorder } from '../lib/useReorder'
import { RuleEditor } from './RuleEditor'
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
  const dialogs = useDialogs()

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

  const deleteTrain = async (t: Train) => {
    if (await dialogs.confirm(`Delete ${t.name}?`))
      update((s) => {
        const w = s.worlds[s.active]
        w.trains = w.trains.filter((x) => x.id !== t.id)
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
              <button className="btn small ghost" onClick={() => deleteTrain(tr)}>
                ✕
              </button>
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
                <RouteBlock train={tr} world={world} update={update} withTrain={withTrain} />
              </>
            )}
          </div>
        )
      })}
    </>
  )
}

function RouteBlock({
  train,
  world,
  update,
  withTrain,
}: {
  train: Train
  world: World
  update: Update
  withTrain: (id: string, fn: (t: Train, w: World) => void) => void
}) {
  const stops = train.stops || []

  if (!world.stations.length)
    return (
      <div className="routeblock">
        <span className="label">Route</span>
        <div className="hint">Add stations first, then define this train's route here.</div>
      </div>
    )

  return (
    <div className="routeblock">
      <div className="routehead">
        <span className="label">
          Route · loop of {stops.length} stop{stops.length === 1 ? '' : 's'}
        </span>
        <span className="spacer" />
        <button
          className="btn small primary"
          onClick={() =>
            withTrain(train.id, (t, w) => t.stops.push(newStop(w.stations[0] ? w.stations[0].id : null)))
          }
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
              onChange={(e) => withTrain(train.id, (t) => (t.stops[si].stationId = e.target.value))}
            >
              {world.stations.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name}
                </option>
              ))}
            </select>
            <span className="spacer" style={{ flex: 1 }} />
            <button
              className="btn small"
              disabled={si === 0}
              onClick={() =>
                update((s) => {
                  const t = s.worlds[s.active].trains.find((x) => x.id === train.id)
                  if (t && si - 1 >= 0) [t.stops[si], t.stops[si - 1]] = [t.stops[si - 1], t.stops[si]]
                })
              }
            >
              ↑
            </button>
            <button
              className="btn small"
              disabled={si === stops.length - 1}
              onClick={() =>
                update((s) => {
                  const t = s.worlds[s.active].trains.find((x) => x.id === train.id)
                  if (t && si + 1 < t.stops.length)
                    [t.stops[si], t.stops[si + 1]] = [t.stops[si + 1], t.stops[si]]
                })
              }
            >
              ↓
            </button>
            <button
              className="btn small ghost"
              onClick={() => withTrain(train.id, (t) => t.stops.splice(si, 1))}
            >
              ✕
            </button>
          </div>
          <div className="rules">
            <span className="rlabel load">Load</span>
            <RuleEditor train={train} stopIdx={si} kind="load" update={update} />
            <span className="rlabel unload">Unload</span>
            <RuleEditor train={train} stopIdx={si} kind="unload" update={update} />
          </div>
        </div>
      ))}

      {stops.length > 1 && <div className="looparrow">↺ returns to stop 1</div>}
    </div>
  )
}
