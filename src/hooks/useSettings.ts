import { useEffect, useState } from 'react'

interface Settings {
  fontSize: number
  minimap: boolean
  autosave: boolean
  wordWrap: boolean
  terminalFontSize: number
  sidebarWidth: number
}

const DEFAULTS: Settings = {
  fontSize: 13, minimap: true, autosave: true,
  wordWrap: false, terminalFontSize: 13, sidebarWidth: 250,
}

const KEY = 'ezzo-settings'

function load(): Settings {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') } } catch { return DEFAULTS }
}

export function useSettings(): Settings {
  const [settings, setSettings] = useState<Settings>(load)

  useEffect(() => {
    const handler = () => setSettings(load())
    window.addEventListener('ezzo-settings-changed', handler)
    return () => window.removeEventListener('ezzo-settings-changed', handler)
  }, [])

  return settings
}
