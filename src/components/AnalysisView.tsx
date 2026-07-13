import { Fragment } from 'react'
import type { ReactNode } from 'react'
import { isFluid } from '../lib/catalog'
import { fmt, ruleAllows, ruleText } from '../lib/analysis'
import type { Analysis } from '../lib/analysis'
import type { Platform, Station, Truck, TruckStation, World } from '../lib/types'

/** Render a list interleaved with <br/>, matching the legacy join('<br>'). */
function listBr<T>(items: T[], render: (item: T) => ReactNode): ReactNode {
  return items.map((item, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      {render(item)}
    </Fragment>
  ))
}

function ModeChip({ p, mode }: { p: Platform; mode: 'load' | 'unload' }) {
  return (
    <span className={`modechip ${mode}`}>
      {p.type === 'fluid' ? 'Fluid ' : ''}
      {mode === 'load' ? 'Load' : 'Unload'}
    </span>
  )
}

export function AnalysisView({ world, analysis: a }: { world: World; analysis: Analysis }) {
  return (
    <>
      <h2 className="sec" style={{ marginTop: 0 }}>
        Problems
      </h2>
      {!a.errors.length && !a.warnings.length ? (
        <div className="allclear">✓ &nbsp;No conflicts detected. All flows check out.</div>
      ) : (
        <>
          {a.errors.map((e, i) => (
            <div className="issue err" key={`e${i}`}>
              <span className="tag">Error</span>
              <span dangerouslySetInnerHTML={{ __html: e }} />
            </div>
          ))}
          {a.warnings.map((e, i) => (
            <div className="issue warn" key={`w${i}`}>
              <span className="tag">Warning</span>
              <span dangerouslySetInnerHTML={{ __html: e }} />
            </div>
          ))}
        </>
      )}

      <h2 className="sec">Station platforms · computed throughput</h2>
      {!world.stations.length && <div className="empty">No stations defined.</div>}
      {world.stations.map((st) => (
        <StationBoard key={st.id} st={st} a={a} />
      ))}

      <h2 className="sec">Train manifests · what actually happens each loop</h2>
      {!world.trains.length && <div className="empty">No trains defined.</div>}
      {world.trains.map((tr) => (
        <TrainManifest key={tr.id} train={tr} world={world} a={a} />
      ))}

      <h2 className="sec">Truck stations · computed throughput</h2>
      {!world.truckStations.length && <div className="empty">No truck stations defined.</div>}
      {world.truckStations.map((st) => (
        <TruckStationBoard key={st.id} st={st} a={a} />
      ))}

      <h2 className="sec">Truck manifests · what actually happens each loop</h2>
      {!world.trucks.length && <div className="empty">No trucks defined.</div>}
      {world.trucks.map((tk) => (
        <TruckManifest key={tk.id} truck={tk} world={world} a={a} />
      ))}
    </>
  )
}

