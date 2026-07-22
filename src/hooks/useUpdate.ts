import { useEffect, useState } from 'react'

export interface UpdateInfo {
  hasUpdate: boolean
  current: string
  latest: string
  notes: string
  url: string
  assets: { name: string; browser_download_url: string; size: number }[]
}

export function useUpdate() {
  const [update, setUpdate] = useState<UpdateInfo | null>(null)
  const [checking, setChecking] = useState(false)

  const check = async () => {
    setChecking(true)
    try {
      const info = await window.api.checkUpdate?.()
      if (info) setUpdate(info)
    } catch { /* offline */ }
    setChecking(false)
  }

  useEffect(() => {
    // Check on mount
    check()
    // Check every 30 minutes in background
    const interval = setInterval(check, 30 * 60 * 1000)
    return () => clearInterval(interval)
  }, []) // eslint-disable-line

  return { update, checking, check }
}
