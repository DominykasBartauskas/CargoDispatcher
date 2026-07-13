import { isFluid } from './catalog'
import type {
  Drone,
  DronePort,
  Platform,
  PlatItem,
  Rule,
  Station,
  Truck,
  TruckStation,
  World,
} from './types'

/** Escapes user-supplied text for the HTML fragments the analysis emits. */
export const esc = (s: unknown): string =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  )

export const fmt = (n: number): string => String(Math.round(n * 100) / 100)

export function ruleAllows(rule: Rule | undefined, item: string): boolean {
  if (!rule || rule.mode === 'any') return true
  if (rule.mode === 'none') return false
  return (rule.items || []).map((i) => i.toLowerCase()).includes(String(item).toLowerCase())
}

/* Feeds a platform can physically provide: fluid platforms provide their one
   fluid; regular platforms provide their solid items; mismatches and empty
   platforms provide nothing (mismatches are flagged separately). */
export function loadableFeeds(p: Platform | undefined): PlatItem[] {
  if (!p || p.type === 'empty' || p.mode !== 'load') return []
  if (p.type === 'fluid') {
    const pi = (p.items || [])[0]
    return pi && pi.item && isFluid(pi.item) ? [pi] : []
  }
  return (p.items || []).filter((pi) => pi.item && !isFluid(pi.item))
}

export function canUnloadHere(p: Platform | undefined, item: string): boolean {
  return !!p && p.type !== 'empty' && p.mode === 'unload' && isFluid(item) === (p.type === 'fluid')
}

export function ruleText(rule: Rule | undefined): string {
  if (!rule || rule.mode === 'any') return 'anything'
  if (rule.mode === 'none') return 'nothing'
  return (rule.items || []).join(', ') || '(no items listed)'
}

export interface Pickup {
  train: World['trains'][number]
  stopIdx: number
  station: Station
  car: number
  item: string
  rate: number
  delivered: { stopIdx: number; station: Station } | null
  carryPath: number[]
}

export interface Deposit {
  train: World['trains'][number]
  stopIdx: number
  station: Station
  car: number
  item: string
  rate: number
  fromStation: Station
}

export interface TruckPickup {
  truck: Truck
  stopIdx: number
  station: TruckStation
  item: string
  rate: number
  delivered: { stopIdx: number; station: TruckStation } | null
  carryPath: number[]
}

export interface TruckDeposit {
  truck: Truck
  stopIdx: number
  station: TruckStation
  item: string
  rate: number
  fromStation: TruckStation
}

/** One delivery leg: `drone` carries `item` from `fromPort` to `toPort`. */
export interface DroneFlow {
  drone: Drone
  fromPort: DronePort
  toPort: DronePort
  item: string
  rate: number
}

export interface Analysis {
  errors: string[]
  warnings: string[]
  pickups: Pickup[]
  deposits: Deposit[]
  truckPickups: TruckPickup[]
  truckDeposits: TruckDeposit[]
  droneFlows: DroneFlow[]
}

