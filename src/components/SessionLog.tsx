import React from 'react'
import { useSessionLog } from '../hooks/useSessionLog'

const EVENT_ICON: Record<string, string> = {
  'peer connected':    '🟢',
  'peer disconnected': '🔴',
  'file opened':       '📄',
  'file saved':        '💾',
  'folder shared':     '📁',
}

function fmt(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function SessionLog() {
  const { entries, clearLog } = useSessionLog()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '0 8px', height: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', flexShrink: 0 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Session Log</span>
        <button className="btn" style={{ fontSize: 10, padding: '2px 8px' }} onClick={clearLog}>Clear</button>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
        {entries.length === 0 && (
          <div style={{ padding: 16, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>No events yet</div>
        )}
        {entries.map((e, i) => (
          <div key={i} style={{ padding: '4px 10px', borderBottom: '1px solid var(--border-light)', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 13, flexShrink: 0 }}>{EVENT_ICON[e.event] ?? '•'}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 11, color: 'var(--text-primary)' }}>{e.event}</span>
              {e.peer && <span style={{ fontSize: 10, color: 'var(--accent)', marginLeft: 4 }}>{e.peer}</span>}
              {e.file && (
                <div style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.file}</div>
              )}
            </div>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>{fmt(e.ts)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
