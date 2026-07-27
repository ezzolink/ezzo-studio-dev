import React, { useState, useEffect, useRef } from 'react'

interface AnalysisResult {
  totalFiles: number
  totalDirs: number
  totalBytes: number
  totalLines: number
  languages: { ext: string; lang: string; count: number; lines: number }[]
  dependencies: Record<string, { name: string; version?: string }[]>
  todos: { file: string; line: number; text: string }[]
  recent: { path: string; mtime: number }[]
  nodeModulesInstalled?: boolean
}

interface Props {
  rootPath: string
  result: AnalysisResult | null
  loading: boolean
  error?: string
  onClose: () => void
  onRefresh: () => void
  onOpenFileAtLine?: (filePath: string, line: number) => void
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

const LANG_COLORS: Record<string, string> = {
  ts: '#3178c6', tsx: '#3178c6', js: '#f7df1e', jsx: '#f7df1e',
  html: '#e34c26', css: '#264de4', scss: '#c6538c', py: '#3572a5',
  json: '#f5a623', md: '#4ec9b0', sql: '#336791', sh: '#89e051',
}

// OS Notification helper
function sendDesktopNotification(title: string, body: string) {
  try {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/icon.png' })
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(perm => {
          if (perm === 'granted') {
            new Notification(title, { body, icon: '/icon.png' })
          }
        })
      }
    }
  } catch { /* ignore notification errors */ }
}

