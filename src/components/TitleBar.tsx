import React from 'react'
import { IconMinimize, IconMaximize, IconClose } from './Icons'
import type { UpdateInfo } from '../hooks/useUpdate'

interface Props {
  folderName: string | null
  onOpenFolder: () => void
  update?: UpdateInfo | null
  onShowUpdate?: () => void
}

export default function TitleBar({ folderName, onOpenFolder, update, onShowUpdate }: Props) {
  return (
    <div style={{
      height: 'var(--titlebar-height)',
      background: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      userSelect: 'none',
      WebkitAppRegion: 'drag',
      flexShrink: 0,
    } as React.CSSProperties}>

      {/* Logo */}
      <div style={{
        padding: '0 10px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        WebkitAppRegion: 'no-drag',
        flexShrink: 0,
      } as React.CSSProperties}>
        <img
          src="/assets/ezzo-work-local-azul.png"
          alt="EZZO"
          style={{ height: 18, objectFit: 'contain' }}
          draggable={false}
        />
      </div>

      {/* Current folder name - centre */}
      <div style={{ flex: 1, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 12, pointerEvents: 'none' }}>
        {folderName
          ? <><span style={{ color: 'var(--text-muted)' }}>Work Local — </span>{folderName}</>
          : <span style={{ color: 'var(--text-muted)' }}>No folder open</span>
        }
      </div>

      {/* Update icon — only shown when update available */}
      {update?.hasUpdate && (
        <div style={{ WebkitAppRegion: 'no-drag', paddingRight: 4 } as React.CSSProperties}>
          <button
            title={`Update available: v${update.latest.replace(/^v/, '')}`}
            onClick={onShowUpdate}
            style={{
              width: 32, height: 'var(--titlebar-height)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--warning)',
              position: 'relative',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#f0a500'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--warning)'}
          >
            {/* Update / download arrow icon */}
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9"/>
              <polyline points="8 12 12 16 16 12"/>
              <line x1="12" y1="8" x2="12" y2="16"/>
            </svg>
            {/* Pulse dot */}
            <span style={{
              position: 'absolute', top: 6, right: 4,
              width: 6, height: 6, borderRadius: '50%',
              background: 'var(--warning)',
              animation: 'pulse 1.5s infinite',
            }} />
          </button>
        </div>
      )}

      {/* Window controls */}
      <div style={{ display: 'flex', WebkitAppRegion: 'no-drag', flexShrink: 0 } as React.CSSProperties}>
        {([
          { Icon: IconMinimize, action: () => window.api.minimize(), title: 'Minimize', danger: false },
          { Icon: IconMaximize, action: () => window.api.maximize(), title: 'Maximize', danger: false },
          { Icon: IconClose,    action: () => window.api.close(),    title: 'Close',    danger: true },
        ] as const).map(({ Icon, action, title, danger }) => (
          <button
            key={title}
            title={title}
            onClick={action}
            style={{
              width: 46, height: 'var(--titlebar-height)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-secondary)',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement
              el.style.background = danger ? 'var(--error)' : 'var(--bg-hover)'
              el.style.color = danger ? '#fff' : 'var(--text-primary)'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement
              el.style.background = 'transparent'
              el.style.color = 'var(--text-secondary)'
            }}
          >
            <Icon size={13} />
          </button>
        ))}
      </div>
    </div>
  )
}
