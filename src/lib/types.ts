/** Domain model for the Rail Dispatcher, ported 1:1 from the legacy prototype. */

/** Car codes: Engine, Freight, fluid (L). */
export type CarType = 'E' | 'F' | 'L'
export type PlatformType = 'regular' | 'fluid' | 'empty'
export type PlatformMode = 'load' | 'unload'
export type RuleMode = 'any' | 'none' | 'list'
export type Section = 'trains' | 'stations' | 'analysis'

export interface PlatItem {
  item: string
  rate: number
}

export interface Platform {
  type: PlatformType
  mode: PlatformMode
  items: PlatItem[]
}

export interface Rule {
  mode: RuleMode
  items: string[]
}

export interface Stop {
  stationId: string | null
  load: Rule
  unload: Rule
}

export interface Train {
  id: string
  name: string
  cars: CarType[]
  stops: Stop[]
}

export interface Station {
  id: string
  name: string
  platforms: Platform[]
}

export interface World {
  id: string
  name: string
  trains: Train[]
  stations: Station[]
}

export interface AppState {
  worlds: World[]
  active: number
  section: Section
  collapsed: Record<string, boolean>
}

/** Mutate the app state in place; the caller clones + re-renders. */
export type Update = (fn: (state: AppState) => void) => void
