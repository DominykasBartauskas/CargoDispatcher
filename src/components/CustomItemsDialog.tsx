import { useEffect, useRef, useState } from 'react'
import { parseCustomItems } from '../lib/catalog'
import { slugify } from '../lib/model'
import { ExportDialog } from './ExportDialog'
import { CustomItemsImportDialog } from './CustomItemsImportDialog'
import type { Update, World } from '../lib/types'

interface Props {
  open: boolean
  world: World
  update: Update
  onClose: () => void
}

/**
 * Editor for a world's user-defined items (the "Other" catalog group), shown
 * as a modal from the world bar. One item per line; the parsed list feeds
 * every item picker in the app.
 *
 * The textarea is uncontrolled (keyed by world id + an import revision so it
 * resets on world switch or import) — that keeps raw editing intact (blank
 * lines, trailing newlines) while we commit the cleaned list on every change
 * for the pickers to pick up.
 */
export function CustomItemsDialog({ open, world, update, onClose }: Props) {
  const dlgRef = useRef<HTMLDialogElement>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [importRev, setImportRev] = useState(0)
  const count = world.customItems.length

  useEffect(() => {
    const dlg = dlgRef.current
    if (!dlg) return
    if (open && !dlg.open) dlg.showModal()
    else if (!open && dlg.open) dlg.close()
  }, [open])

  const commit = (text: string) =>
    update((s) => {
      s.worlds[s.active].customItems = parseCustomItems(text)
    })

  const applyImport = (items: string[]) => {
    update((s) => {
      s.worlds[s.active].customItems = items
    })
    setImportRev((r) => r + 1) // force the uncontrolled textarea to pick up the new list
  }

  return (
    <>
      <dialog
        ref={dlgRef}
        onCancel={(e) => { e.preventDefault(); onClose() }}
        style={{ maxWidth: 680, width: '92vw' }}
      >
        <div className="cardhead">
          <span className="label">Custom items · the "Other" group</span>
          <span className="spacer" />
          <span className="label">
            {count} item{count === 1 ? '' : 's'}
          </span>
          <button className="btn small" onClick={() => setExportOpen(true)}>
            Export
          </button>
          <button className="btn small" onClick={() => setImportOpen(true)}>
            Import
          </button>
        </div>
        <span className="dimtxt">
          Add anything not in the built-in catalog — one item per line. These show up under an
          <strong> Other</strong> group in every item picker (stations, platforms, routes, drone
          ports). Custom items are treated as solids. Blank lines, duplicates, and names already in
          the catalog are ignored.
        </span>
        <textarea
          key={`${world.id}:${importRev}`}
          className="customlist"
          defaultValue={world.customItems.join('\n')}
          placeholder={'Ficsit Merch\nCoffee Cup\nSpare Parts'}
          spellCheck={false}
          onChange={(e) => commit(e.target.value)}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <button className="btn primary" onClick={onClose}>
            Close
          </button>
        </div>
      </dialog>

      <ExportDialog
        open={exportOpen}
        title={`Export custom items from "${world.name}"`}
        text={world.customItems.join('\n')}
        filename={slugify(world.name, 'world') + '-custom-items.txt'}
        onClose={() => setExportOpen(false)}
      />
      <CustomItemsImportDialog
        open={importOpen}
        existing={world.customItems}
        onClose={() => setImportOpen(false)}
        onApply={applyImport}
      />
    </>
  )
}