function TruckStationBoard({ st, a }: { st: TruckStation; a: Analysis }) {
  const typeLabel = st.type === 'fluid' ? 'Fluid ' : ''

  const load = (() => {
    const named = (st.items || []).filter((pi) => pi.item).slice(0, st.type === 'fluid' ? 1 : Infinity)
    return named.map((pi) => ({
      pi,
      takers: [
        ...new Set(
          a.truckPickups
            .filter((pk) => pk.station === st && pk.item.toLowerCase() === pi.item.toLowerCase())
            .map((pk) => pk.truck.name),
        ),
      ],
    }))
  })()

  const unload = (() => {
    const byItem = new Map<string, { item: string; rate: number; trucks: Set<string> }>()
    a.truckDeposits
      .filter((d) => d.station === st)
      .forEach((d) => {
        const k = d.item.toLowerCase()
        const cur = byItem.get(k) || { item: d.item, rate: 0, trucks: new Set<string>() }
        cur.rate += d.rate
        cur.trucks.add(d.truck.name)
        byItem.set(k, cur)
      })
    return [...byItem.values()]
  })()

  return (
    <div className="board">
      <h3>{st.name}</h3>
      <table className="flow">
        <tbody>
          <tr>
            <th style={{ width: 110 }}>Mode</th>
            <th>Contents</th>
            <th style={{ width: 220 }}>Trucks</th>
          </tr>
          {st.mode === 'load' ? (
            <tr>
              <td>
                <span className="modechip load">{typeLabel}Load</span>
              </td>
              <td>
                {load.length ? (
                  listBr(load, (r) => (
                    <>
                      {r.pi.item} <span className="rate">{fmt(r.pi.rate)}/min</span>
                    </>
                  ))
                ) : (
                  <span className="dimtxt">no items set</span>
                )}
              </td>
              <td>
                {load.length ? (
                  listBr(load, (r) =>
                    r.takers.length ? r.takers.join(', ') : <span className="dimtxt">uncollected</span>,
                  )
                ) : (
                  <span className="dimtxt">—</span>
                )}
              </td>
            </tr>
          ) : (
            <tr>
              <td>
                <span className="modechip unload">{typeLabel}Unload</span>
              </td>
              <td>
                {unload.length ? (
                  listBr(unload, (r) => (
                    <>
                      {r.item} <span className="rate">{fmt(r.rate)}/min</span>
                    </>
                  ))
                ) : (
                  <span className="dimtxt">empty</span>
                )}
              </td>
              <td>
                {unload.length ? (
                  [...new Set(unload.flatMap((r) => [...r.trucks]))].join(', ')
                ) : (
                  <span className="dimtxt">—</span>
                )}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function TruckManifest({ truck, world, a }: { truck: Truck; world: World; a: Analysis }) {
  const stops = truck.stops || []
  const stationById = (id: string | null) =>
    id ? world.truckStations.find((s) => s.id === id) : undefined

  const skipReason = (t: number, item: string): string => {
    const stop = stops[t]
    const st = stationById(stop.stationId)
    if (!st) return 'missing station'
    if (st.mode !== 'unload') return `${st.name} is set to load`
    if (isFluid(item) !== (st.type === 'fluid')) return `${st.name} is the wrong type`
    if (!ruleAllows(stop.unload, item)) return 'unload rule filters it'
    return 'skipped'
  }

  const journeys = a.truckPickups.filter((pk) => pk.truck === truck)

  return (
    <div className="board">
      <h3>{truck.name}</h3>
      <div className="manif">
        {!stops.length && <span className="dimtxt">No route.</span>}
        {stops.map((stop, si) => {
          const st = stationById(stop.stationId)
          const loads = a.truckPickups.filter((pk) => pk.truck === truck && pk.stopIdx === si)
          const drops = a.truckDeposits.filter((d) => d.truck === truck && d.stopIdx === si)
          return (
            <div className="mstop" key={si}>
              <span className="mono dimtxt">{si + 1}.</span> <b>{st ? st.name : <i>missing station</i>}</b>{' '}
              <span className="dimtxt">
                · load: {ruleText(stop.load)} · unload: {ruleText(stop.unload)}
              </span>
              <br />
              {drops.length > 0 && (
                <>
                  <span className="ul">⬇ unloads {drops.map((d) => `${d.item} ${fmt(d.rate)}/min`).join(', ')}</span>
                  <br />
                </>
              )}
              {loads.length > 0 && (
                <span className="ld">⬆ loads {loads.map((p) => `${p.item} ${fmt(p.rate)}/min`).join(', ')}</span>
              )}
              {!loads.length && !drops.length && <span className="dimtxt">no cargo exchanged</span>}
            </div>
          )
        })}

        {journeys.length > 0 && (
          <div className="journeys">
            <span className="label" style={{ fontSize: 10 }}>
              Cargo journeys
            </span>
            {journeys.map((pk, idx) => (
              <div className="jrow" key={idx}>
                {pk.item} {fmt(pk.rate)}/min · <span className="ld">loads at {pk.station.name}</span>{' '}
                {pk.carryPath.map((t, k) => {
                  const s2 = stationById(stops[t].stationId)
                  return (
                    <span className="dimtxt" key={k}>
                      → skips {s2 ? s2.name : '?'} ({skipReason(t, pk.item)}){' '}
                    </span>
                  )
                })}
                {pk.delivered ? (
                  <>
                    → <span className="ul">unloads at {pk.delivered.station.name}</span>
                  </>
                ) : (
                  <>
                    → <span style={{ color: 'var(--color-warn)' }}>never unloaded, accumulates</span>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StationBoard({ st, a }: { st: Station; a: Analysis }) {
  return (
    <div className="board">
      <h3>{st.name}</h3>
      <table className="flow">
        <tbody>
          <tr>
            <th style={{ width: 70 }}>Platform</th>
            <th style={{ width: 90 }}>Mode</th>
            <th>Contents</th>
            <th style={{ width: 220 }}>Trains</th>
          </tr>
          {st.platforms.map((p, i) => {
            if (p.type === 'empty')
              return (
                <tr key={i}>
                  <td className="mono dimtxt">{i + 1}</td>
                  <td>
                    <span className="modechip empty">Empty</span>
                  </td>
                  <td>
                    <span className="dimtxt">no cargo exchange</span>
                  </td>
                  <td>
                    <span className="dimtxt">—</span>
                  </td>
                </tr>
              )

            if (p.mode === 'load') {
              const named = (p.items || [])
                .filter((pi) => pi.item)
                .slice(0, p.type === 'fluid' ? 1 : Infinity)
              const rows = named.map((pi) => ({
                pi,
                takers: [
                  ...new Set(
                    a.pickups
                      .filter(
                        (pk) =>
                          pk.station === st &&
                          pk.car === i + 1 &&
                          pk.item.toLowerCase() === pi.item.toLowerCase(),
                      )
                      .map((pk) => pk.train.name),
                  ),
                ],
              }))
              return (
                <tr key={i}>
                  <td className="mono dimtxt">{i + 1}</td>
                  <td>
                    <ModeChip p={p} mode="load" />
                  </td>
                  <td>
                    {rows.length ? (
                      listBr(rows, (r) => (
                        <>
                          {r.pi.item} <span className="rate">{fmt(r.pi.rate)}/min</span>
                        </>
                      ))
                    ) : (
                      <span className="dimtxt">no items set</span>
                    )}
                  </td>
                  <td>
                    {rows.length ? (
                      listBr(rows, (r) =>
                        r.takers.length ? (
                          r.takers.join(', ')
                        ) : (
                          <span className="dimtxt">uncollected</span>
                        ),
                      )
                    ) : (
                      <span className="dimtxt">—</span>
                    )}
                  </td>
                </tr>
              )
            }

            // unload
            const feeds = a.deposits.filter((d) => d.station === st && d.car === i + 1)
            const byItem = new Map<string, { item: string; rate: number; trains: Set<string> }>()
            feeds.forEach((d) => {
              const k = d.item.toLowerCase()
              const cur = byItem.get(k) || { item: d.item, rate: 0, trains: new Set<string>() }
              cur.rate += d.rate
              cur.trains.add(d.train.name)
              byItem.set(k, cur)
            })
            const rows = [...byItem.values()]
            return (
              <tr key={i}>
                <td className="mono dimtxt">{i + 1}</td>
                <td>
                  <ModeChip p={p} mode="unload" />
                </td>
                <td>
                  {rows.length ? (
                    listBr(rows, (r) => (
                      <>
                        {r.item} <span className="rate">{fmt(r.rate)}/min</span>
                      </>
                    ))
                  ) : (
                    <span className="dimtxt">empty</span>
                  )}
                </td>
                <td>
                  {rows.length ? (
                    [...new Set(rows.flatMap((r) => [...r.trains]))].join(', ')
                  ) : (
                    <span className="dimtxt">—</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function TrainManifest({ train, world, a }: { train: World['trains'][number]; world: World; a: Analysis }) {
  const stops = train.stops || []
  const stationById = (id: string | null) => (id ? world.stations.find((s) => s.id === id) : undefined)

  const skipReason = (t: number, car: number, item: string): string => {
    const stop = stops[t]
    const st2 = stationById(stop.stationId)
    if (!st2) return 'missing station'
    const p = st2.platforms[car - 1]
    if (!p) return `no platform ${car}`
    if (p.type === 'empty') return `platform ${car} is empty`
    if (p.mode !== 'unload') return `platform ${car} is set to load`
    if (isFluid(item) !== (p.type === 'fluid')) return `platform ${car} is the wrong type`
    if (!ruleAllows(stop.unload, item)) return 'unload rule filters it'
    return 'skipped'
  }

  const journeys = a.pickups.filter((pk) => pk.train === train)

  return (
    <div className="board">
      <h3>{train.name}</h3>
      <div className="manif">
        {!stops.length && <span className="dimtxt">No route.</span>}
        {stops.map((stop, si) => {
          const st = stationById(stop.stationId)
          const loads = a.pickups.filter((pk) => pk.train === train && pk.stopIdx === si)
          const drops = a.deposits.filter((d) => d.train === train && d.stopIdx === si)
          return (
            <div className="mstop" key={si}>
              <span className="mono dimtxt">{si + 1}.</span> <b>{st ? st.name : <i>missing station</i>}</b>{' '}
              <span className="dimtxt">
                · load: {ruleText(stop.load)} · unload: {ruleText(stop.unload)}
              </span>
              <br />
              {drops.length > 0 && (
                <>
                  <span className="ul">
                    ⬇ unloads {drops.map((d) => `${d.item} ${fmt(d.rate)}/min (car ${d.car})`).join(', ')}
                  </span>
                  <br />
                </>
              )}
              {loads.length > 0 && (
                <span className="ld">
                  ⬆ loads {loads.map((p) => `${p.item} ${fmt(p.rate)}/min (car ${p.car})`).join(', ')}
                </span>
              )}
              {!loads.length && !drops.length && <span className="dimtxt">no cargo exchanged</span>}
            </div>
          )
        })}

        {journeys.length > 0 && (
          <div className="journeys">
            <span className="label" style={{ fontSize: 10 }}>
              Cargo journeys
            </span>
            {journeys.map((pk, idx) => (
              <div className="jrow" key={idx}>
                <span className="mono">car {pk.car}</span> · {pk.item} {fmt(pk.rate)}/min ·{' '}
                <span className="ld">loads at {pk.station.name}</span>{' '}
                {pk.carryPath.map((t, k) => {
                  const s2 = stationById(stops[t].stationId)
                  return (
                    <span className="dimtxt" key={k}>
                      → skips {s2 ? s2.name : '?'} ({skipReason(t, pk.car, pk.item)}){' '}
                    </span>
                  )
                })}
                {pk.delivered ? (
                  <>
                    → <span className="ul">unloads at {pk.delivered.station.name}</span>
                  </>
                ) : (
                  <>
                    → <span style={{ color: 'var(--color-warn)' }}>never unloaded, accumulates</span>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
