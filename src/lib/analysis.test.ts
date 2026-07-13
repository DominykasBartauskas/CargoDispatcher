import {
  analyze,
  canUnloadHere,
  esc,
  fmt,
  loadableFeeds,
  ruleAllows,
  ruleText,
} from './analysis'
import type { CarType, Platform, Rule, Station, Stop, Train, World } from './types'

/* ---- typed builders ---- */
const rule = (mode: Rule['mode'] = 'any', items: string[] = []): Rule => ({ mode, items })
const stop = (stationId: string | null, load = rule(), unload = rule()): Stop => ({ stationId, load, unload })
const plat = (type: Platform['type'], mode: Platform['mode'], items: Platform['items'] = []): Platform => ({
  type,
  mode,
  items,
})
const train = (id: string, name: string, cars: CarType[], stops: Stop[]): Train => ({ id, name, cars, stops })
const station = (id: string, name: string, platforms: Platform[]): Station => ({ id, name, platforms })
const world = (stations: Station[], trains: Train[]): World => ({ id: 'w', name: 'W', stations, trains })

describe('helpers', () => {
  it('ruleAllows', () => {
    expect(ruleAllows({ mode: 'any', items: [] }, 'Iron Ore')).toBe(true)
    expect(ruleAllows({ mode: 'none', items: [] }, 'Iron Ore')).toBe(false)
    expect(ruleAllows({ mode: 'list', items: ['iron ore'] }, 'Iron Ore')).toBe(true)
    expect(ruleAllows({ mode: 'list', items: ['Copper Ore'] }, 'Iron Ore')).toBe(false)
    expect(ruleAllows(undefined, 'x')).toBe(true)
  })
  it('loadableFeeds respects type/mode', () => {
    expect(loadableFeeds(plat('regular', 'load', [{ item: 'Iron Ore', rate: 60 }]))).toHaveLength(1)
    expect(loadableFeeds(plat('regular', 'unload', [{ item: 'Iron Ore', rate: 60 }]))).toHaveLength(0)
    expect(loadableFeeds(plat('empty', 'load', []))).toHaveLength(0)
    // regular platform ignores fluids, fluid platform ignores solids
    expect(loadableFeeds(plat('regular', 'load', [{ item: 'Water', rate: 60 }]))).toHaveLength(0)
    expect(loadableFeeds(plat('fluid', 'load', [{ item: 'Water', rate: 60 }]))).toHaveLength(1)
    expect(loadableFeeds(plat('fluid', 'load', [{ item: 'Iron Ore', rate: 60 }]))).toHaveLength(0)
  })
  it('canUnloadHere matches item phase to platform type', () => {
    expect(canUnloadHere(plat('regular', 'unload'), 'Iron Ore')).toBe(true)
    expect(canUnloadHere(plat('fluid', 'unload'), 'Water')).toBe(true)
    expect(canUnloadHere(plat('fluid', 'unload'), 'Iron Ore')).toBe(false)
    expect(canUnloadHere(plat('regular', 'load'), 'Iron Ore')).toBe(false)
  })
  it('ruleText and fmt and esc', () => {
    expect(ruleText({ mode: 'any', items: [] })).toBe('anything')
    expect(ruleText({ mode: 'none', items: [] })).toBe('nothing')
    expect(ruleText({ mode: 'list', items: ['A', 'B'] })).toBe('A, B')
    expect(fmt(1.005)).toBe('1')
    expect(fmt(60)).toBe('60')
    expect(fmt(33.333)).toBe('33.33')
    expect(esc('<b>&"x"')).toBe('&lt;b&gt;&amp;&quot;x&quot;')
  })
})

describe('analyze — clean loop', () => {
  const w = world(
    [
      station('a', 'A', [plat('regular', 'load', [{ item: 'Iron Ore', rate: 60 }])]),
      station('b', 'B', [plat('regular', 'unload', [])]),
    ],
    [train('t', 'T', ['E', 'F'], [stop('a'), stop('b')])],
  )
  const a = analyze(w)
  it('has no problems', () => {
    expect(a.errors).toEqual([])
    expect(a.warnings).toEqual([])
  })
  it('produces the expected pickup and deposit', () => {
    expect(a.pickups).toHaveLength(1)
    expect(a.pickups[0]).toMatchObject({ item: 'Iron Ore', car: 1, rate: 60, stopIdx: 0 })
    expect(a.pickups[0].delivered).toMatchObject({ stopIdx: 1 })
    expect(a.deposits).toHaveLength(1)
    expect(a.deposits[0]).toMatchObject({ item: 'Iron Ore', car: 1, stopIdx: 1 })
  })
})

