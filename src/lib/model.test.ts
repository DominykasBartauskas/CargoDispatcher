import {
  defaultState,
  migrateWorld,
  newPlatform,
  newStation,
  newStop,
  newTrain,
  newTruck,
  newTruckStation,
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
  it('newTruck defaults to a solid truck with no route', () => {
    const t = newTruck(2)
    expect(t.name).toBe('Truck 2')
    expect(t.type).toBe('truck')
    expect(t.stops).toEqual([])
    expect(t.id).toBeTruthy()
  })
  it('newTruckStation defaults to a regular load dock', () => {
    const st = newTruckStation(1)
    expect(st.name).toBe('Truck Station 1')
    expect(st.type).toBe('regular')
    expect(st.mode).toBe('load')
    expect(st.items).toEqual([{ item: '', rate: 60 }])
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
  it('backfills empty truck arrays on a legacy train-only world', () => {
    const w = { id: 'w', name: 'W', trains: [], stations: [] } as unknown as World
    migrateWorld(w)
    expect(w.trucks).toEqual([])
    expect(w.truckStations).toEqual([])
  })
  it('sanitizes an unknown truck type and truck-station shape', () => {
    const w = {
      id: 'w',
      name: 'W',
      trains: [],
      stations: [],
      trucks: [{ id: 'k', name: 'K', type: 'bogus', stops: undefined }],
      truckStations: [{ id: 's', name: 'S', type: undefined, mode: undefined, items: undefined }],
    } as unknown as World
    migrateWorld(w)
    expect(w.trucks[0].type).toBe('truck')
    expect(w.trucks[0].stops).toEqual([])
    expect(w.truckStations[0].type).toBe('regular')
    expect(w.truckStations[0].mode).toBe('load')
    expect(w.truckStations[0].items).toEqual([])
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
