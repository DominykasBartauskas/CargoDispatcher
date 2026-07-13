import { useEffect, useRef, useState } from 'react'
import { migrateWorld, uid } from '../lib/model'
import { useDialogs } from '../lib/dialogs'
import type { World } from '../lib/types'

const inset = 'var(--color-inset)'
const ink = 'var(--color-ink)'
const line = 'var(--color-line)'

function parseWorld(text: string): World {
  const data = JSON.parse(text) as Partial<World>
  if (!data || typeof data.name !== 'string' || !Array.isArray(data.trains) || !Array.isArray(data.stations))
    throw new Error('Not a valid world export.')
  data.id = uid()
  return migrateWorld(data as World)
}

export function ImportDialog({
  open,
  onClose,
  onImport,
}: {
  open: boolean
  onClose: () => void
  onImport: (world: World) => void
}) {
  const dialogs = useDialogs()
  const dlgRef = useRef<HTMLDialogElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [text, setText] = useState('')

  useEffect(() => {
    const dlg = dlgRef.current
    if (!dlg) return
    if (open && !dlg.open) dlg.showModal()
    else if (!open && dlg.open) dlg.close()
  }, [open])

  const doImport = (raw: string) => {
    onImport(parseWorld(raw))
  }

  const importPasted = () => {
    const raw = text.trim()
    if (!raw) {
      void dialogs.notice('Paste a world JSON first, or use "Choose file".')
      return
    }
    try {
      doImport(raw)
      setText('')
      onClose()
    } catch (err) {
      void dialogs.notice('Import failed: ' + (err as Error).message)
    }
  }

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const rd = new FileReader()
    rd.onload = () => {
      try {
        doImport(String(rd.result))
        onClose()
      } catch (err) {
        void dialogs.notice('Import failed: ' + (err as Error).message)
      }
    }
    rd.readAsText(file)
  }

  return (
    <dialog ref={dlgRef} onCancel={(e) => { e.preventDefault(); onClose() }} style={{ maxWidth: 680, width: '92vw' }}>
      <div className="label" style={{ marginBottom: 8 }}>
        Import world JSON
      </div>
      <textarea
        spellCheck={false}
        placeholder="Paste an exported world JSON here…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        style={{
          width: '100%',
          height: 220,
          background: inset,
          color: ink,
          border: `1px solid ${line}`,
          borderRadius: 4,
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          padding: 8,
          resize: 'vertical',
        }}
      />
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
        <button className="btn" onClick={onClose}>
          Cancel
        </button>
        <button className="btn" onClick={() => fileRef.current?.click()}>
          Choose file…
        </button>
        <button className="btn primary" onClick={importPasted}>
          Import pasted JSON
        </button>
      </div>
      <input ref={fileRef} type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={onFile} />
    </dialog>
  )
}