export default function ProjectAnalysis({ rootPath, result, loading, error, onClose, onRefresh, onOpenFileAtLine }: Props) {
  const [installing, setInstalling] = useState(false)
  const [installProgress, setInstallProgress] = useState(0)
  const [installTarget, setInstallTarget] = useState('')
  const [installSuccessMsg, setInstallSuccessMsg] = useState('')
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Clean up timer
  useEffect(() => {
    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current)
    }
  }, [])

  const runInstallCommand = async (pkgName?: string) => {
    if (installing) return
    const targetName = pkgName ? pkgName.replace(' (dev)', '') : 'Todas as Dependências'
    setInstalling(true)
    setInstallProgress(15)
    setInstallTarget(targetName)
    setInstallSuccessMsg('')

    // Smooth real-time progress simulation during process execution
    let currentPct = 15
    if (progressTimerRef.current) clearInterval(progressTimerRef.current)
    
    progressTimerRef.current = setInterval(() => {
      currentPct += Math.floor(Math.random() * 5) + 2
      if (currentPct >= 92) {
        currentPct = 92
        if (progressTimerRef.current) clearInterval(progressTimerRef.current)
      }
      setInstallProgress(currentPct)
    }, 300)

    try {
      // Real backend child process execution!
      const res = await window.api.execNpmInstall?.(rootPath, pkgName ? targetName : undefined)
      if (progressTimerRef.current) clearInterval(progressTimerRef.current)

      if (res && res.success === false) {
        setInstalling(false)
        setInstallSuccessMsg(`❌ Erro ao instalar: ${res.error?.slice(0, 150) || 'Falha na execução'}`)
      } else {
        setInstallProgress(100)
        setTimeout(async () => {
          setInstalling(false)
          setInstallSuccessMsg(`✅ ${targetName} instaladas com sucesso!`)
          // Trigger immediate project re-analysis
          onRefresh()
          
          // OS Desktop Notification
          sendDesktopNotification(
            'EZZO Studio Dev',
            `As dependências (${targetName}) foram instaladas com sucesso no repositório!`
          )
        }, 300)
      }
    } catch (err: any) {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current)
      setInstalling(false)
      setInstallSuccessMsg(`❌ Erro na instalação: ${err.message || String(err)}`)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 10000, padding: 16, backdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(1100px, 94vw)', maxHeight: '90vh', overflow: 'hidden',
          background: 'var(--bg-secondary)', border: '1px solid var(--border)',
          borderRadius: 10, display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 64px rgba(0,0,0,0.75)',
        }}
      >
        {/* Header Bar */}
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
          background: 'var(--bg-tertiary)', flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 260 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.2"><path d="M10 2v8L4 18a2 2 0 002 2h12a2 2 0 002-2l-6-8V2"/><line x1="8" y1="2" x2="16" y2="2"/></svg>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              EZZO Project Analytics
            </h2>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', background: 'var(--bg-hover)', padding: '2px 8px', borderRadius: 4 }}>
              {rootPath}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={onRefresh} disabled={loading} title="Re-analisar Projeto"
              style={{ padding: '5px 12px', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg-hover)', cursor: loading ? 'wait' : 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
              Refresh
            </button>
            <button onClick={onClose} title="Fechar Modal"
              style={{ padding: '5px 10px', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 6, background: 'transparent', cursor: 'pointer', fontSize: 13 }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div style={{ overflowY: 'auto', padding: 20, flex: 1 }}>
          {loading && !result && (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
              <svg style={{ animation: 'spin 1s linear infinite' }} width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                <path d="M21 12a9 9 0 11-6.219-8.56" />
              </svg>
              <div style={{ marginTop: 12, fontSize: 13, fontWeight: 500 }}>A analisar a estrutura do repositório…</div>
            </div>
          )}

          {error && (
            <div style={{ color: 'var(--error)', padding: 16, background: 'rgba(239,68,68,0.1)', borderRadius: 6, border: '1px solid var(--error)' }}>
              {error}
            </div>
          )}

          {result && !error && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Card 1: Overview */}
              <Summary result={result} />

              {/* Responsive Grid for Languages and Dependencies */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
                gap: 16,
                alignItems: 'start',
              }}>
                {/* Languages Card */}
                <Languages result={result} />

                {/* Dependencies Card */}
                <Dependencies
                  result={result}
                  installing={installing}
                  installProgress={installProgress}
                  installTarget={installTarget}
                  installSuccessMsg={installSuccessMsg}
                  onInstallAll={() => runInstallCommand()}
                  onInstallPkg={(pkg) => runInstallCommand(pkg)}
                />
              </div>

              {/* Bottom Row: TODOs and Recent Activity */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
                gap: 16,
              }}>
                <Todos result={result} rootPath={rootPath} onOpenFileAtLine={onOpenFileAtLine} />
                <Recent result={result} rootPath={rootPath} onOpenFileAtLine={onOpenFileAtLine} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Card({ title, headerAction, children, style }: { title: React.ReactNode; headerAction?: React.ReactNode; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
      borderRadius: 8, padding: 16, display: 'flex', flexDirection: 'column', width: '100%', boxSizing: 'border-box', ...style,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
          {title}
        </h3>
        {headerAction}
      </div>
      {children}
    </div>
  )
}

function Summary({ result }: { result: AnalysisResult }) {
  return (
    <Card title="Project Overview">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <Stat label="Ficheiros Totais" value={result.totalFiles.toLocaleString()} />
        <Stat label="Pastas" value={result.totalDirs.toLocaleString()} />
        <Stat label="Tamanho Total" value={formatBytes(result.totalBytes)} />
        <Stat label="Linhas de Código" value={result.totalLines.toLocaleString()} />
      </div>
    </Card>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', padding: '12px 14px', borderRadius: 6 }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>{value}</div>
    </div>
  )
}

