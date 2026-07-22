import React from 'react'

// ── Ícones profissionais limpos (estilo Lucide) ──────────────────────────────

const IconExplorer = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
  </svg>
)

const IconSearch = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
  </svg>
)

// Git — três nós conectados (branch icon standard)
const IconGit = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="6" cy="6" r="2.5"/>
    <circle cx="18" cy="6" r="2.5"/>
    <circle cx="6" cy="18" r="2.5"/>
    <path d="M6 8.5v7M8.5 6h7a2 2 0 012 2v1.5"/>
  </svg>
)

// Tasks — play button
const IconTasks = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
)

// Testing — checkmark num círculo (test pass)
const IconTesting = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9"/>
    <path d="M8.5 12.5l2.5 2.5 4.5-5"/>
  </svg>
)

// Network — wifi / signal
const IconNetwork = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12.55a11 11 0 0114.08 0"/>
    <path d="M1.42 9a16 16 0 0121.16 0"/>
    <path d="M8.53 16.11a6 6 0 016.95 0"/>
    <circle cx="12" cy="20" r="1" fill={color} stroke="none"/>
  </svg>
)

// Settings — gear limpo
const IconSettings = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
  </svg>
)

// Chat — speech bubble
const IconChat = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
  </svg>
)

// History — clock
const IconHistory = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9"/>
    <path d="M12 7v5l3 3"/>
  </svg>
)

// ── Types & data ─────────────────────────────────────────────────────────────

export type Panel = 'explorer' | 'search' | 'git' | 'extensions' | 'testing' | 'network' | 'chat' | 'history' | 'settings'

interface Props {
  active: Panel
  onChange: (panel: Panel) => void
  gitChanges?: number
  peersOnline?: number
}

const TOP_ITEMS: { id: Panel; Icon: React.FC<{ size?: number; color?: string }>; title: string }[] = [
  { id: 'explorer',   Icon: IconExplorer,   title: 'Explorer' },
  { id: 'search',     Icon: IconSearch,     title: 'Search' },
  { id: 'git',        Icon: IconGit,        title: 'Source Control' },
  { id: 'extensions', Icon: IconTasks,      title: 'Task Runner' },
  { id: 'testing',    Icon: IconTesting,    title: 'Testing' },
  { id: 'network',    Icon: IconNetwork,    title: 'Network / Peers' },
  { id: 'chat',       Icon: IconChat,       title: 'Chat' },
  { id: 'history',    Icon: IconHistory,    title: 'Session Log' },
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function ActivityBar({ active, onChange, gitChanges = 0, peersOnline = 0 }: Props) {
  return (
    <div style={{
      width: 48,
      background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      paddingTop: 4,
      flexShrink: 0,
    }}>
      {TOP_ITEMS.map(({ id, Icon, title }) => {
        const badge = id === 'git' ? gitChanges : id === 'network' ? peersOnline : 0
        const isActive = active === id
        return (
          <button
            key={id}
            title={title}
            onClick={() => onChange(id)}
            style={{
              position: 'relative',
              width: 48, height: 48,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
              borderLeft: `2px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
              background: isActive ? 'var(--bg-hover)' : 'transparent',
              transition: 'color 0.12s',
            }}
            onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }}
            onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' }}
          >
            <Icon size={22} />
            {badge > 0 && (
              <span style={{
                position: 'absolute', top: 7, right: 5,
                background: 'var(--accent)', color: '#fff',
                borderRadius: 10, fontSize: 9, fontWeight: 700,
                minWidth: 15, height: 15,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 3px', lineHeight: 1,
              }}>{badge > 99 ? '99+' : badge}</span>
            )}
          </button>
        )
      })}

      <div style={{ flex: 1 }} />

      <button
        title="Settings"
        onClick={() => onChange('settings')}
        style={{
          width: 48, height: 48, marginBottom: 4,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: active === 'settings' ? 'var(--text-primary)' : 'var(--text-muted)',
          borderLeft: `2px solid ${active === 'settings' ? 'var(--accent)' : 'transparent'}`,
          background: active === 'settings' ? 'var(--bg-hover)' : 'transparent',
          transition: 'color 0.12s',
        }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = active === 'settings' ? 'var(--text-primary)' : 'var(--text-muted)'}
      >
        <IconSettings size={22} />
      </button>
    </div>
  )
}