export function analyze(w: World): Analysis {
  const errors: string[] = []
  const warnings: string[] = []
  const stById: Record<string, Station> = {}
  w.stations.forEach((s) => (stById[s.id] = s))

  /* structural sanity */
  w.trains.forEach((tr) => {
    if (tr.cars.filter((c) => c === 'F' || c === 'L').length === 0)
      warnings.push(`<b>${esc(tr.name)}</b> has no freight or fluid cars, so it can never carry anything.`)
    if (!(tr.stops || []).length) warnings.push(`<b>${esc(tr.name)}</b> has no route defined.`)
    else if (tr.stops.length === 1)
      warnings.push(
        `<b>${esc(tr.name)}</b> only visits one station. A loop needs at least two stops to move anything.`,
      )
    ;(tr.stops || []).forEach((stop, si) => {
      if (stop.stationId === null || !stById[stop.stationId])
        warnings.push(
          `<b>${esc(tr.name)}</b> stop ${si + 1} points at a deleted station. Remove or reassign it.`,
        )
    })
  })
  w.stations.forEach((st) => {
    st.platforms.forEach((p, i) => {
      if (p.type === 'empty' || p.mode !== 'load') return
      if (p.type === 'fluid') {
        const pi = (p.items || [])[0]
        if (!pi || !pi.item)
          warnings.push(`<b>${esc(st.name)}</b> platform ${i + 1} is a fluid load platform with no fluid assigned.`)
        else {
          if (!isFluid(pi.item))
            warnings.push(
              `<b>${esc(st.name)}</b> platform ${i + 1} is a fluid platform but is set to load ${esc(pi.item)}, which is not a fluid. It will load nothing.`,
            )
          else if (!(+pi.rate > 0))
            warnings.push(`<b>${esc(st.name)}</b> platform ${i + 1} loads ${esc(pi.item)} at 0/min. Set a rate.`)
        }
      } else {
        const named = (p.items || []).filter((x) => x.item)
        if (!named.length)
          warnings.push(`<b>${esc(st.name)}</b> platform ${i + 1} is set to load but has no items assigned.`)
        named.forEach((x) => {
          if (isFluid(x.item))
            warnings.push(
              `<b>${esc(st.name)}</b> platform ${i + 1} is a regular platform but is set to load ${esc(x.item)}, which is a fluid. Make it a fluid platform. It will load nothing as configured.`,
            )
          else if (!(+x.rate > 0))
            warnings.push(`<b>${esc(st.name)}</b> platform ${i + 1} loads ${esc(x.item)} at 0/min. Set a rate.`)
        })
      }
    })
  })

  /* pickups: what each train actually collects, car by car */
  const pickups: Pickup[] = []
  w.trains.forEach((tr) => {
    ;(tr.stops || []).forEach((stop, si) => {
      const st = stop.stationId ? stById[stop.stationId] : undefined
      if (!st) return
      for (let c = 1; c < tr.cars.length; c++) {
        if (tr.cars[c] === 'E') continue
        const p = st.platforms[c - 1]
        if (!p) continue
        /* freight cars dock regular platforms, fluid cars dock fluid platforms */
        if ((tr.cars[c] === 'L') !== (p.type === 'fluid')) continue
        loadableFeeds(p).forEach((pi) => {
          if (ruleAllows(stop.load, pi.item))
            pickups.push({
              train: tr,
              stopIdx: si,
              station: st,
              car: c,
              item: pi.item.trim(),
              rate: +pi.rate || 0,
              delivered: null,
              carryPath: [],
            })
        })
      }
    })
  })

  /* flows: each pickup rides until the first stop where it can be unloaded */
  const deposits: Deposit[] = []
  pickups.forEach((pk) => {
    const stops = pk.train.stops
    const L = stops.length
    for (let k = 1; k < L; k++) {
      const t = (pk.stopIdx + k) % L
      const stop = stops[t]
      const st = stop.stationId ? stById[stop.stationId] : undefined
      if (!st) continue
      const p = st.platforms[pk.car - 1]
      if (canUnloadHere(p, pk.item) && ruleAllows(stop.unload, pk.item)) {
        pk.delivered = { stopIdx: t, station: st }
        deposits.push({
          train: pk.train,
          stopIdx: t,
          station: st,
          car: pk.car,
          item: pk.item,
          rate: pk.rate,
          fromStation: pk.station,
        })
        break
      }
      pk.carryPath.push(t)
    }
    if (!pk.delivered)
      warnings.push(
        `<b>${esc(pk.train.name)}</b> loads <b>${esc(pk.item)}</b> at ${esc(pk.station.name)} (car ${pk.car}) but never unloads it anywhere on its route. That car will fill up and stall loading.`,
      )
  })

  /* ERROR A: explicit load item that the train cannot actually collect */
  w.trains.forEach((tr) => {
    ;(tr.stops || []).forEach((stop, si) => {
      if (stop.load.mode !== 'list') return
      const st = stop.stationId ? stById[stop.stationId] : undefined
      if (!st) return
      ;(stop.load.items || []).forEach((item) => {
        const got = pickups.some(
          (pk) => pk.train === tr && pk.stopIdx === si && pk.item.toLowerCase() === item.toLowerCase(),
        )
        if (got) return
        const sources = st.platforms
          .map((p, i) => ({ p, pos: i + 1 }))
          .filter((x) => loadableFeeds(x.p).some((pi) => pi.item.toLowerCase() === item.toLowerCase()))
        let why: string
        if (!sources.length) {
          const misconfigured = st.platforms
            .map((p, i) => ({ p, pos: i + 1 }))
            .filter(
              (x) =>
                x.p.type !== 'empty' &&
                x.p.mode === 'load' &&
                (x.p.items || []).some((pi) => pi.item && pi.item.toLowerCase() === item.toLowerCase()),
            )
          if (misconfigured.length) {
            why =
              misconfigured
                .map(
                  (x) =>
                    `platform ${x.pos} is set to load it but is a ${x.p.type} platform, which can't handle ${isFluid(item) ? 'fluids' : 'solid items'}`,
                )
                .join('; ') + '.'
          } else {
            why = `${esc(st.name)} has no load platform providing it.`
          }
        } else {
          why = sources
            .map((x) => {
              if (x.pos >= tr.cars.length) return `platform ${x.pos} (train is too short to reach it)`
              if (tr.cars[x.pos] === 'E') return `platform ${x.pos} (engine occupies that car position)`
              if (x.p.type === 'fluid' && tr.cars[x.pos] !== 'L')
                return `platform ${x.pos} (fluid platform, but the train has a freight car there; it needs a fluid car)`
              if (x.p.type !== 'fluid' && tr.cars[x.pos] === 'L')
                return `platform ${x.pos} (regular platform, but the train has a fluid car there; it needs a freight car)`
              return `platform ${x.pos}`
            })
            .join(' and ')
          why = `it is only available at ${why}.`
        }
        errors.push(
          `<b>${esc(tr.name)}</b> is set to load <b>${esc(item)}</b> at ${esc(st.name)}, but no valid freight car can collect it: ${why}`,
        )
      })
    })
  })

  /* ERRORS B + C: two trains contending for the same item on the same platform */
  const byPlat: Record<string, Pickup[]> = {}
  pickups.forEach((pk) => {
    const key = pk.station.id + '|' + pk.car + '|' + pk.item.toLowerCase()
    ;(byPlat[key] = byPlat[key] || []).push(pk)
  })
  const reported = new Set<string>()
  Object.values(byPlat).forEach((list) => {
    const trains = [...new Map(list.map((pk) => [pk.train.id, pk.train])).values()]
    if (trains.length < 2) return
    const pk = list[0]
    const names = trains.map((t) => `<b>${esc(t.name)}</b>`).join(' and ')
    const rkey =
      pk.station.id +
      '|' +
      pk.car +
      '|' +
      pk.item.toLowerCase() +
      '|' +
      trains
        .map((t) => t.id)
        .sort()
        .join(',')
    if (reported.has(rkey)) return
    reported.add(rkey)
    errors.push(
      `${names} both pick up <b>${esc(pk.item)}</b> from platform ${pk.car} at ${esc(pk.station.name)}. Each item feed should go to exactly one train. Fix by blocking car position ${pk.car} on all but one of these trains with an engine or a car of the other type (or by shortening them or restricting their load rules).`,
    )
  })

  /* explicit unload item that never happens */
  w.trains.forEach((tr) => {
    ;(tr.stops || []).forEach((stop, si) => {
      if (stop.unload.mode !== 'list') return
      const st = stop.stationId ? stById[stop.stationId] : undefined
      if (!st) return
      ;(stop.unload.items || []).forEach((item) => {
        const done = deposits.some(
          (d) => d.train === tr && d.stopIdx === si && d.item.toLowerCase() === item.toLowerCase(),
        )
        if (done) return
        const carrying = pickups.filter((pk) => pk.train === tr && pk.item.toLowerCase() === item.toLowerCase())
        let why: string
        if (!carrying.length) {
          why = `the train never loads ${esc(item)} anywhere on its route.`
        } else {
          const passes = carrying.filter((pk) => pk.carryPath.includes(si))
          const early = carrying.filter(
            (pk) => pk.delivered && !pk.carryPath.includes(si) && pk.delivered.stopIdx !== si,
          )
          if (passes.length) {
            const cars = [...new Set(passes.map((pk) => pk.car))]
            why =
              cars
                .map((c) => {
                  const p = st.platforms[c - 1]
                  if (!p) return `car ${c} carries it here but ${esc(st.name)} has no platform at position ${c}`
                  if (p.type === 'empty') return `car ${c} carries it here but platform ${c} is set to empty`
                  if (p.mode !== 'unload')
                    return `car ${c} carries it here but platform ${c} is set to load, not unload`
                  if (isFluid(item) !== (p.type === 'fluid'))
                    return isFluid(item)
                      ? `car ${c} carries it here but platform ${c} is a regular platform; fluids need a fluid platform`
                      : `car ${c} carries it here but platform ${c} is a fluid platform, which can't take solid items`
                  return `car ${c} carries it here but the stop's unload rule filters it out`
                })
                .join('; ') + '.'
          } else if (early.length) {
            const d = early[0].delivered!
            why = `it is already fully unloaded at ${esc(d.station.name)} (stop ${d.stopIdx + 1}) before this stop.`
          } else {
            why = `no car carrying it reaches this stop.`
          }
        }
        warnings.push(
          `<b>${esc(tr.name)}</b> is set to unload <b>${esc(item)}</b> at ${esc(st.name)}, but never does: ${why}`,
        )
      })
    })
  })

  /* orphaned platforms */
  w.stations.forEach((st) => {
    st.platforms.forEach((p, i) => {
      if (p.type === 'empty') return
      if (p.mode === 'load') {
        loadableFeeds(p).forEach((pi) => {
          const served = pickups.some(
            (pk) => pk.station === st && pk.car === i + 1 && pk.item.toLowerCase() === pi.item.toLowerCase(),
          )
          if (!served)
            warnings.push(
              `Platform ${i + 1} at <b>${esc(st.name)}</b> loads ${esc(pi.item)} (${fmt(pi.rate)}/min) but no train ever collects it.`,
            )
        })
      }
      if (p.mode === 'unload') {
        const fed = deposits.some((d) => d.station === st && d.car === i + 1)
        if (!fed)
          warnings.push(
            `Platform ${i + 1} at <b>${esc(st.name)}</b> is set to unload but no train ever delivers anything to it.`,
          )
      }
    })
  })

  /* trucks and drones are independent networks; run their passes and merge the
     issues (trains first, so worlds with no trucks/drones are unaffected) */
  const t = analyzeTrucks(w)
  errors.push(...t.errors)
  warnings.push(...t.warnings)
  const d = analyzeDrones(w)
  errors.push(...d.errors)
  warnings.push(...d.warnings)

  return {
    errors,
    warnings,
    pickups,
    deposits,
    truckPickups: t.truckPickups,
    truckDeposits: t.truckDeposits,
    droneFlows: d.droneFlows,
  }
}

