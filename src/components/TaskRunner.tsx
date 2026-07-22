import React, { useEffect, useState } from 'react'
import { IconRefresh } from './Icons'

interface Task {
  source: string
  name: string
  command: string
}

const SOURCE_COLOR: Record<string, string> = {
  npm: 'var(--success)',
  make: 'var(--warning)',
  task: 'var(--accent)',
}

interface Props {
  rootPath: string | null
  onRunTask?: (command: string) => void
}

export default function TaskRunner({ rootPath, onRunTask }: Props) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)

  const load = async () => {
    if (!rootPath) return
    setLoading(true)
    const result = await window.api.getTasks?.(rootPath) ?? []
    setTasks(result)
    setLoading(false)
  }

  useEffect(() => { load() }, [rootPath]) // eslint-disable-line

  const sources = [...new Set(tasks.map(t => t.source))]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        padding: '0 8px', height: 32, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', flexShrink: 0,
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Task Runner
        </span>
        <button title="Refresh" onClick={load} style={{ color: 'var(--text-muted)', padding: '2px 4px', display: 'flex' }}>
          <IconRefresh size={13} />
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {!rootPath && (
          <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>Open a folder first</div>
        )}
        {loading && (
          <div style={{ padding: 12, color: 'var(--text-muted)', fontSize: 12 }}>Loading…</div>
        )}
        {!loading && rootPath && tasks.length === 0 && (
          <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>
            No tasks found<br />
            <span style={{ fontSize: 10 }}>(package.json / Makefile / Taskfile.yml)</span>
          </div>
        )}
        {sources.map(source => (
          <div key={source}>
            <div style={{
              padding: '4px 8px', fontSize: 10, fontWeight: 700,
              color: SOURCE_COLOR[source] ?? 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.06em',
              borderBottom: '1px solid var(--border-light)',
              background: 'var(--bg-tertiary)',
            }}>
              {source}
            </div>
            {tasks.filter(t => t.source === source).map(t => (
              <div
                key={t.name}
                style={{ display: 'flex', alignItems: 'center', padding: '0 8px', height: 30 }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                <span style={{ flex: 1, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.name}
                </span>
                <button
                  className="btn btn-primary"
                  style={{ fontSize: 10, padding: '1px 8px', flexShrink: 0 }}
                  onClick={() => onRunTask?.(t.command)}
                  title={t.command}
                >
                  ▶ Run
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
