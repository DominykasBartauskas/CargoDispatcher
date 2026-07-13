import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { DialogContext } from '../lib/dialogs'
import type { Dialogs } from '../lib/dialogs'

interface Req {
  message: string
  input: string | null
  noCancel: boolean
}

/**
 * Provides promise-based confirm/prompt/notice via a single native <dialog>,
 * replacing the legacy modalAsk() (native confirm/prompt are blocked in
 * sandboxed preview iframes).
 */
export function DialogsProvider({ children }: { children: ReactNode }) {
  const dlgRef = useRef<HTMLDialogElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const resolver = useRef<((v: unknown) => void) | null>(null)
  const [req, setReq] = useState<Req | null>(null)
  const [inputVal, setInputVal] = useState('')

  const open = useCallback(
    (r: Req) =>
      new Promise<unknown>((res) => {
        resolver.current = res
        setInputVal(r.input ?? '')
        setReq(r)
      }),
    [],
  )

  useEffect(() => {
    if (!req) return
    dlgRef.current?.showModal()
    if (req.input !== null) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [req])

  const done = (v: unknown) => {
    resolver.current?.(v)
    resolver.current = null
    dlgRef.current?.close()
    setReq(null)
  }
  const ok = () => done(req && req.input !== null ? inputVal : true)
  const cancel = () => done(req && req.input !== null ? null : false)

  const api = useRef<Dialogs>({
    confirm: (m) => open({ message: m, input: null, noCancel: false }) as Promise<boolean>,
    prompt: (m, v = '') => open({ message: m, input: v, noCancel: false }) as Promise<string | null>,
    notice: (m) => open({ message: m, input: null, noCancel: true }) as Promise<void>,
  }).current

  return (
    <DialogContext.Provider value={api}>
      {children}
      <dialog
        ref={dlgRef}
        onCancel={(e) => {
          e.preventDefault()
          cancel()
        }}
      >
        <div style={{ marginBottom: 12 }}>{req?.message}</div>
        {req && req.input !== null && (
          <input
            ref={inputRef}
            type="text"
            style={{ width: '100%', marginBottom: 12 }}
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                ok()
              }
            }}
          />
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          {!req?.noCancel && (
            <button className="btn" onClick={cancel}>
              Cancel
            </button>
          )}
          <button className="btn primary" onClick={ok}>
            OK
          </button>
        </div>
      </dialog>
    </DialogContext.Provider>
  )
}
