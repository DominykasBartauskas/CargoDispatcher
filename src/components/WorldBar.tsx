import { newWorld } from '../lib/model'
import { useDialogs } from '../lib/dialogs'
import type { AppState, Update, World } from '../lib/types'

interface Props {
  state: AppState
  update: Update
  onExport: (world: World) => void
  onImport: () => void
}

export function WorldBar({ state, update, onExport, onImport }: Props) {
  const dialogs = useDialogs()
  const w = state.worlds[state.active]

  const pickWorld = (i: number) => update((s) => void (s.active = i))

  const renameActive = async () => {
    const name = await dialogs.prompt('Rename world:', w.name)
    if (name === null) return
    update((s) => {
      const cw = s.worlds[s.active]
      cw.name = name.trim() || cw.name
    })
  }

  const addWorld = async () => {
    const name = await dialogs.prompt('World name:', 'World ' + (state.worlds.length + 1))
    if (name === null) return
    update((s) => {
      s.worlds.push(newWorld(name.trim() || 'World ' + (s.worlds.length + 1)))
      s.active = s.worlds.length - 1
    })
  }

  const deleteWorld = async () => {
    const ok = await dialogs.confirm(`Delete world "${w.name}" and everything in it?`)
    if (!ok) return
    update((s) => {
      s.worlds.splice(s.active, 1)
      if (!s.worlds.length) s.worlds.push(newWorld('World 1'))
      s.active = Math.max(0, s.active - 1)
    })
  }

  const onTabDoubleClick = (i: number) => {
    update((s) => void (s.active = i))
    void (async () => {
      const name = await dialogs.prompt('Rename world:', state.worlds[i].name)
      if (name !== null)
        update((s) => {
          const cw = s.worlds[s.active]
          cw.name = name.trim() || cw.name
        })
    })()
  }

  return (
    <div className="worldbar">
      {state.worlds.map((world, i) => (
        <button
          key={world.id}
          className={`wtab ${i === state.active ? 'active' : ''}`}
          title="Double-click to rename"
          onClick={() => pickWorld(i)}
          onDoubleClick={() => onTabDoubleClick(i)}
        >
          {world.name}
        </button>
      ))}
      <button className="btn small" title="New world" onClick={addWorld}>
        +
      </button>
      <span className="spacer" />
      <span className="wactions">
        <button className="btn small" onClick={renameActive}>
          Rename
        </button>
        <button className="btn small" onClick={() => onExport(w)}>
          Export JSON
        </button>
        <button className="btn small" onClick={onImport}>
          Import JSON
        </button>
        <button className="btn small danger" onClick={deleteWorld}>
          Delete world
        </button>
      </span>
    </div>
  )
}