describe('analyze — structural warnings', () => {
  it('flags a train with no route', () => {
    const a = analyze(world([], [train('t', 'T', ['E', 'F'], [])]))
    expect(a.warnings).toContain('<b>T</b> has no route defined.')
  })
  it('flags a train with no freight/fluid cars', () => {
    const a = analyze(world([], [train('t', 'T', ['E'], [])]))
    expect(a.warnings).toContain('<b>T</b> has no freight or fluid cars, so it can never carry anything.')
  })
  it('flags a single-stop loop', () => {
    const a = analyze(world([station('a', 'A', [])], [train('t', 'T', ['E', 'F'], [stop('a')])]))
    expect(a.warnings).toContain(
      '<b>T</b> only visits one station. A loop needs at least two stops to move anything.',
    )
  })
  it('flags a stop pointing at a deleted station', () => {
    const a = analyze(world([station('a', 'A', [])], [train('t', 'T', ['E', 'F'], [stop('ghost'), stop('a')])]))
    expect(a.warnings).toContain('<b>T</b> stop 1 points at a deleted station. Remove or reassign it.')
  })
})

describe('analyze — errors', () => {
  it('ERROR A: load list item that cannot be collected', () => {
    const w = world(
      [
        station('a', 'A', [plat('regular', 'load', [{ item: 'Iron Ore', rate: 60 }])]),
        station('b', 'B', [plat('regular', 'unload', [])]),
      ],
      [train('t', 'T', ['E', 'F'], [stop('a', rule('list', ['Copper Ore'])), stop('b')])],
    )
    const a = analyze(w)
    expect(a.errors).toContain(
      '<b>T</b> is set to load <b>Copper Ore</b> at A, but no valid freight car can collect it: A has no load platform providing it.',
    )
  })

  it('ERROR B: two trains contend for the same platform feed', () => {
    const w = world(
      [
        station('a', 'A', [plat('regular', 'load', [{ item: 'Iron Ore', rate: 60 }])]),
        station('b', 'B', [plat('regular', 'unload', [])]),
      ],
      [
        train('t1', 'T1', ['E', 'F'], [stop('a'), stop('b')]),
        train('t2', 'T2', ['E', 'F'], [stop('a'), stop('b')]),
      ],
    )
    const a = analyze(w)
    expect(a.errors.some((e) => e.includes('<b>T1</b> and <b>T2</b> both pick up <b>Iron Ore</b>'))).toBe(true)
  })
})

describe('analyze — never-happens & orphans', () => {
  it('warns when an unload-list item is never carried', () => {
    const w = world(
      [station('a', 'A', [plat('regular', 'unload', [])]), station('b', 'B', [plat('regular', 'unload', [])])],
      [train('t', 'T', ['E', 'F'], [stop('a', rule(), rule('list', ['Iron Ore'])), stop('b')])],
    )
    const a = analyze(w)
    expect(
      a.warnings.some((warn) =>
        warn.includes('<b>T</b> is set to unload <b>Iron Ore</b> at A, but never does'),
      ),
    ).toBe(true)
  })
  it('warns about an uncollected load platform', () => {
    const a = analyze(world([station('a', 'A', [plat('regular', 'load', [{ item: 'Iron Ore', rate: 60 }])])], []))
    expect(a.warnings).toContain(
      'Platform 1 at <b>A</b> loads Iron Ore (60/min) but no train ever collects it.',
    )
  })
  it('warns about an unfed unload platform', () => {
    const a = analyze(world([station('a', 'A', [plat('regular', 'unload', [])])], []))
    expect(a.warnings).toContain('Platform 1 at <b>A</b> is set to unload but no train ever delivers anything to it.')
  })
})

describe('analyze — fluids', () => {
  it('routes a fluid via a fluid car and fluid platforms', () => {
    const w = world(
      [
        station('a', 'A', [plat('fluid', 'load', [{ item: 'Water', rate: 300 }])]),
        station('b', 'B', [plat('fluid', 'unload', [])]),
      ],
      [train('t', 'T', ['E', 'L'], [stop('a'), stop('b')])],
    )
    const a = analyze(w)
    expect(a.errors).toEqual([])
    expect(a.pickups).toHaveLength(1)
    expect(a.pickups[0]).toMatchObject({ item: 'Water', car: 1 })
    expect(a.deposits).toHaveLength(1)
  })
  it('warns when a fluid platform is set to load a solid', () => {
    const a = analyze(world([station('a', 'A', [plat('fluid', 'load', [{ item: 'Iron Ore', rate: 60 }])])], []))
    expect(
      a.warnings.some((warn) => warn.includes('is a fluid platform but is set to load Iron Ore, which is not a fluid')),
    ).toBe(true)
  })
  it('does not pick up a fluid with a freight car', () => {
    const w = world(
      [station('a', 'A', [plat('fluid', 'load', [{ item: 'Water', rate: 300 }])]), station('b', 'B', [])],
      [train('t', 'T', ['E', 'F'], [stop('a'), stop('b')])],
    )
    const a = analyze(w)
    expect(a.pickups).toHaveLength(0)
  })
})
