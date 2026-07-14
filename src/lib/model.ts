import { isFluid } from './catalog'
import type {
  AppState,
  CarType,
  Drone,
  DronePort,
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

/** Turn a display name into a safe, lowercase file-name stem. */
export const slugify = (name: string, fallback: string): string =>
  name.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').toLowerCase() || fallback

export function newWorld(name: string): World {
  return {
    id: uid(),
    name,
    trains: [],
    stations: [],
    trucks: [],
    truckStations: [],
    drones: [],
    dronePorts: [],
    customItems: [],
  }
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
export function newDrone(n: number): Drone {
  return { id: uid(), name: 'Drone ' + n, homeId: null, destId: null }
}
export function newDronePort(n: number): DronePort {
  return { id: uid(), name: 'Drone Port ' + n, items: [{ item: '', rate: 60 }] }
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
  /* Drones & drone ports were added after trucks; backfill and sanitize. */
  w.drones = (w.drones || []).map((d) => ({
    ...d,
    homeId: d.homeId ?? null,
    destId: d.destId ?? null,
  }))
  w.dronePorts = (w.dronePorts || []).map((p) => ({
    ...p,
    items: Array.isArray(p.items) ? p.items : [],
  }))
  /* Custom items were added last; backfill and keep only non-empty strings. */
  w.customItems = Array.isArray(w.customItems)
    ? w.customItems.filter((i): i is string => typeof i === 'string' && i.trim() !== '')
    : []
  return w
}

export function normalizeState(s: AppState | null | undefined): AppState | null {
  if (!s || !Array.isArray(s.worlds) || !s.worlds.length) return null
  s.worlds.forEach(migrateWorld)
  s.active = Math.min(s.active || 0, s.worlds.length - 1)
  /* 'routes' was the old trains section; 'items' was a short-lived custom-items
     section that is now a dialog — both fall back to trains. */
  s.section =
    !s.section || (['routes', 'items'] as string[]).includes(s.section) ? 'trains' : s.section
  s.collapsed = s.collapsed || {}
  return s
}

export function defaultState(): AppState {
  return { worlds: [newWorld('World 1')], active: 0, section: 'trains', collapsed: {} }
}