function Languages({ result }: { result: AnalysisResult }) {
  const totalLines = result.totalLines || 1
  const topLangs = result.languages.slice(0, 5)

  return (
    <Card
      title="Linguagens do Código"
      headerAction={
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
          {topLangs.map(l => (
            <span
              key={l.ext}
              title={`${l.lang}: ${l.lines} linhas`}
              style={{
                fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                background: (LANG_COLORS[l.ext] || 'var(--accent)') + '22',
                color: LANG_COLORS[l.ext] || 'var(--accent)',
                border: `1px solid ${(LANG_COLORS[l.ext] || 'var(--accent)')}44`,
                fontFamily: 'var(--font-mono)',
              }}
            >
              .{l.ext}
            </span>
          ))}
        </div>
      }
    >
      {/* Proportion Bar */}
      <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 12, background: 'var(--bg-primary)' }}>
        {result.languages.map(l => {
          const pct = Math.max((l.lines / totalLines) * 100, 1)
          return (
            <div
              key={l.ext}
              title={`${l.lang}: ${pct.toFixed(1)}%`}
              style={{ width: `${pct}%`, background: LANG_COLORS[l.ext] || '#888', height: '100%' }}
            />
          )
        })}
      </div>

      <div style={{ maxHeight: 220, overflowY: 'auto', paddingRight: 4 }}>
        <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ color: 'var(--text-muted)', fontSize: 10, textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '6px 0', fontWeight: 600 }}>Linguagem</th>
              <th style={{ padding: '6px 0', fontWeight: 600, textAlign: 'right' }}>Ficheiros</th>
              <th style={{ padding: '6px 0', fontWeight: 600, textAlign: 'right' }}>Linhas</th>
            </tr>
          </thead>
          <tbody>
            {result.languages.map(l => (
              <tr key={l.ext} style={{ borderBottom: '1px solid var(--border-light)' }}>
                <td style={{ padding: '6px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: LANG_COLORS[l.ext] || '#888', flexShrink: 0 }} />
                  <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{l.lang}</span>
                  <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 10 }}>.{l.ext}</span>
                </td>
                <td style={{ padding: '6px 0', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{l.count.toLocaleString()}</td>
                <td style={{ padding: '6px 0', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{l.lines.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function Dependencies({
  result,
  installing,
  installProgress,
  installTarget,
  installSuccessMsg,
  onInstallAll,
  onInstallPkg,
}: {
  result: AnalysisResult
  installing: boolean
  installProgress: number
  installTarget: string
  installSuccessMsg: string
  onInstallAll: () => void
  onInstallPkg: (pkg: string) => void
}) {
  const groups = Object.entries(result.dependencies)
  const isNpmMissing = result.dependencies.npm && !result.nodeModulesInstalled

  return (
    <Card
      title="Dependências do Projeto"
      headerAction={
        <button
          onClick={onInstallAll}
          disabled={installing}
          style={{
            padding: '4px 10px', fontSize: 11, fontWeight: 600, borderRadius: 5,
            background: isNpmMissing ? '#ef4444' : 'var(--accent)', color: '#fff',
            border: 'none', cursor: installing ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 5,
            opacity: installing ? 0.7 : 1,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          {installing ? 'A Instalar…' : 'Instalar Tudo (npm i)'}
        </button>
      }
    >
      {/* Real-time Installation Progress Bar */}
      {installing && (
        <div style={{ marginBottom: 12, padding: 10, background: 'var(--bg-secondary)', borderRadius: 6, border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)' }}>
            <span>A instalar {installTarget}…</span>
            <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{installProgress}%</span>
          </div>
          <div style={{ height: 6, width: '100%', background: 'var(--bg-primary)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${installProgress}%`,
              background: 'linear-gradient(90deg, #3b82f6, #22c55e)',
              borderRadius: 3, transition: 'width 0.3s ease-in-out',
            }} />
          </div>
        </div>
      )}

      {/* Success / Error Notification Message */}
      {installSuccessMsg && !installing && (
        <div style={{
          padding: '8px 12px',
          background: installSuccessMsg.startsWith('❌') ? 'rgba(239, 68, 68, 0.12)' : 'rgba(34, 197, 94, 0.12)',
          border: `1px solid ${installSuccessMsg.startsWith('❌') ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`,
          borderRadius: 6,
          color: installSuccessMsg.startsWith('❌') ? '#ef4444' : '#22c55e',
          fontSize: 11, fontWeight: 600, marginBottom: 10,
          wordBreak: 'break-word' as const,
          whiteSpace: 'pre-wrap' as const,
        }}>
          {installSuccessMsg}
        </div>
      )}

      {/* Missing node_modules Warning Banner */}
      {isNpmMissing && !installing && !installSuccessMsg && (
        <div style={{
          padding: '8px 12px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 6, color: '#ef4444', fontSize: 11, fontWeight: 600, marginBottom: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span>⚠️ node_modules não detetado no repositório!</span>
          <span style={{ fontSize: 11, textDecoration: 'underline', cursor: 'pointer' }} onClick={onInstallAll}>Clique para Instalar</span>
        </div>
      )}

      {groups.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Nenhuma dependência detetada no repositório</div>}

      <div style={{ maxHeight: 220, overflowY: 'auto', paddingRight: 4 }}>
        {groups.map(([ecosystem, deps]) => (
          <div key={ecosystem} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4, letterSpacing: '0.08em' }}>
              📦 {ecosystem} ({deps.length})
            </div>
            {deps.map((d, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                fontSize: 11, padding: '4px 0', borderBottom: '1px solid var(--border-light)',
                fontFamily: 'var(--font-mono)', gap: 8,
              }}>
                <span style={{ color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  {d.version && <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>{d.version}</span>}
                  <button
                    title={`Atualizar/Instalar ${d.name}`}
                    disabled={installing}
                    onClick={() => onInstallPkg(d.name)}
                    style={{
                      background: 'var(--bg-hover)', border: '1px solid var(--border)',
                      color: 'var(--text-secondary)', padding: '2px 7px', borderRadius: 4,
                      fontSize: 10, cursor: installing ? 'wait' : 'pointer', fontWeight: 500,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
                  >
                    Update ↺
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </Card>
  )
}

function Todos({ result, rootPath, onOpenFileAtLine }: { result: AnalysisResult; rootPath: string; onOpenFileAtLine?: (filePath: string, line: number) => void }) {
  return (
    <Card title={`TODOs & FIXMEs (${result.todos.length})`}>
      {result.todos.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Nenhum TODO / FIXME detetado</div>}
      <div style={{ maxHeight: 180, overflowY: 'auto', paddingRight: 4 }}>
        {result.todos.map((t, i) => (
          <div
            key={i}
            onClick={() => onOpenFileAtLine?.(t.file, t.line)}
            style={{
              padding: '6px 8px', borderBottom: '1px solid var(--border-light)',
              cursor: 'pointer', borderRadius: 4, marginBottom: 2,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <div style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600 }}>
              {relPath(t.file, rootPath)}:{t.line}
            </div>
            <div style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: 11, whiteSpace: 'pre-wrap' }}>{t.text}</div>
          </div>
        ))}
      </div>
    </Card>
  )
}

function Recent({ result, rootPath, onOpenFileAtLine }: { result: AnalysisResult; rootPath: string; onOpenFileAtLine?: (filePath: string, line: number) => void }) {
  return (
    <Card title="Atividade Recente & Ficheiros Modificados">
      {result.recent.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Nenhum ficheiro recente</div>}
      <div style={{ maxHeight: 180, overflowY: 'auto', paddingRight: 4 }}>
        {result.recent.map((r, i) => (
          <div
            key={i}
            onClick={() => onOpenFileAtLine?.(r.path, 1)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '6px 8px', borderBottom: '1px solid var(--border-light)',
              fontSize: 11, cursor: 'pointer', borderRadius: 4, gap: 8,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
              <span style={{ color: 'var(--accent)', flexShrink: 0 }}>📄</span>
              <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{relPath(r.path, rootPath)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>{new Date(r.mtime).toLocaleString()}</span>
              <span style={{ color: 'var(--accent)', fontSize: 10, fontWeight: 600 }}>Abrir →</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
