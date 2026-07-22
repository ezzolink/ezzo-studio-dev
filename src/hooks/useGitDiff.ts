import { useEffect, useState } from 'react'

interface GitDiff {
  added: number[]
  modified: number[]
  removed: number[]
}

export function useGitDiff(filePath: string | null): GitDiff {
  const [diff, setDiff] = useState<GitDiff>({ added: [], modified: [], removed: [] })

  useEffect(() => {
    if (!filePath) { setDiff({ added: [], modified: [], removed: [] }); return }
    let cancelled = false
    window.api.gitDiff?.(filePath)?.then(d => {
      if (!cancelled) setDiff(d)
    }).catch(() => {
      if (!cancelled) setDiff({ added: [], modified: [], removed: [] })
    })
    return () => { cancelled = true }
  }, [filePath])

  return diff
}
