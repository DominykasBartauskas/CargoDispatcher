import { isFluid } from './catalog'
import type {
  AppState,
  CarType,
  Platform,
  Station,
  Stop,
  Train,
  Truck,
  TruckStation,
  TruckType,
  World,
} from './types'

export const uid = (): string =>
  crypto.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2) + Date.now()

export function newWorld(name: string): World {
  return { id: uid(), name, trains: [], stations: [], trucks: [], truckStations: [] }
}
export function newTrain(n: number): Train {
  return { id: uid(), name: 'Train ' + n, cars: ['E', 'F', 'F'], stops: [] }
}
export function newStation(n: number): Station {
  return { id: uid(), name: 'Station ' + n, platforms: [newPlatform()] }
}
export function newPlatform(): Platform {
  return { type: 'regular', mode: 'load', items: [{ item: '', rate: 60 }] }
}
export function newTruck(n: number): Truck {
  return { id: uid(), name: 'Truck ' + n, type: 'truck', stops: [] }
}
export function newTruckStation(n: number): TruckStation {
  return { id: uid(), name: 'Truck Station ' + n, type: 'regular', mode: 'load', items: [{ item: '', rate: 60 }] }
}
export function newStop(stationId: string | null): Stop {
  return { stationId, load: { mode: 'any', items: [] }, unload: { mode: 'any', items: [] } }
}

const TRUCK_TYPES: TruckType[] = ['truck', 'fluid-truck', 'tractor', 'explorer']

/* Older saves: single {item, rate} per platform, and "empty" was a mode
   rather than a type. */
export function migrateWorld(w: World): World {
  ;(w.trains || []).forEach((t) => {
    t.cars = (t.cars && t.cars.length ? t.cars : ['E']).map((c): CarType =>
      (['E', 'F', 'L'] as string[]).includes(c) ? (c as CarType) : 'F',
    )
    t.cars[0] = 'E'
    t.stops = t.stops || []
  })
  ;(w.stations || []).forEach((st) =>
    (st.platforms || []).forEach((p) => {
      const legacy = p as Platform & { item?: string; rate?: number }
      if (!Array.isArray(p.items)) {
        p.items =
          p.mode === 'load' && legacy.item ? [{ item: legacy.item, rate: +(legacy.rate ?? 0) || 0 }] : []
        delete legacy.item
        delete legacy.rate
      }
      if (!p.type) {
        if ((p.mode as string) === 'empty') {
          p.type = 'empty'
          p.mode = 'load'
        } else {
          p.type =
            (p.items || []).some((pi) => isFluid(pi.item)) && (p.items || []).length === 1
              ? 'fluid'
              : 'regular'
        }
      }
      if (!p.mode || (p.mode as string) === 'empty') p.mode = 'load'
    }),
  )
  /* Trucks & truck stations were added after the initial train-only model, so
     older saves have neither array. Backfill and sanitize them. */
  w.trucks = (w.trucks || []).map((t) => ({
    ...t,
    type: TRUCK_TYPES.includes(t.type) ? t.type : 'truck',
    stops: t.stops || [],
  }))
  w.truckStations = (w.truckStations || []).map((st) => ({
    ...st,
    type: st.type === 'fluid' ? 'fluid' : 'regular',
    mode: st.mode === 'unload' ? 'unload' : 'load',
    items: Array.isArray(st.items) ? st.items : [],
  }))
  return w
}

export function normalizeState(s: AppState | null | undefined): AppState | null {
  if (!s || !Array.isArray(s.worlds) || !s.worlds.length) return null
  s.worlds.forEach(migrateWorld)
  s.active = Math.min(s.active || 0, s.worlds.length - 1)
  s.section = !s.section || (s.section as string) === 'routes' ? 'trains' : s.section
  s.collapsed = s.collapsed || {}
  return s
}

export function defaultState(): AppState {
  return { worlds: [newWorld('World 1')], active: 0, section: 'trains', collapsed: {} }
}
