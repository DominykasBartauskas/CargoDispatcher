import { isFluid } from './catalog'
import type { AppState, CarType, Platform, Station, Stop, Train, World } from './types'

export const uid = (): string =>
  crypto.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2) + Date.now()

export function newWorld(name: string): World {
  return { id: uid(), name, trains: [], stations: [] }
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
export function newStop(stationId: string | null): Stop {
  return { stationId, load: { mode: 'any', items: [] }, unload: { mode: 'any', items: [] } }
}

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
