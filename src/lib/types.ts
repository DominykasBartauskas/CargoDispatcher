/** Domain model for the Rail Dispatcher, ported 1:1 from the legacy prototype. */

/** Car codes: Engine, Freight, fluid (L). */
export type CarType = 'E' | 'F' | 'L'
export type PlatformType = 'regular' | 'fluid' | 'empty'
export type PlatformMode = 'load' | 'unload'
export type RuleMode = 'any' | 'none' | 'list'
export type Section = 'trains' | 'stations' | 'trucks' | 'truckStations' | 'analysis'

/** Road vehicles. Only 'fluid-truck' carries fluids; the rest carry solids. */
export type TruckType = 'truck' | 'fluid-truck' | 'tractor' | 'explorer'
/** A truck station is a single dock; unlike train platforms it has no 'empty'. */
export type TruckStationType = 'regular' | 'fluid'

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

/** A road vehicle: one cargo hold, no car consist, on a looped route. */
export interface Truck {
  id: string
  name: string
  type: TruckType
  stops: Stop[]
}

/** A single road-vehicle dock. Regular docks handle a list of solids; fluid
    docks (Satisfactory 1.2 Fluid Truck Station) handle one fluid. */
export interface TruckStation {
  id: string
  name: string
  type: TruckStationType
  mode: PlatformMode
  items: PlatItem[]
}

export interface World {
  id: string
  name: string
  trains: Train[]
  stations: Station[]
  trucks: Truck[]
  truckStations: TruckStation[]
}

export interface AppState {
  worlds: World[]
  active: number
  section: Section
  collapsed: Record<string, boolean>
}

/** Mutate the app state in place; the caller clones + re-renders. */
export type Update = (fn: (state: AppState) => void) => void
