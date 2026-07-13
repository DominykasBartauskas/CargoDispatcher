import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { analyze } from './lib/analysis'
import { defaultState } from './lib/model'
import { backendNote, loadInitialState, writeState } from './lib/storage'
import type { AppState, World } from './lib/types'
import { WorldBar } from './components/WorldBar'
import { SectionNav } from './components/SectionNav'
import { TrainsView } from './components/TrainsView'
import { StationsView } from './components/StationsView'
import { TrucksView } from './components/TrucksView'
import { TruckStationsView } from './components/TruckStationsView'
import { AnalysisView } from './components/AnalysisView'
import { ExportDialog } from './components/ExportDialog'
import { ImportDialog } from './components/ImportDialog'

const NOTE = backendNote()

function App() {
  const [state, setState] = useState<AppState>(defaultState)
  const [exportWorld, setExportWorld] = useState<World | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const ready = useRef(false)

  const update = useCallback((fn: (s: AppState) => void) => {
    setState((prev) => {
      const next = structuredClone(prev)
      fn(next)
      return next
    })
  }, [])

  /* Load persisted state once (cloud → localStorage fallback). */
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const s = await loadInitialState()
      if (!cancelled && s) setState(s)
      ready.current = true
    })()
    return () => {
      cancelled = true
    }
  }, [])

  /* Persist on change, debounced, only after the initial load resolves. */
  useEffect(() => {
    if (!ready.current) return
    const t = setTimeout(() => writeState(state), 150)
    return () => clearTimeout(t)
  }, [state])

  const world = state.worlds[state.active]
  const analysis = useMemo(() => analyze(world), [world])

  return (
    <>
      <header>
        <div className="brand">
          <h1>
            Rail <span className="dim">Dispatcher</span>
          </h1>
          <span className="sub">Satisfactory train network planner</span>
        </div>
        <div className="hazard" />
      </header>

      <WorldBar
        state={state}
        update={update}
        onExport={setExportWorld}
        onImport={() => setImportOpen(true)}
      />

      <main>
        <SectionNav section={state.section} analysis={analysis} update={update} />
        {state.section === 'trains' ? (
          <TrainsView world={world} collapsed={state.collapsed} update={update} />
        ) : state.section === 'stations' ? (
          <StationsView world={world} collapsed={state.collapsed} update={update} />
        ) : state.section === 'trucks' ? (
          <TrucksView world={world} collapsed={state.collapsed} update={update} />
        ) : state.section === 'truckStations' ? (
          <TruckStationsView world={world} collapsed={state.collapsed} update={update} />
        ) : (
          <AnalysisView world={world} analysis={analysis} />
        )}
      </main>

      <footer>
        <span>{NOTE.base}</span> <span id="storageNote">{NOTE.note}</span>
      </footer>

      <ExportDialog world={exportWorld} onClose={() => setExportWorld(null)} />
      <ImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={(w) =>
          update((s) => {
            s.worlds.push(w)
            s.active = s.worlds.length - 1
          })
        }
      />
    </>
  )
}

export default App
