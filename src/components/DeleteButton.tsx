import { useEffect, useRef, useState } from 'react'

interface Props {
  /** Runs when the user confirms. */
  onConfirm: () => void
  /** Accessible label / tooltip for the ✕ trigger (e.g. "Delete Train 1"). */
  title?: string
}

/**
 * Delete affordance that swaps in place instead of opening a dialog: the ✕
 * turns into a filled-red ✓ confirm (pinned to the same right-edge slot) with a
 * muted ✕ cancel to its left. Cancel, Escape, or clicking away reverts it.
 */
export function DeleteButton({ onConfirm, title = 'Delete' }: Props) {
  const [confirming, setConfirming] = useState(false)
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (confirming) confirmRef.current?.focus()
  }, [confirming])

  if (!confirming)
    return (
      <button
        className="btn small ghost"
        aria-label={title}
        title={title}
        onClick={() => setConfirming(true)}
      >
        ✕
      </button>
    )

  return (
    <span
      className="delconfirm"
      onKeyDown={(e) => {
        if (e.key === 'Escape') setConfirming(false)
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setConfirming(false)
      }}
    >
      <button className="btn small ghost" aria-label="Cancel" title="Cancel" onClick={() => setConfirming(false)}>
        ✕
      </button>
      <button
        ref={confirmRef}
        className="btn small delgo"
        aria-label="Confirm delete"
        title="Confirm delete"
        onClick={() => {
          setConfirming(false)
          onConfirm()
        }}
      >
        ✓
      </button>
    </span>
  )
}
