import React, { useEffect, useRef, useState } from 'react'
import { IconDot, IconPeer } from './Icons'

interface Props {
  activeFile: string | null
  isTyping: boolean
  connectedPeers: number
  isHost: boolean
  isClientConnected: boolean
  gitChanges: number
  activePeer: string | null
  localFolder: string | null
  cursorLine: number
  cursorCol: number
  gitBranch: string | null
  language: string | null
  encoding?: string
  indentSize?: number
  indentType?: 'spaces' | 'tabs'
  errors?: number
  warnings?: number
  onClickLanguage?: () => void
  onClickBranch?: () => void
  onClickLineCol?: () => void
  onClickIndent?: () => void
}

function langLabel(file: string | null): string {
  if (!file) return 'Plain Text'
  const ext = file.split('.').pop()?.toLowerCase() ?? ''
  const map: Record<string, string> = {
    ts: 'TypeScript', tsx: 'TypeScript React', js: 'JavaScript', jsx: 'JavaScript React',
    mjs: 'JavaScript', cjs: 'JavaScript', html: 'HTML', css: 'CSS', scss: 'SCSS',
    sass: 'Sass', less: 'Less', json: 'JSON', md: 'Markdown', mdx: 'MDX',
    py: 'Python', sh: 'Shell', bash: 'Shell', bat: 'Batch', ps1: 'PowerShell',
    yaml: 'YAML', yml: 'YAML', toml: 'TOML', xml: 'XML', svg: 'SVG',
    rs: 'Rust', go: 'Go', java: 'Java', kt: 'Kotlin', rb: 'Ruby',
    php: 'PHP', cs: 'C#', cpp: 'C++', c: 'C', h: 'C', hpp: 'C++',
    vue: 'Vue', svelte: 'Svelte', graphql: 'GraphQL', gql: 'GraphQL',
    sql: 'SQL', prisma: 'Prisma', txt: 'Plain Text', log: 'Log',
    env: 'Dotenv', lock: 'Lock File',
  }
  return map[ext] ?? (ext.toUpperCase() || 'Plain Text')
}

const SbBtn = ({ children, title, onClick, color }: {
  children: React.ReactNode; title?: string; onClick?: () => void; color?: string
}) => (
  <div title={title} onClick={onClick}
    style={{
      display: 'flex', alignItems: 'center', gap: 3, padding: '0 6px', height: '100%',
      cursor: onClick ? 'pointer' : 'default', color: color ?? 'var(--text-secondary)',
      borderRadius: 2, transition: 'background 0.1s',
    }}
    onMouseEnter={e => onClick && ((e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)')}
    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
  >
    {children}
  </div>
)

export default function StatusBar({
  activeFile, isTyping, connectedPeers, isHost, isClientConnected,
  gitChanges, activePeer, localFolder,
  cursorLine, cursorCol, gitBranch, language,
  encoding = 'UTF-8', indentSize = 2, indentType = 'spaces',
  errors = 0, warnings = 0,
  onClickLanguage, onClickBranch, onClickLineCol, onClickIndent,
}: Props) {
  const [barWidth, setBarWidth] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (isTyping) {
      if (animRef.current) return
      let w = 0, dir = 1
      animRef.current = setInterval(() => {
        w += dir * 3
        if (w >= 100) { w = 100; dir = -1 }
        if (w <= 0)   { w = 0;   dir = 1 }
        setBarWidth(w)
      }, 20)
    } else {
      if (animRef.current) { clearInterval(animRef.current); animRef.current = null }
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setBarWidth(0), 800)
    }
    return () => {
      if (animRef.current) clearInterval(animRef.current)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [isTyping])

  const networkStatus = isHost ? 'Host' : isClientConnected ? 'Connected' : localFolder ? 'Local' : 'Offline'
  const networkColor  = isHost ? 'var(--accent)' : isClientConnected ? 'var(--success)' : localFolder ? 'var(--text-secondary)' : 'var(--text-muted)'

  const lang = language ?? langLabel(activeFile)

  return (
    <div style={{ flexShrink: 0, position: 'relative' }}>
      {/* Typing progress line */}
      <div style={{ height: 2, background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${barWidth}%`,
          background: 'var(--accent)',
          transition: isTyping ? 'none' : 'width 0.8s ease',
          boxShadow: barWidth > 0 ? '0 0 8px var(--accent)' : 'none',
        }} />
      </div>

      {/* Status bar */}
      <div style={{
        height: 'var(--statusbar-height)',
        background: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border)',
        display: 'flex', alignItems: 'center',
        fontSize: 11, color: 'var(--text-secondary)',
        userSelect: 'none', overflow: 'hidden',
      }}>
        {/* LEFT */}
        <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>

          {/* Network */}
          <SbBtn color={networkColor}>
            <IconDot size={7} color={networkColor} />
            <span>{networkStatus}</span>
          </SbBtn>

          {/* Git branch */}
          {gitBranch && (
            <SbBtn title="Switch branch" onClick={onClickBranch}>
              {/* git branch icon */}
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
                <path d="M18 9a9 9 0 01-9 9"/>
              </svg>
              <span>{gitBranch}</span>
              {gitChanges > 0 && <span style={{ color: 'var(--warning)' }}>↑{gitChanges}</span>}
            </SbBtn>
          )}

          {/* Errors / Warnings */}
          {(errors > 0 || warnings > 0) && (
            <SbBtn>
              {errors > 0 && (
                <>
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="var(--error)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <span style={{ color: 'var(--error)' }}>{errors}</span>
                </>
              )}
              {warnings > 0 && (
                <>
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: errors > 0 ? 4 : 0 }}>
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  <span style={{ color: 'var(--warning)' }}>{warnings}</span>
                </>
              )}
            </SbBtn>
          )}

          {/* Peers */}
          {connectedPeers > 0 && (
            <SbBtn>
              <IconPeer size={12} />
              <span>{connectedPeers} peer{connectedPeers !== 1 ? 's' : ''}</span>
            </SbBtn>
          )}

          {/* Active peer typing */}
          {activePeer && (
            <SbBtn color="var(--warning)">
              <IconDot size={6} color="var(--warning)" />
              <span>{activePeer} editing…</span>
            </SbBtn>
          )}
        </div>

        {/* SPACER */}
        <div style={{ flex: 1 }} />

        {/* RIGHT */}
        <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>

          {/* Typing indicator */}
          {isTyping && (
            <SbBtn color="var(--accent)">
              <span>editing…</span>
            </SbBtn>
          )}

          {/* Line / Col */}
          {activeFile && (
            <SbBtn title="Go to Line/Column" onClick={onClickLineCol}>
              <span>Ln {cursorLine}, Col {cursorCol}</span>
            </SbBtn>
          )}

          {/* Indentation */}
          {activeFile && (
            <SbBtn title="Select Indentation" onClick={onClickIndent}>
              <span>{indentType === 'tabs' ? 'Tab Size' : 'Spaces'}: {indentSize}</span>
            </SbBtn>
          )}

          {/* Encoding */}
          {activeFile && (
            <SbBtn title="Select Encoding">
              <span>{encoding}</span>
            </SbBtn>
          )}

          {/* Language */}
          {activeFile && (
            <SbBtn title="Select Language Mode" onClick={onClickLanguage}>
              <span>{lang}</span>
            </SbBtn>
          )}

          {/* Notifications bell */}
          <SbBtn title="No notifications">
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
            </svg>
          </SbBtn>

        </div>
      </div>
    </div>
  )
}
