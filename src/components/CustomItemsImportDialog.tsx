import { useEffect, useRef, useState } from 'react'
import { mergeCustomItems, parseCustomItemsImport } from '../lib/catalog'
import { useDialogs } from '../lib/dialogs'

const inset = 'var(--color-inset)'
const ink = 'var(--color-ink)'
const line = 'var(--color-line)'

type Mode = 'merge' | 'replace'

/**
 * Import a custom-items list (one item per line, or a JSON array / world
 * export). Merge appends to the current list; Replace overwrites it. The
 * caller receives the resulting clean list.
 */
export function CustomItemsImportDialog({
  open,
  existing,
  onClose,
  onApply,
}: {
  open: boolean
  existing: string[]
  onClose: () => void
  onApply: (items: string[]) => void
}) {
  const dialogs = useDialogs()
  const dlgRef = useRef<HTMLDialogElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [text, setText] = useState('')
  const [mode, setMode] = useState<Mode>('merge')

  useEffect(() => {
    const dlg = dlgRef.current
    if (!dlg) return
    if (open && !dlg.open) dlg.showModal()
    else if (!open && dlg.open) dlg.close()
  }, [open])

  const apply = (raw: string) => {
    const incoming = parseCustomItemsImport(raw)
    if (!incoming.length) {
      void dialogs.notice('No new items found — the list was empty or every item is already known.')
      return
    }
    onApply(mode === 'replace' ? incoming : mergeCustomItems(existing, incoming))
    setText('')
    onClose()
  }

  const importPasted = () => {
    const raw = text.trim()
    if (!raw) {
      void dialogs.notice('Paste a list first, or use "Choose file".')
      return
    }
    apply(raw)
  }

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const rd = new FileReader()
    rd.onload = () => apply(String(rd.result))
    rd.readAsText(file)
  }

  return (
    <dialog ref={dlgRef} onCancel={(e) => { e.preventDefault(); onClose() }} style={{ maxWidth: 680, width: '92vw' }}>
      <div className="label" style={{ marginBottom: 8 }}>
        Import custom items
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <span className="label">On import</span>
        <span className="seg">
          <button className={mode === 'merge' ? 'on regular' : ''} onClick={() => setMode('merge')}>
            Merge
          </button>
          <button className={mode === 'replace' ? 'on regular' : ''} onClick={() => setMode('replace')}>
            Replace
          </button>
        </span>
        <span className="hint" style={{ margin: 0 }}>
          {mode === 'merge' ? 'Add to the current list.' : 'Overwrite the current list.'}
        </span>
      </div>
      <textarea
        spellCheck={false}
        placeholder={'Paste one item per line, or a JSON array…\nFicsit Merch\nCoffee Cup'}
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
          Import
        </button>
      </div>
      <input ref={fileRef} type="file" accept=".txt,.json,text/plain,application/json" style={{ display: 'none' }} onChange={onFile} />
    </dialog>
  )
}
