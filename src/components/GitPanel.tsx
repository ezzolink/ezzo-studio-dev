import React, { useState, useEffect } from 'react'
import { IconRefresh, IconSave } from './Icons'

interface GitFile { path: string; status: 'M' | 'A' | 'D' | '?' }
interface Commit { hash: string; message: string; author: string; date: string }

interface Props { rootPath: string | null; onChangesCount: (n: number) => void }

const STATUS_COLOR: Record<string, string> = {
  M: 'var(--warning)', A: 'var(--success)', D: 'var(--error)', '?': 'var(--text-muted)',
}
const STATUS_LABEL: Record<string, string> = { M: 'M', A: 'A', D: 'D', '?': 'U' }

type Tab = 'changes' | 'log'

export default function GitPanel({ rootPath, onChangesCount }: Props) {
  const [tab, setTab]           = useState<Tab>('changes')
  const [files, setFiles]       = useState<GitFile[]>([])
  const [message, setMessage]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [status, setStatus]     = useState('')
  const [statusOk, setStatusOk] = useState(true)

  // Log tab
  const [commits, setCommits]     = useState<Commit[]>([])
  const [expanded, setExpanded]   = useState<string | null>(null)
  const [logLoading, setLogLoading] = useState(false)

  // Push/pull token
  const [token, setToken] = useState(() => localStorage.getItem('github-token') ?? '')

  const showStatus = (msg: string, ok: boolean) => {
    setStatus(msg); setStatusOk(ok)
    setTimeout(() => setStatus(''), 4000)
  }

  const refresh = async () => {
    if (!rootPath) return
    setLoading(true)
    const changed = await window.api.gitStatus?.(rootPath) ?? []
    setFiles(changed)
    onChangesCount(changed.length)
    setLoading(false)
  }

  const loadLog = async () => {
    if (!rootPath) return
    setLogLoading(true)
    const log = await window.api.gitLog?.(rootPath) ?? []
    setCommits(log)
    setLogLoading(false)
  }

  useEffect(() => { refresh() }, [rootPath]) // eslint-disable-line

  // Realtime: refresh on file-change events + every 5s
  useEffect(() => {
    const handler = () => refresh()
    window.api.onFileChange(handler)
    const interval = setInterval(refresh, 5000)
    return () => clearInterval(interval)
  }, [rootPath]) // eslint-disable-line

  useEffect(() => {
    if (tab === 'log') loadLog()
  }, [tab, rootPath]) // eslint-disable-line

  const commit = async () => {
    if (!message.trim() || !rootPath) return
    setLoading(true)
    try {
      await window.api.gitCommit?.(rootPath, message)
      setMessage(''); showStatus('Committed!', true); setFiles([])
      onChangesCount(0)
    } catch (e: unknown) {
      showStatus(String(e), false)
    }
    setLoading(false)
  }

  const pull = async () => {
    if (!rootPath) return
    setLoading(true)
    const res = await window.api.gitPull?.(rootPath) ?? { ok: false, msg: 'Not available' }
    showStatus(res.msg, res.ok)
    setLoading(false)
    if (res.ok) refresh()
  }

  const push = async () => {
    if (!rootPath) return
    localStorage.setItem('github-token', token)
    setLoading(true)
    const res = await window.api.gitPush?.(rootPath, token) ?? { ok: false, msg: 'Not available' }
    showStatus(res.msg, res.ok)
    setLoading(false)
  }

  const tabStyle = (t: Tab): React.CSSProperties => ({
    padding: '4px 12px', fontSize: 11, cursor: 'pointer', borderBottom: `2px solid ${tab === t ? 'var(--accent)' : 'transparent'}`,
    color: tab === t ? 'var(--text-primary)' : 'var(--text-muted)', background: 'transparent',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '0 8px', height: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', flexShrink: 0 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Source Control {files.length > 0 && <span style={{ color: 'var(--accent)' }}>({files.length})</span>}
        </span>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <button title="Pull" className="btn" style={{ fontSize: 10, padding: '1px 7px' }} onClick={pull} disabled={loading}>↓ Pull</button>
          <button title="Push" className="btn" style={{ fontSize: 10, padding: '1px 7px' }} onClick={push} disabled={loading}>↑ Push</button>
          <button title="Refresh" onClick={refresh} style={{ display: 'flex', color: 'var(--text-muted)', padding: '2px 4px' }}>
            <IconRefresh size={13} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)', flexShrink: 0 }}>
        <button style={tabStyle('changes')} onClick={() => setTab('changes')}>Changes</button>
        <button style={tabStyle('log')} onClick={() => setTab('log')}>Log</button>
      </div>

      {tab === 'changes' && (
        <>
          {/* Token field */}
          <div style={{ padding: '6px 8px', flexShrink: 0, borderBottom: '1px solid var(--border-light)' }}>
            <input
              placeholder="GitHub token (for push)"
              value={token}
              onChange={e => setToken(e.target.value)}
              type="password"
              style={{ width: '100%', fontSize: 11 }}
            />
          </div>

          {/* Commit box */}
          <div style={{ padding: 8, flexShrink: 0, borderBottom: '1px solid var(--border-light)' }}>
            <textarea
              placeholder="Commit message…"
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={2}
              style={{ width: '100%', resize: 'none', marginBottom: 6, fontSize: 12 }}
            />
            <button className="btn btn-primary" style={{ width: '100%', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
              onClick={commit} disabled={!message.trim() || loading}>
              <IconSave size={13} /> Commit
            </button>
            {status && (
              <div style={{ fontSize: 11, color: statusOk ? 'var(--success)' : 'var(--error)', marginTop: 4, wordBreak: 'break-word' }}>
                {status}
              </div>
            )}
          </div>

          {/* Changed files */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            {loading && <div style={{ padding: 12, color: 'var(--text-muted)', fontSize: 12 }}>Loading…</div>}
            {!loading && files.length === 0 && (
              <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>No changes</div>
            )}
            {files.map((f, i) => (
              <div key={i} style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 8 }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                <span style={{ fontSize: 10, fontWeight: 700, color: STATUS_COLOR[f.status] ?? 'var(--text-muted)', width: 12, flexShrink: 0 }}>
                  {STATUS_LABEL[f.status] ?? '?'}
                </span>
                <span style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                  {f.path.split(/[/\\]/).pop()}
                </span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 80 }}>
                  {f.path.split(/[/\\]/).slice(0, -1).join('/')}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'log' && (
        <div style={{ flex: 1, overflow: 'auto' }}>
          {logLoading && <div style={{ padding: 12, color: 'var(--text-muted)', fontSize: 12 }}>Loading…</div>}
          {!logLoading && commits.length === 0 && (
            <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>No commits</div>
          )}
          {commits.map(c => (
            <div key={c.hash}>
              <div
                onClick={() => setExpanded(expanded === c.hash ? null : c.hash)}
                style={{ padding: '6px 8px', cursor: 'pointer', borderBottom: '1px solid var(--border-light)' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <code style={{ fontSize: 10, color: 'var(--accent)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                    {c.hash.slice(0, 7)}
                  </code>
                  <span style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {c.message}
                  </span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                  {c.author} · {new Date(c.date).toLocaleDateString()}
                </div>
              </div>
              {expanded === c.hash && (
                <div style={{ padding: '4px 16px 8px', background: 'var(--bg-tertiary)', fontSize: 11, color: 'var(--text-muted)' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{c.hash}</div>
                  <div style={{ marginTop: 4 }}>Author: {c.author}</div>
                  <div>Date: {new Date(c.date).toLocaleString()}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
