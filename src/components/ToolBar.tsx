import React from 'react'
import { IconOpenFolder, IconTerminal, IconSave } from './Icons'

// Melhor ícone VS Code — logótipo real simplificado
const IconVSCode = ({ size = 15, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill={color}>
    <path d="M74.5 6.6L51.4 27.4 32.6 12 24 18.5l17 14.5L24 47.5l8.6 6.5 18.8-15.4 23.1 20.8V6.6zm0 86.8L51.4 72.6 32.6 88 24 81.5l17-14.5L24 52.5 32.6 46l18.8 15.4 23.1-20.8v52.8z"/>
  </svg>
)

// Layout / panel toggle
const IconLayoutPanel = ({ size = 15, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <path d="M3 9h18M9 21V9"/>
  </svg>
)

// Split editor icon
const IconSplit = ({ size = 15, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <path d="M12 3v18"/>
  </svg>
)

interface Props {
  onOpenFolder: () => void
  terminalVisible: boolean
  onToggleTerminal: () => void
  onSaveAll: () => void
  hasUnsaved: boolean
  activeFile: string | null
  splitEnabled: boolean
  onToggleSplit: () => void
  sidebarVisible: boolean
  onToggleSidebar: () => void
}

export default function ToolBar({ onOpenFolder, terminalVisible, onToggleTerminal, onSaveAll, hasUnsaved, activeFile, splitEnabled, onToggleSplit, sidebarVisible, onToggleSidebar }: Props) {
  return (
    <div style={{
      height: 36,
      background: 'var(--bg-tertiary)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 8px',
      gap: 2,
      flexShrink: 0,
    }}>
      <Btn icon={<IconOpenFolder size={14} />} label="Open Folder" onClick={onOpenFolder} />
      <Sep />
      <Btn icon={<IconSave size={14} />} label="Save All" onClick={onSaveAll}
        active={hasUnsaved} highlight={hasUnsaved} />
      <Sep />
      <Btn icon={<IconTerminal size={14} />} label={terminalVisible ? 'Hide Terminal' : 'Terminal'}
        onClick={onToggleTerminal} active={terminalVisible} />
      <Btn icon={<IconLayoutPanel size={14} />} label={sidebarVisible ? 'Hide Sidebar' : 'Show Sidebar'}
        onClick={onToggleSidebar} active={sidebarVisible} />
      <Btn icon={<IconSplit size={14} />} label={splitEnabled ? 'Close Split' : 'Split Editor'}
        onClick={onToggleSplit} active={splitEnabled} />
      <Sep />
      <Btn icon={<IconVSCode size={14} />} label="VS Code"
        onClick={() => activeFile && window.api.openInVSCode?.(activeFile)}
        disabled={!activeFile} />

      <div style={{ flex: 1 }} />

      {activeFile && (
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {activeFile.split(/[/\\]/).pop()}
        </span>
      )}
    </div>
  )
}

function Sep() {
  return <div style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 3px' }} />
}

function Btn({ icon, label, onClick, active = false, highlight = false, disabled = false }: {
  icon: React.ReactNode; label: string; onClick: () => void
  active?: boolean; highlight?: boolean; disabled?: boolean
}) {
  return (
    <button
      title={label}
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '0 8px', height: 28, borderRadius: 4,
        fontSize: 12,
        color: highlight ? 'var(--warning)' : active ? 'var(--accent)' : 'var(--text-secondary)',
        opacity: disabled ? 0.4 : 1,
        transition: 'background 0.1s, color 0.1s',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={e => { if (!disabled) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)' }}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}