/**
 * Road-vehicle pass: the truck analogue of the train pass above, minus car
 * positions (a truck has one cargo hold). A truck station is a single dock, so
 * `loadableFeeds`/`canUnloadHere` are reused directly (a TruckStation is
 * structurally a Platform whose type is 'regular' | 'fluid'). Cargo is only
 * exchanged when the vehicle's phase matches the dock's: a fluid truck uses
 * fluid stations, solid vehicles use regular stations.
 */
export function analyzeTrucks(w: World): {
  errors: string[]
  warnings: string[]
  truckPickups: TruckPickup[]
  truckDeposits: TruckDeposit[]
} {
  const errors: string[] = []
  const warnings: string[] = []
  const truckPickups: TruckPickup[] = []
  const truckDeposits: TruckDeposit[] = []
  const stById: Record<string, TruckStation> = {}
  ;(w.truckStations || []).forEach((s) => (stById[s.id] = s))

  const isFluidTruck = (tk: Truck): boolean => tk.type === 'fluid-truck'

  /* structural sanity */
  ;(w.trucks || []).forEach((tk) => {
    const fluidV = isFluidTruck(tk)
    if (!(tk.stops || []).length) warnings.push(`<b>${esc(tk.name)}</b> has no route defined.`)
    else if (tk.stops.length === 1)
      warnings.push(
        `<b>${esc(tk.name)}</b> only visits one truck station. A loop needs at least two stops to move anything.`,
      )
    ;(tk.stops || []).forEach((stop, si) => {
      const st = stop.stationId ? stById[stop.stationId] : undefined
      if (!st) {
        warnings.push(
          `<b>${esc(tk.name)}</b> stop ${si + 1} points at a deleted truck station. Remove or reassign it.`,
        )
        return
      }
      if (fluidV !== (st.type === 'fluid'))
        warnings.push(
          `<b>${esc(tk.name)}</b> stop ${si + 1} docks <b>${esc(st.name)}</b>, but ${
            fluidV
              ? 'a fluid truck can only use fluid truck stations'
              : 'a solid vehicle can only use regular truck stations'
          }, so it exchanges no cargo there.`,
        )
    })
  })

  /* truck-station load config */
  ;(w.truckStations || []).forEach((st) => {
    if (st.mode !== 'load') return
    if (st.type === 'fluid') {
      const pi = (st.items || [])[0]
      if (!pi || !pi.item) warnings.push(`<b>${esc(st.name)}</b> is a fluid truck station with no fluid assigned.`)
      else if (!isFluid(pi.item))
        warnings.push(
          `<b>${esc(st.name)}</b> is a fluid truck station but is set to load ${esc(pi.item)}, which is not a fluid. It will load nothing.`,
        )
      else if (!(+pi.rate > 0))
        warnings.push(`<b>${esc(st.name)}</b> loads ${esc(pi.item)} at 0/min. Set a rate.`)
    } else {
      const named = (st.items || []).filter((x) => x.item)
      if (!named.length) warnings.push(`<b>${esc(st.name)}</b> is set to load but has no items assigned.`)
      named.forEach((x) => {
        if (isFluid(x.item))
          warnings.push(
            `<b>${esc(st.name)}</b> is a regular truck station but is set to load ${esc(x.item)}, which is a fluid. Use a fluid truck station. It will load nothing as configured.`,
          )
        else if (!(+x.rate > 0)) warnings.push(`<b>${esc(st.name)}</b> loads ${esc(x.item)} at 0/min. Set a rate.`)
      })
    }
  })

  /* pickups: what each truck collects from the load docks it can use */
  ;(w.trucks || []).forEach((tk) => {
    const fluidV = isFluidTruck(tk)
    ;(tk.stops || []).forEach((stop, si) => {
      const st = stop.stationId ? stById[stop.stationId] : undefined
      if (!st) return
      if (fluidV !== (st.type === 'fluid')) return
      loadableFeeds(st).forEach((pi) => {
        if (ruleAllows(stop.load, pi.item))
          truckPickups.push({
            truck: tk,
            stopIdx: si,
            station: st,
            item: pi.item.trim(),
            rate: +pi.rate || 0,
            delivered: null,
            carryPath: [],
          })
      })
    })
  })

  /* flows: each pickup rides until the first dock where it can unload */
  truckPickups.forEach((pk) => {
    const stops = pk.truck.stops
    const L = stops.length
    for (let k = 1; k < L; k++) {
      const t = (pk.stopIdx + k) % L
      const st = stops[t].stationId ? stById[stops[t].stationId!] : undefined
      if (!st) continue
      if (canUnloadHere(st, pk.item) && ruleAllows(stops[t].unload, pk.item)) {
        pk.delivered = { stopIdx: t, station: st }
        truckDeposits.push({
          truck: pk.truck,
          stopIdx: t,
          station: st,
          item: pk.item,
          rate: pk.rate,
          fromStation: pk.station,
        })
        break
      }
      pk.carryPath.push(t)
    }
    if (!pk.delivered)
      warnings.push(
        `<b>${esc(pk.truck.name)}</b> loads <b>${esc(pk.item)}</b> at ${esc(pk.station.name)} but never unloads it anywhere on its route. It will fill up and stall loading.`,
      )
  })

  /* ERROR: explicit load item the truck cannot actually collect */
  ;(w.trucks || []).forEach((tk) => {
    const fluidV = isFluidTruck(tk)
    ;(tk.stops || []).forEach((stop, si) => {
      if (stop.load.mode !== 'list') return
      const st = stop.stationId ? stById[stop.stationId] : undefined
      if (!st) return
      ;(stop.load.items || []).forEach((item) => {
        const got = truckPickups.some(
          (pk) => pk.truck === tk && pk.stopIdx === si && pk.item.toLowerCase() === item.toLowerCase(),
        )
        if (got) return
        let why: string
        if (st.mode !== 'load') why = `${esc(st.name)} is set to unload, not load.`
        else if (fluidV !== (st.type === 'fluid'))
          why = fluidV
            ? `${esc(st.name)} is a regular truck station and cannot be docked by a fluid truck.`
            : `${esc(st.name)} is a fluid truck station, which only docks fluid trucks.`
        else if (isFluid(item) !== (st.type === 'fluid'))
          why =
            st.type === 'fluid'
              ? `${esc(item)} is not a fluid, so this fluid truck station can't load it.`
              : `${esc(item)} is a fluid, so this regular truck station can't load it.`
        else why = `${esc(st.name)} has no load dock providing it.`
        errors.push(
          `<b>${esc(tk.name)}</b> is set to load <b>${esc(item)}</b> at ${esc(st.name)}, but can't: ${why}`,
        )
      })
    })
  })

  /* ERROR: two trucks contending for the same feed at the same station */
  const byStation: Record<string, TruckPickup[]> = {}
  truckPickups.forEach((pk) => {
    const key = pk.station.id + '|' + pk.item.toLowerCase()
    ;(byStation[key] = byStation[key] || []).push(pk)
  })
  Object.values(byStation).forEach((list) => {
    const trucks = [...new Map(list.map((pk) => [pk.truck.id, pk.truck])).values()]
    if (trucks.length < 2) return
    const pk = list[0]
    const names = trucks.map((t) => `<b>${esc(t.name)}</b>`).join(' and ')
    errors.push(
      `${names} both pick up <b>${esc(pk.item)}</b> at ${esc(pk.station.name)}. Each item feed should go to exactly one vehicle. Restrict their load rules or reroute all but one.`,
    )
  })

  /* explicit unload item that never happens */
  ;(w.trucks || []).forEach((tk) => {
    ;(tk.stops || []).forEach((stop, si) => {
      if (stop.unload.mode !== 'list') return
      const st = stop.stationId ? stById[stop.stationId] : undefined
      if (!st) return
      ;(stop.unload.items || []).forEach((item) => {
        const done = truckDeposits.some(
          (d) => d.truck === tk && d.stopIdx === si && d.item.toLowerCase() === item.toLowerCase(),
        )
        if (done) return
        const carrying = truckPickups.filter(
          (pk) => pk.truck === tk && pk.item.toLowerCase() === item.toLowerCase(),
        )
        let why: string
        if (!carrying.length) {
          why = `the truck never loads ${esc(item)} anywhere on its route.`
        } else {
          const passes = carrying.filter((pk) => pk.carryPath.includes(si))
          const early = carrying.filter(
            (pk) => pk.delivered && !pk.carryPath.includes(si) && pk.delivered.stopIdx !== si,
          )
          if (passes.length) {
            if (st.mode !== 'unload') why = `${esc(st.name)} is set to load, not unload.`
            else if (isFluid(item) !== (st.type === 'fluid'))
              why =
                st.type === 'fluid'
                  ? `${esc(st.name)} is a fluid truck station, which can't take ${esc(item)}.`
                  : `${esc(st.name)} is a regular truck station; ${esc(item)} needs a fluid truck station.`
            else why = `the stop's unload rule filters it out.`
          } else if (early.length) {
            const d = early[0].delivered!
            why = `it is already unloaded at ${esc(d.station.name)} (stop ${d.stopIdx + 1}) before this stop.`
          } else {
            why = `no run carrying it reaches this stop.`
          }
        }
        warnings.push(
          `<b>${esc(tk.name)}</b> is set to unload <b>${esc(item)}</b> at ${esc(st.name)}, but never does: ${why}`,
        )
      })
    })
  })

  /* orphaned truck stations */
  ;(w.truckStations || []).forEach((st) => {
    if (st.mode === 'load') {
      loadableFeeds(st).forEach((pi) => {
        const served = truckPickups.some(
          (pk) => pk.station === st && pk.item.toLowerCase() === pi.item.toLowerCase(),
        )
        if (!served)
          warnings.push(
            `<b>${esc(st.name)}</b> loads ${esc(pi.item)} (${fmt(pi.rate)}/min) but no truck ever collects it.`,
          )
      })
    } else {
      const fed = truckDeposits.some((d) => d.station === st)
      if (!fed)
        warnings.push(`<b>${esc(st.name)}</b> is set to unload but no truck ever delivers anything to it.`)
    }
  })

  return { errors, warnings, truckPickups, truckDeposits }
}

