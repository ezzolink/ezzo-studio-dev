import { useEffect, useState } from 'react'

interface ThemeState {
  isDark: boolean
  accent: string
}

const STORAGE_KEY = 'ezzo-theme'
const DEFAULT: ThemeState = { isDark: true, accent: '#388bfd' }

function applyTheme(state: ThemeState) {
  const r = document.documentElement
  if (state.isDark) {
    r.style.setProperty('--bg-primary', '#0d1117')
    r.style.setProperty('--bg-secondary', '#161b22')
    r.style.setProperty('--bg-tertiary', '#21262d')
    r.style.setProperty('--bg-hover', '#30363d')
    r.style.setProperty('--border', '#30363d')
    r.style.setProperty('--border-light', '#21262d')
    r.style.setProperty('--text-primary', '#e6edf3')
    r.style.setProperty('--text-secondary', '#8b949e')
    r.style.setProperty('--text-muted', '#6e7681')
  } else {
    r.style.setProperty('--bg-primary', '#ffffff')
    r.style.setProperty('--bg-secondary', '#f6f8fa')
    r.style.setProperty('--bg-tertiary', '#eaeef2')
    r.style.setProperty('--bg-hover', '#d0d7de')
    r.style.setProperty('--border', '#d0d7de')
    r.style.setProperty('--border-light', '#eaeef2')
    r.style.setProperty('--text-primary', '#1f2328')
    r.style.setProperty('--text-secondary', '#656d76')
    r.style.setProperty('--text-muted', '#9198a1')
  }
  r.style.setProperty('--accent', state.accent)
  const hover = state.accent + 'cc'
  r.style.setProperty('--accent-hover', hover)
  r.style.setProperty('--bg-active', state.accent + '26')
}

export function useTheme() {
  const [theme, setTheme] = useState<ThemeState>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) return { ...DEFAULT, ...JSON.parse(stored) }
    } catch { /* ignore */ }
    return DEFAULT
  })

  useEffect(() => {
    applyTheme(theme)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(theme))
  }, [theme])

  const setDark = (isDark: boolean) => setTheme(t => ({ ...t, isDark }))
  const setAccent = (accent: string) => setTheme(t => ({ ...t, accent }))

  return { isDark: theme.isDark, accent: theme.accent, setDark, setAccent }
}
