import { useEffect, useRef, useState } from 'react'
import type { World } from '../lib/types'

const inset = 'var(--color-inset)'
const ink = 'var(--color-ink)'
const line = 'var(--color-line)'

/**
 * Export dialog: shows the world JSON with copy + best-effort download.
 * Published/sandboxed pages often block programmatic downloads, so the
 * clipboard path is the reliable one there.
 */
export function ExportDialog({ world, onClose }: { world: World | null; onClose: () => void }) {
  const dlgRef = useRef<HTMLDialogElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const [copyLabel, setCopyLabel] = useState('Copy to clipboard')

  useEffect(() => {
    const dlg = dlgRef.current
    if (!dlg) return
    if (world && !dlg.open) {
      setCopyLabel('Copy to clipboard')
      dlg.showModal()
    } else if (!world && dlg.open) {
      dlg.close()
    }
  }, [world])

  const text = world ? JSON.stringify(world, null, 2) : ''
  const filename =
    (world?.name.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'world') + '.json'

  const flash = (ok: boolean) => {
    setCopyLabel(ok ? 'Copied ✓' : 'Copy failed, select and copy manually')
    setTimeout(() => setCopyLabel('Copy to clipboard'), 2000)
  }
  const copy = async () => {
    const ta = taRef.current
    if (!ta) return
    try {
      await navigator.clipboard.writeText(ta.value)
      flash(true)
    } catch {
      try {
        ta.focus()
        ta.select()
        flash(document.execCommand('copy'))
      } catch {
        ta.focus()
        ta.select()
        flash(false)
      }
    }
  }
  const download = () => {
    const ta = taRef.current
    if (!ta) return
    try {
      const blob = new Blob([ta.value], { type: 'application/json' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = filename
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 5000)
    } catch {
      /* download blocked (sandboxed page) — clipboard is the fallback */
    }
  }

  return (
    <dialog ref={dlgRef} onCancel={(e) => { e.preventDefault(); onClose() }} style={{ maxWidth: 680, width: '92vw' }}>
      <div className="label" style={{ marginBottom: 8 }}>
        {world ? `Export "${world.name}" as JSON` : 'Export world JSON'}
      </div>
      <textarea
        ref={taRef}
        readOnly
        spellCheck={false}
        value={text}
        style={{
          width: '100%',
          height: 280,
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
      <div className="hint" style={{ margin: '8px 0 12px' }}>
        Some environments (like published artifact pages) block downloads. If the download button does
        nothing, copy the JSON and save it as a .json file.
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn" onClick={onClose}>
          Close
        </button>
        <button className="btn" onClick={copy}>
          {copyLabel}
        </button>
        <button className="btn primary" onClick={download}>
          Download
        </button>
      </div>
    </dialog>
  )
}