/**
 * Drone pass. A drone links a home port to one destination port and shuttles
 * cargo both ways: each port's `items` (solids only — drones carry items, so
 * package fluids first) are flown to the other port. Delivery between the two
 * ports is guaranteed, so there is no "never unloaded" case; the checks are
 * about links (missing/self/duplicate home) and feed contention.
 */
export function analyzeDrones(w: World): {
  errors: string[]
  warnings: string[]
  droneFlows: DroneFlow[]
} {
  const errors: string[] = []
  const warnings: string[] = []
  const droneFlows: DroneFlow[] = []
  const portById: Record<string, DronePort> = {}
  ;(w.dronePorts || []).forEach((p) => (portById[p.id] = p))

  /** Items a port can actually send: named solids (fluids can't ride a drone). */
  const sendable = (p: DronePort): PlatItem[] => (p.items || []).filter((pi) => pi.item && !isFluid(pi.item))

  /* port config */
  ;(w.dronePorts || []).forEach((p) => {
    ;(p.items || [])
      .filter((x) => x.item)
      .forEach((x) => {
        if (isFluid(x.item))
          warnings.push(
            `<b>${esc(p.name)}</b> is set to send ${esc(x.item)}, which is a fluid. Drones carry items only — package it first. It will send nothing as configured.`,
          )
        else if (!(+x.rate > 0)) warnings.push(`<b>${esc(p.name)}</b> sends ${esc(x.item)} at 0/min. Set a rate.`)
      })
  })

  /* per-drone links and flows */
  ;(w.drones || []).forEach((dr) => {
    const home = dr.homeId ? portById[dr.homeId] : undefined
    const dest = dr.destId ? portById[dr.destId] : undefined
    if (!home) warnings.push(`<b>${esc(dr.name)}</b> has no home port set.`)
    if (!dest) warnings.push(`<b>${esc(dr.name)}</b> has no destination port set.`)
    if (!home || !dest) return
    if (home === dest) {
      warnings.push(`<b>${esc(dr.name)}</b> has the same home and destination port, so it can't move anything.`)
      return
    }
    let moved = false
    ;([[home, dest], [dest, home]] as [DronePort, DronePort][]).forEach(([from, to]) => {
      sendable(from).forEach((pi) => {
        moved = true
        droneFlows.push({ drone: dr, fromPort: from, toPort: to, item: pi.item.trim(), rate: +pi.rate || 0 })
      })
    })
    if (!moved)
      warnings.push(
        `<b>${esc(dr.name)}</b> links <b>${esc(home.name)}</b> and <b>${esc(dest.name)}</b>, but neither port has items to send.`,
      )
  })

  /* ERROR: a port can host only one drone (its home) */
  const byHome: Record<string, Drone[]> = {}
  ;(w.drones || []).forEach((dr) => {
    if (dr.homeId) (byHome[dr.homeId] = byHome[dr.homeId] || []).push(dr)
  })
  Object.entries(byHome).forEach(([hid, ds]) => {
    if (ds.length < 2) return
    const p = portById[hid]
    if (!p) return
    const names = ds.map((dr) => `<b>${esc(dr.name)}</b>`).join(' and ')
    errors.push(
      `${names} share the home port <b>${esc(p.name)}</b>, but a drone port can host only one drone. Give each its own home port.`,
    )
  })

  /* ERROR: the same feed picked up by two drones */
  const byFeed: Record<string, DroneFlow[]> = {}
  droneFlows.forEach((f) => {
    const key = f.fromPort.id + '|' + f.item.toLowerCase()
    ;(byFeed[key] = byFeed[key] || []).push(f)
  })
  Object.values(byFeed).forEach((list) => {
    const drones = [...new Map(list.map((f) => [f.drone.id, f.drone])).values()]
    if (drones.length < 2) return
    const f = list[0]
    const names = drones.map((dr) => `<b>${esc(dr.name)}</b>`).join(' and ')
    errors.push(
      `${names} both pick up <b>${esc(f.item)}</b> from <b>${esc(f.fromPort.name)}</b>. Each feed should go to one drone. Link that port with a single drone.`,
    )
  })

  /* orphaned ports */
  const endpoints = new Set<string>()
  ;(w.drones || []).forEach((dr) => {
    if (dr.homeId) endpoints.add(dr.homeId)
    if (dr.destId) endpoints.add(dr.destId)
  })
  ;(w.dronePorts || []).forEach((p) => {
    if (!endpoints.has(p.id)) warnings.push(`<b>${esc(p.name)}</b> isn't linked to any drone, so it moves no cargo.`)
  })

  return { errors, warnings, droneFlows }
}
