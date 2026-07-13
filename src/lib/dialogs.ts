import { createContext, useContext } from 'react'

/**
 * Promise-based confirm/prompt/notice, replacing native confirm()/prompt()
 * which are blocked in sandboxed preview iframes. Provided by DialogsProvider.
 */
export interface Dialogs {
  /** Yes/No confirmation → resolves true/false. */
  confirm: (message: string) => Promise<boolean>
  /** Text prompt → resolves the entered string, or null if cancelled. */
  prompt: (message: string, value?: string) => Promise<string | null>
  /** Message with a single OK button → resolves when dismissed. */
  notice: (message: string) => Promise<void>
}

export const DialogContext = createContext<Dialogs | null>(null)

export function useDialogs(): Dialogs {
  const ctx = useContext(DialogContext)
  if (!ctx) throw new Error('useDialogs must be used within a DialogsProvider')
  return ctx
}
