import React, { useState, useEffect, useRef } from 'react'
import { IconMinimize, IconMaximize, IconClose, EzzoLogo } from './Icons'
import type { UpdateInfo } from '../hooks/useUpdate'

interface MenuItem {
  label: string
  shortcut?: string
  action?: () => void
  separator?: boolean
}

interface Props {
  folderName: string | null
  activeFile?: string | null
  onOpenFolder: () => void
  onSaveAll?: () => void
  onToggleTerminal?: () => void
  onToggleSplit?: () => void
  onToggleSidebar?: () => void
  onSelectPanel?: (panel: any) => void
  onOpenPalette?: (mode?: 'file' | 'command') => void
  update?: UpdateInfo | null
  onShowUpdate?: () => void
  onShowAbout?: () => void
  onCheckUpdates?: () => void
}

export default function TitleBar({
  folderName,
  activeFile,
  onOpenFolder,
  onSaveAll,
  onToggleTerminal,
  onToggleSplit,
  onToggleSidebar,
  onSelectPanel,
  onOpenPalette,
  update,
  onShowUpdate,
  onShowAbout,
  onCheckUpdates,
}: Props) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Extract basename of active file for highlight display
  const activeFileName = activeFile ? activeFile.split(/[/\\]/).pop() : null

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Menu structure definition
  const menuDefinitions: Record<string, MenuItem[]> = {
    File: [
      { label: 'Open Folder...', shortcut: 'Ctrl+O', action: onOpenFolder },
      { label: 'Save All', shortcut: 'Ctrl+S', action: onSaveAll },
      { separator: true, label: '' },
      { label: 'Close Folder', action: () => window.location.reload() },
      { separator: true, label: '' },
      { label: 'Exit', action: () => window.api.close() },
    ],
    Edit: [
      { label: 'Undo', shortcut: 'Ctrl+Z' },
      { label: 'Redo', shortcut: 'Ctrl+Y' },
      { separator: true, label: '' },
      { label: 'Cut', shortcut: 'Ctrl+X' },
      { label: 'Copy', shortcut: 'Ctrl+C' },
      { label: 'Paste', shortcut: 'Ctrl+V' },
      { separator: true, label: '' },
      { label: 'Find in Files', shortcut: 'Ctrl+Shift+F', action: () => onSelectPanel?.('search') },
    ],
    Selection: [
      { label: 'Select All', shortcut: 'Ctrl+A' },
      { label: 'Expand Selection', shortcut: 'Shift+Alt+Right' },
      { label: 'Shrink Selection', shortcut: 'Shift+Alt+Left' },
    ],
    View: [
      { label: 'File Explorer', shortcut: 'Ctrl+Shift+E', action: () => onSelectPanel?.('explorer') },
      { label: 'Search', shortcut: 'Ctrl+Shift+F', action: () => onSelectPanel?.('search') },
      { label: 'Source Control', shortcut: 'Ctrl+Shift+G', action: () => onSelectPanel?.('git') },
      { label: 'Remote Collaboration', shortcut: 'Ctrl+Shift+C', action: () => onSelectPanel?.('connect') },
      { label: 'Task Runner', shortcut: 'Ctrl+Shift+R', action: () => onSelectPanel?.('tasks') },
      { separator: true, label: '' },
      { label: 'Toggle Terminal', shortcut: 'Ctrl+`', action: onToggleTerminal },
      { label: 'Toggle Sidebar', action: onToggleSidebar },
      { label: 'Toggle Split Editor', shortcut: 'Ctrl+\\', action: onToggleSplit },
    ],
    Go: [
      { label: 'Go to File...', shortcut: 'Ctrl+P', action: () => onOpenPalette?.('file') },
      { label: 'Command Palette...', shortcut: 'Ctrl+Shift+P', action: () => onOpenPalette?.('command') },
    ],
    Run: [
      { label: 'Run Task...', action: () => onSelectPanel?.('tasks') },
      { label: 'Start Debugging', shortcut: 'F5' },
    ],
    Terminal: [
      { label: 'New Terminal', action: onToggleTerminal },
      { label: 'Toggle Terminal Panel', shortcut: 'Ctrl+`', action: onToggleTerminal },
    ],
    Help: [
      { label: 'About EZZO Studio Dev', action: onShowAbout },
      { label: 'Check for Updates...', action: onCheckUpdates || onShowUpdate },
      { separator: true, label: '' },
      { label: 'Documentation', action: () => window.api.openUpdateUrl?.('https://github.com/ezzolink/ezzo-studio-dev') },
    ],
  }

  const menuKeys = Object.keys(menuDefinitions)

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
      fontSize: 12,
      position: 'relative',
      zIndex: 1000,
    } as React.CSSProperties}>

      {/* Logo & Menus Container */}
      <div ref={menuRef} style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        paddingLeft: 8,
        WebkitAppRegion: 'no-drag',
        flexShrink: 0,
      } as React.CSSProperties}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', paddingRight: 4 }}>
          <EzzoLogo height={17} showText={false} />
        </div>

        {/* Top Menus: File, Edit, Selection, View, Go, Run, Terminal, Help */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {menuKeys.map((menuKey) => {
            const isOpen = activeMenu === menuKey
            return (
              <div key={menuKey} style={{ position: 'relative' }}>
                <button
                  onClick={() => setActiveMenu(isOpen ? null : menuKey)}
                  onMouseEnter={() => { if (activeMenu) setActiveMenu(menuKey) }}
                  style={{
                    background: isOpen ? 'var(--bg-hover)' : 'transparent',
                    color: isOpen ? 'var(--text-primary)' : 'var(--text-secondary)',
                    border: 'none',
                    borderRadius: 4,
                    padding: '3px 8px',
                    fontSize: 12,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {menuKey}
                </button>

                {/* Dropdown Menu */}
                {isOpen && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: 4,
                    minWidth: 200,
                    background: '#161b22',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                    padding: '4px 0',
                    zIndex: 2000,
                  }}>
                    {menuDefinitions[menuKey].map((item, idx) => {
                      if (item.separator) {
                        return <div key={idx} style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                      }
                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            setActiveMenu(null)
                            item.action?.()
                          }}
                          style={{
                            padding: '5px 12px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            cursor: 'pointer',
                            color: 'var(--text-primary)',
                            fontSize: 12,
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <span>{item.label}</span>
                          {item.shortcut && (
                            <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 16 }}>
                              {item.shortcut}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Center Header: [folderName or "No folder open"] - EZZO Studio Dev - [arquivo aberto em destaque] */}
      <div style={{
        flex: 1,
        textAlign: 'center',
        color: 'var(--text-secondary)',
        fontSize: 12,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        overflow: 'hidden',
        padding: '0 12px',
      }}>
        <span style={{ color: 'var(--text-secondary)' }}>
          {folderName || 'No folder open'}
        </span>
        <span style={{ color: 'var(--text-muted)' }}>-</span>
        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
          EZZO Studio Dev
        </span>
        {activeFileName && (
          <>
            <span style={{ color: 'var(--text-muted)' }}>-</span>
            <span style={{
              color: '#60a5fa',
              fontWeight: 600,
              background: 'rgba(59, 130, 246, 0.15)',
              padding: '1px 8px',
              borderRadius: 4,
              border: '1px solid rgba(59, 130, 246, 0.3)',
              fontSize: 11,
              fontFamily: 'var(--font-mono, monospace)',
            }}>
              {activeFileName}
            </span>
          </>
        )}
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
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#f0a500')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--warning)')}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9"/>
              <polyline points="8 12 12 16 16 12"/>
              <line x1="12" y1="8" x2="12" y2="16"/>
            </svg>
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
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
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

