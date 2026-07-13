import {
  defaultState,
  migrateWorld,
  newPlatform,
  newStation,
  newStop,
  newTrain,
  normalizeState,
} from './model'
import type { AppState, Platform, World } from './types'

describe('factories', () => {
  it('newTrain has a lead engine and two freight cars', () => {
    const t = newTrain(3)
    expect(t.name).toBe('Train 3')
    expect(t.cars).toEqual(['E', 'F', 'F'])
    expect(t.stops).toEqual([])
    expect(t.id).toBeTruthy()
  })
  it('newPlatform defaults to a regular load platform', () => {
    expect(newPlatform()).toEqual({ type: 'regular', mode: 'load', items: [{ item: '', rate: 60 }] })
  })
  it('newStation starts with one platform', () => {
    const s = newStation(1)
    expect(s.name).toBe('Station 1')
    expect(s.platforms).toHaveLength(1)
  })
  it('newStop defaults both rules to "any"', () => {
    expect(newStop('x')).toEqual({
      stationId: 'x',
      load: { mode: 'any', items: [] },
      unload: { mode: 'any', items: [] },
    })
  })
})

describe('migrateWorld', () => {
  it('upgrades a legacy single-item load platform', () => {
    const w = {
      id: 'w',
      name: 'W',
      trains: [],
      stations: [{ id: 's', name: 'S', platforms: [{ mode: 'load', item: 'Iron Ore', rate: 60 }] }],
    } as unknown as World
    migrateWorld(w)
    const p = w.stations[0].platforms[0] as Platform & { item?: string }
    expect(p.items).toEqual([{ item: 'Iron Ore', rate: 60 }])
    expect(p.item).toBeUndefined()
    expect(p.type).toBe('regular')
  })
  it('converts a legacy "empty" mode into an empty type', () => {
    const w = {
      id: 'w',
      name: 'W',
      trains: [],
      stations: [{ id: 's', name: 'S', platforms: [{ mode: 'empty' }] }],
    } as unknown as World
    migrateWorld(w)
    const p = w.stations[0].platforms[0]
    expect(p.type).toBe('empty')
    expect(p.mode).toBe('load')
  })
  it('infers a fluid type from a single fluid item', () => {
    const w = {
      id: 'w',
      name: 'W',
      trains: [],
      stations: [{ id: 's', name: 'S', platforms: [{ mode: 'load', items: [{ item: 'Water', rate: 60 }] }] }],
    } as unknown as World
    migrateWorld(w)
    expect(w.stations[0].platforms[0].type).toBe('fluid')
  })
  it('sanitizes car codes and forces the lead engine', () => {
    const w = {
      id: 'w',
      name: 'W',
      stations: [],
      trains: [{ id: 't', name: 'T', cars: ['X', 'F', 'Q', 'L'], stops: undefined }],
    } as unknown as World
    migrateWorld(w)
    expect(w.trains[0].cars).toEqual(['E', 'F', 'F', 'L'])
    expect(w.trains[0].stops).toEqual([])
  })
})

describe('normalizeState', () => {
  it('returns null for empty/invalid input', () => {
    expect(normalizeState(null)).toBeNull()
    expect(normalizeState({ worlds: [] } as unknown as AppState)).toBeNull()
  })
  it('clamps active and maps the legacy "routes" section to "trains"', () => {
    const s = {
      worlds: [{ id: 'w', name: 'W', trains: [], stations: [] }],
      active: 5,
      section: 'routes',
    } as unknown as AppState
    const n = normalizeState(s)!
    expect(n.active).toBe(0)
    expect(n.section).toBe('trains')
    expect(n.collapsed).toEqual({})
  })
  it('defaultState has one world on the trains section', () => {
    const d = defaultState()
    expect(d.worlds).toHaveLength(1)
    expect(d.section).toBe('trains')
    expect(d.active).toBe(0)
  })
})
