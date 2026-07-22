import React, { useState } from 'react'

interface AnalysisResult {
  totalFiles: number
  totalDirs: number
  totalBytes: number
  totalLines: number
  languages: { ext: string; lang: string; count: number; lines: number }[]
  dependencies: Record<string, { name: string; version?: string }[]>
  todos: { file: string; line: number; text: string }[]
  recent: { path: string; mtime: number }[]
}

interface Props {
  rootPath: string
  result: AnalysisResult | null
  loading: boolean
  error?: string
  onClose: () => void
  onRefresh: () => void
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`
}

function relPath(p: string, root: string): string {
  return p.startsWith(root) ? p.slice(root.length).replace(/^[\\/]/, '') : p
}

export default function ProjectAnalysis({ rootPath, result, loading, error, onClose, onRefresh }: Props) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 10000, padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(900px, 100%)', maxHeight: '85vh', overflow: 'hidden',
          background: 'var(--bg-secondary)', border: '1px solid var(--border)',
          borderRadius: 8, display: 'flex', flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '12px 16px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
        }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, flex: 1, margin: 0, color: 'var(--text-primary)' }}>
            Project Analysis
          </h2>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {rootPath}
          </span>
          <button onClick={onRefresh} disabled={loading} title="Refresh"
            style={{ padding: '4px 10px', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 4, background: 'transparent', cursor: loading ? 'wait' : 'pointer' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
            ↻
          </button>
          <button onClick={onClose} title="Close"
            style={{ padding: '4px 10px', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 4, background: 'transparent', cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ overflow: 'auto', padding: 16, flex: 1 }}>
          {loading && !result && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              <svg style={{ animation: 'spin 1s linear infinite' }} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 11-6.219-8.56" />
              </svg>
              <div style={{ marginTop: 8, fontSize: 12 }}>Analisando o projeto…</div>
            </div>
          )}
          {error && <div style={{ color: 'var(--error)', padding: 12 }}>{error}</div>}
          {result && !error && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Summary result={result} />
              <Languages result={result} />
              <Dependencies result={result} />
              <Todos result={result} rootPath={rootPath} />
              <Recent result={result} rootPath={rootPath} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Card({ title, children, style }: { title: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
      borderRadius: 6, padding: 12, ...style,
    }}>
      <h3 style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
        {title}
      </h3>
      {children}
    </div>
  )
}

function Summary({ result }: { result: AnalysisResult }) {
  return (
    <Card title="Overview" style={{ gridColumn: '1 / -1' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <Stat label="Files" value={result.totalFiles.toLocaleString()} />
        <Stat label="Directories" value={result.totalDirs.toLocaleString()} />
        <Stat label="Total size" value={formatBytes(result.totalBytes)} />
        <Stat label="Lines" value={result.totalLines.toLocaleString()} />
      </div>
    </Card>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{value}</div>
    </div>
  )
}

function Languages({ result }: { result: AnalysisResult }) {
  return (
    <Card title="Languages">
      <div style={{ maxHeight: 200, overflow: 'auto' }}>
        <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ color: 'var(--text-muted)', fontSize: 10, textAlign: 'left' }}>
              <th style={{ padding: '4px 0', fontWeight: 600 }}>Lang</th>
              <th style={{ padding: '4px 0', fontWeight: 600, textAlign: 'right' }}>Files</th>
              <th style={{ padding: '4px 0', fontWeight: 600, textAlign: 'right' }}>Lines</th>
            </tr>
          </thead>
          <tbody>
            {result.languages.map(l => (
              <tr key={l.ext} style={{ borderTop: '1px solid var(--border-light)' }}>
                <td style={{ padding: '4px 0' }}>
                  <span style={{ color: 'var(--accent)' }}>{l.lang}</span>
                  <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginLeft: 6, fontSize: 11 }}>.{l.ext}</span>
                </td>
                <td style={{ padding: '4px 0', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{l.count.toLocaleString()}</td>
                <td style={{ padding: '4px 0', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{l.lines.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function Dependencies({ result }: { result: AnalysisResult }) {
  const groups = Object.entries(result.dependencies)
  return (
    <Card title="Dependencies">
      {groups.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Nenhuma detectada</div>}
      <div style={{ maxHeight: 200, overflow: 'auto' }}>
        {groups.map(([ecosystem, deps]) => (
          <div key={ecosystem} style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4, letterSpacing: '0.08em' }}>{ecosystem}</div>
            {deps.slice(0, 50).map((d, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '1px 0', fontFamily: 'var(--font-mono)' }}>
                <span style={{ color: 'var(--text-primary)' }}>{d.name}</span>
                {d.version && <span style={{ color: 'var(--text-muted)' }}>{d.version}</span>}
              </div>
            ))}
            {deps.length > 50 && <div style={{ color: 'var(--text-muted)', fontSize: 10, marginTop: 4 }}>+{deps.length - 50} mais…</div>}
          </div>
        ))}
      </div>
    </Card>
  )
}

function Todos({ result, rootPath }: { result: AnalysisResult; rootPath: string }) {
  return (
    <Card title={`TODOs / FIXMEs (${result.todos.length})`}>
      {result.todos.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Nenhum encontrado</div>}
      <div style={{ maxHeight: 200, overflow: 'auto' }}>
        {result.todos.map((t, i) => (
          <div key={i} style={{ padding: '4px 0', borderTop: i > 0 ? '1px solid var(--border-light)' : 'none', fontSize: 11 }}>
            <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {relPath(t.file, rootPath)}:{t.line}
            </div>
            <div style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap' }}>{t.text}</div>
          </div>
        ))}
      </div>
    </Card>
  )
}

function Recent({ result, rootPath }: { result: AnalysisResult; rootPath: string }) {
  return (
    <Card title="Recent activity" style={{ gridColumn: '1 / -1' }}>
      {result.recent.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</div>}
      <div style={{ maxHeight: 160, overflow: 'auto' }}>
        {result.recent.map((r, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 11, borderTop: i > 0 ? '1px solid var(--border-light)' : 'none' }}>
            <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{relPath(r.path, rootPath)}</span>
            <span style={{ color: 'var(--text-muted)' }}>{new Date(r.mtime).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}
