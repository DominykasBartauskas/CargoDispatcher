import { normalizeState } from './model'
import type { AppState } from './types'

const LS_KEY = 'sf-rail-dispatcher-v1'

/** Claude artifact cloud storage, present only inside the artifact sandbox. */
interface CloudStorage {
  get(key: string): Promise<{ value?: string } | null>
  set(key: string, value: string): Promise<unknown>
}
const cloud = (globalThis as { storage?: CloudStorage }).storage
const hasCloud = !!cloud && typeof cloud.get === 'function'

let storageOK = true
try {
  localStorage.setItem('__t', '1')
  localStorage.removeItem('__t')
} catch {
  storageOK = false
}

/**
 * Storage backend tiers:
 *   'cloud'  - Claude artifact storage, per-user, syncs across sessions.
 *   'local'  - browser localStorage.
 *   'memory' - nothing persists; a footer warning is shown.
 */
export type Backend = 'cloud' | 'local' | 'memory'
export const BACKEND: Backend = hasCloud ? 'cloud' : storageOK ? 'local' : 'memory'

function loadLocal(): AppState | null {
  if (!storageOK) return null
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? (JSON.parse(raw) as AppState) : null
  } catch {
    return null
  }
}

export async function loadInitialState(): Promise<AppState | null> {
  let s: AppState | null = null
  if (BACKEND === 'cloud' && cloud) {
    try {
      const r = await cloud.get(LS_KEY)
      s = r && r.value ? (JSON.parse(r.value) as AppState) : null
    } catch {
      s = null /* key not found yet is fine */
    }
    /* one-time migration: pull older localStorage data into cloud storage */
    if (!s) s = loadLocal()
  } else {
    s = loadLocal()
  }
  return normalizeState(s)
}

export function writeState(state: AppState): void {
  const payload = JSON.stringify(state)
  if (BACKEND === 'cloud' && cloud) {
    cloud.set(LS_KEY, payload).catch(() => {})
  } else if (BACKEND === 'local') {
    try {
      localStorage.setItem(LS_KEY, payload)
    } catch {
      /* quota / disabled — ignore */
    }
  }
}

export function backendNote(): { base: string; note: string } {
  if (BACKEND === 'cloud')
    return {
      base: 'Data is saved to Claude artifact storage for your account and syncs across sessions.',
      note: '',
    }
  if (BACKEND === 'local')
    return { base: 'Data is saved to this browser via localStorage.', note: '' }
  return {
    base: '',
    note: 'No persistent storage is available in this environment, so changes will not be saved. Export your world as JSON before leaving, or download the file and open it locally.',
  }
}
