import React, { useState } from 'react'
import { IconSearch, IconFile } from './Icons'

interface Result { file: string; line: number; text: string }

interface Props {
  rootPath: string | null
  onOpenFile?: (path: string, line: number) => void
}

export default function SearchPanel({ rootPath, onOpenFile }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [searching, setSearching] = useState(false)

  const search = async () => {
    if (!query.trim() || !rootPath) return
    setSearching(true)
    setResults([])
    try {
      const found = await window.api.searchInFiles?.(rootPath, query) ?? []
      setResults(found)
    } catch { setResults([]) }
    setSearching(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-light)', flexShrink: 0 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Search
        </span>
      </div>
      <div style={{ padding: 8, flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          <input
            placeholder="Search in files…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
            style={{ flex: 1, fontSize: 12 }}
          />
          <button className="btn" style={{ padding: '4px 8px' }} onClick={search}>
            <IconSearch size={13} />
          </button>
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        {searching && <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: 12 }}>Searching…</div>}
        {!searching && results.length === 0 && query && (
          <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: 12 }}>No results</div>
        )}
        {results.map((r, i) => (
          <div key={i} style={{ padding: '4px 8px', borderBottom: '1px solid var(--border-light)', cursor: 'pointer' }}
            onClick={() => onOpenFile?.(r.file, r.line)}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
              <IconFile size={11} color="var(--accent)" />
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{r.file.split(/[/\\]/).pop()}</span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>:{r.line}</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', paddingLeft: 15,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {r.text.trim()}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
