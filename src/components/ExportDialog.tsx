import { useEffect, useRef, useState } from 'react'

const inset = 'var(--color-inset)'
const ink = 'var(--color-ink)'
const line = 'var(--color-line)'

/**
 * Generic export dialog: shows text with copy + best-effort download.
 * Published/sandboxed pages often block programmatic downloads, so the
 * clipboard path is the reliable one there. Used for both world JSON and the
 * custom-items list.
 */
export function ExportDialog({
  open,
  title,
  text,
  filename,
  onClose,
}: {
  open: boolean
  title: string
  text: string
  filename: string
  onClose: () => void
}) {
  const dlgRef = useRef<HTMLDialogElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const [copyLabel, setCopyLabel] = useState('Copy to clipboard')

  useEffect(() => {
    const dlg = dlgRef.current
    if (!dlg) return
    if (open && !dlg.open) {
      setCopyLabel('Copy to clipboard')
      dlg.showModal()
    } else if (!open && dlg.open) {
      dlg.close()
    }
  }, [open])

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
      const blob = new Blob([ta.value], { type: 'text/plain' })
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
        {title}
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
        nothing, copy the text and save it to a file.
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
