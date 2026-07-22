import { create } from 'zustand'

export interface SessionEntry {
  ts: number
  event: string
  peer?: string
  file?: string
}

const STORAGE_KEY = 'ezzo-session-log'

function load(): SessionEntry[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') } catch { return [] }
}

interface SessionLogState {
  entries: SessionEntry[]
  logEvent: (event: string, details?: { peer?: string; file?: string }) => void
  clearLog: () => void
}

export const useSessionLog = create<SessionLogState>((set) => ({
  entries: load(),
  logEvent: (event, details = {}) =>
    set((s) => {
      const entry: SessionEntry = { ts: Date.now(), event, ...details }
      const entries = [entry, ...s.entries]
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)) } catch { /* ignore */ }
      return { entries }
    }),
  clearLog: () => {
    localStorage.removeItem(STORAGE_KEY)
    set({ entries: [] })
  },
}))
