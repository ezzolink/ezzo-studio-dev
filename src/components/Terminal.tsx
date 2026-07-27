import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Terminal as XTerm } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { WebLinksAddon } from 'xterm-addon-web-links'
import type { ILinkProvider, ILink, IViewportRange } from 'xterm'
import 'xterm/css/xterm.css'
import { useTheme } from '../hooks/useTheme'
import { useSettings } from '../hooks/useSettings'
import { IconClose, IconDelete, IconCopy } from './Icons'

type BottomTab = 'problems' | 'output' | 'debug' | 'terminal' | 'ports' | 'gitlens' | 'query'

interface TermTab {
  id: string
  name: string
  shellType: 'powershell' | 'cmd' | 'bash'
  term: XTerm
  fit: FitAddon
  container: HTMLDivElement | null
}

interface Props {
  onReady?: () => void
  onClose?: () => void
}

// Convert markdown-like patterns to ANSI escape codes
function mdToAnsi(text: string): string {
  if (!/[#*_`]/.test(text)) return text
  return text
    .replace(/^### (.+)$/gm, '\x1b[1;36m$1\x1b[0m')
    .replace(/^## (.+)$/gm, '\x1b[1;33m$1\x1b[0m')
    .replace(/^# (.+)$/gm, '\x1b[1;32m$1\x1b[0m')
    .replace(/\*\*(.+?)\*\*/g, '\x1b[1m$1\x1b[0m')
    .replace(/\*(.+?)\*/g, '\x1b[3m$1\x1b[0m')
    .replace(/_(.+?)_/g, '\x1b[4m$1\x1b[0m')
    .replace(/`(.+?)`/g, '\x1b[32m$1\x1b[0m')
}

// Error pattern for links
const ERROR_REGEX = /(?:at\s+|File ")([^\s"(]+\.(ts|tsx|js|jsx|py|mjs|cjs))(?:",\s*line\s*|:)(\d+)/g

class ErrorLinkProvider implements ILinkProvider {
  private _term: XTerm
  constructor(term: XTerm) { this._term = term }

  provideLinks(bufferLineIndex: number, callback: (links: ILink[] | undefined) => void): void {
    const line = this._term.buffer.active.getLine(bufferLineIndex)
    if (!line) { callback(undefined); return }
    const text = line.translateToString(true)
    const links: ILink[] = []
    let m: RegExpExecArray | null
    ERROR_REGEX.lastIndex = 0
    while ((m = ERROR_REGEX.exec(text)) !== null) {
      const filePath = m[1]
      const lineNum = parseInt(m[3], 10)
      const startCol = m.index
      const endCol = m.index + m[0].length
      links.push({
        range: {
          start: { x: startCol + 1, y: bufferLineIndex + 1 },
          end: { x: endCol + 1, y: bufferLineIndex + 1 },
        } as IViewportRange,
        text: m[0],
        activate: () => { window.api.openFileAtLine?.(filePath, lineNum) },
      })
    }
    callback(links.length ? links : undefined)
  }
}

const XTERM_DARK = {
  background: '#0d1117', foreground: '#e6edf3', cursor: '#58a6ff',
  black: '#484f58', red: '#ff7b72', green: '#3fb950', yellow: '#d29922',
  blue: '#388bfd', magenta: '#bc8cff', cyan: '#76e3ea', white: '#b1bac4',
  brightBlack: '#6e7681', brightRed: '#ffa198', brightGreen: '#56d364',
  brightYellow: '#e3b341', brightBlue: '#79c0ff', brightMagenta: '#d2a8ff',
  brightCyan: '#b3f0ff', brightWhite: '#f0f6fc',
}

const XTERM_LIGHT = {
  background: '#ffffff', foreground: '#1f2328', cursor: '#0969da',
  black: '#24292f', red: '#cf222e', green: '#116329', yellow: '#9a6700',
  blue: '#0550ae', magenta: '#8250df', cyan: '#1b7c83', white: '#6e7781',
  brightBlack: '#57606a', brightRed: '#a40e26', brightGreen: '#1a7f37',
  brightYellow: '#633c01', brightBlue: '#0969da', brightMagenta: '#6639ba',
  brightCyan: '#3192aa', brightWhite: '#8c959f',
}

let termCounter = 0

function createTab(id: string, name: string, shellType: 'powershell' | 'cmd' | 'bash', fontSize = 13, isDark = true): Omit<TermTab, 'container'> & { container: null } {
  const term = new XTerm({
    fontFamily: 'var(--font-mono)',
    fontSize,
    theme: isDark ? XTERM_DARK : XTERM_LIGHT,
    cursorBlink: true,
    allowTransparency: true,
    scrollback: 5000,
    rightClickSelectsWord: true,
  })

  // Handle Ctrl+C and Ctrl+V clipboard operations
  term.attachCustomKeyEventHandler((arg: KeyboardEvent) => {
    if (arg.type === 'keydown') {
      // Ctrl+C or Cmd+C
      if ((arg.ctrlKey || arg.metaKey) && arg.key.toLowerCase() === 'c') {
        if (term.hasSelection()) {
          navigator.clipboard.writeText(term.getSelection())
          return false // Don't send interrupt signal if text is selected!
        }
      }
      // Ctrl+V or Cmd+V
      if ((arg.ctrlKey || arg.metaKey) && arg.key.toLowerCase() === 'v') {
        navigator.clipboard.readText().then(text => {
          if (text) {
            window.api.terminalInput(id, text)
          }
        }).catch(() => { /* clipboard read denied */ })
        return false // Paste handled!
      }
    }
    return true
  })

  const fit = new FitAddon()
  term.loadAddon(fit)
  term.loadAddon(new WebLinksAddon())
  term.registerLinkProvider(new ErrorLinkProvider(term))
  return { id, name, shellType, term, fit, container: null }
}

export default function Terminal({ onReady, onClose }: Props) {
  const [activeBottomTab, setActiveBottomTab] = useState<BottomTab>('terminal')
  const [tabs, setTabs] = useState<TermTab[]>([])
  const [activeId, setActiveId] = useState<string>('')
  const [isSplitView, setIsSplitView] = useState(false)
  const [showShellMenu, setShowShellMenu] = useState(false)
  
  const containerMapRef = useRef<Map<string, HTMLDivElement>>(new Map())
  const initedRef = useRef(false)
  const tabsRef = useRef<TermTab[]>([])
  const { isDark } = useTheme()
  const settings = useSettings()

  // Apply font size when setting changes
  useEffect(() => {
    tabsRef.current.forEach(t => {
      t.term.options.fontSize = settings.terminalFontSize
      try { t.fit.fit() } catch { /* */ }
    })
  }, [settings.terminalFontSize])

  // Apply xterm theme when dark/light changes
  useEffect(() => {
    const xtermTheme = isDark ? XTERM_DARK : XTERM_LIGHT
    tabsRef.current.forEach(t => {
      t.term.options.theme = { ...xtermTheme }
    })
  }, [isDark])

  const spawnTab = useCallback(async (tab: TermTab) => {
    const el = containerMapRef.current.get(tab.id)
    if (!el) return
    tab.fit.activate(tab.term)
    tab.term.open(el)
    setTimeout(() => { try { tab.fit.fit() } catch { /* */ } }, 80)

    await window.api.spawnTerminal(tab.id, tab.term.cols, tab.term.rows, tab.shellType)

    tab.term.onData((data: string) => {
      window.api.terminalInput(tab.id, data)
    })

    window.api.onTerminalOutput(tab.id, (data: string) => {
      tab.term.write(mdToAnsi(data))
    })

    // Debounced ResizeObserver to prevent text corruption or duplication while dragging/resizing
    let resizeTimer: ReturnType<typeof setTimeout> | null = null
    const ro = new ResizeObserver(() => {
      if (resizeTimer) clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => {
        try {
          tab.fit.fit()
          if (tab.term.cols > 0 && tab.term.rows > 0) {
            window.api.terminalResize(tab.id, tab.term.cols, tab.term.rows)
          }
        } catch { /* */ }
      }, 100)
    })
    ro.observe(el)
  }, [])

  const addTab = useCallback(async (shellType: 'powershell' | 'cmd' | 'bash' = 'powershell') => {
    termCounter++
    const id = `term-${termCounter}`
    const labelMap = { powershell: 'PowerShell', cmd: 'CMD', bash: 'Bash' }
    const name = `${labelMap[shellType]} ${termCounter}`
    const partial = createTab(id, name, shellType, settings.terminalFontSize, isDark)
    const tab = partial as unknown as TermTab
    setTabs(prev => {
      const next = [...prev, tab]
      tabsRef.current = next
      return next
    })
    setActiveId(id)
    setShowShellMenu(false)
  }, [settings.terminalFontSize, isDark])

  const closeTab = useCallback((id: string) => {
    window.api.killTerminal(id)
    setTabs(prev => {
      const next = prev.filter(t => t.id !== id)
      tabsRef.current = next
      setActiveId(cur => cur === id ? (next[next.length - 1]?.id ?? '') : cur)
      return next
    })
  }, [])

  const clearCurrentTab = useCallback(() => {
    const current = tabsRef.current.find(t => t.id === activeId)
    if (current) {
      current.term.clear()
    }
  }, [activeId])

  const copyCurrentSelection = useCallback(() => {
    const current = tabsRef.current.find(t => t.id === activeId)
    if (current && current.term.hasSelection()) {
      navigator.clipboard.writeText(current.term.getSelection())
    }
  }, [activeId])

  const pasteToCurrentTab = useCallback(() => {
    const current = tabsRef.current.find(t => t.id === activeId)
    if (current) {
      navigator.clipboard.readText().then(text => {
        if (text) window.api.terminalInput(current.id, text)
      }).catch(() => { /* ignore */ })
    }
  }, [activeId])

  // Initial tab
  useEffect(() => {
    if (initedRef.current) return
    initedRef.current = true
    termCounter++
    const id = `term-${termCounter}`
    const name = `PowerShell ${termCounter}`
    const partial = createTab(id, name, 'powershell', settings.terminalFontSize, isDark)
    const tab = partial as unknown as TermTab
    tabsRef.current = [tab]
    setTabs([tab])
    setActiveId(id)
    onReady?.()
    return () => {
      tabsRef.current.forEach(t => { window.api.killTerminal(t.id); t.term.dispose() })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Attach container and spawn when ref is set
  const attachContainer = useCallback((id: string, el: HTMLDivElement | null) => {
    if (!el) return
    containerMapRef.current.set(id, el)
    const tab = tabsRef.current.find(t => t.id === id)
    if (!tab || tab.container) return
    tab.container = el
    spawnTab(tab)
  }, [spawnTab])

  // Listen for run-task events from TaskRunner
  useEffect(() => {
    const handler = (e: Event) => {
      const cmd = (e as CustomEvent<string>).detail
      const activeTab = tabsRef.current.find(t => t.id === activeId) ?? tabsRef.current[0]
      if (!activeTab) return
      window.api.terminalInput(activeTab.id, cmd + '\r')
    }
    window.addEventListener('run-task', handler)
    return () => window.removeEventListener('run-task', handler)
  }, [activeId])

  // Bottom Tabs config
  const featureTabs: { id: BottomTab; label: string; badge?: string }[] = [
    { id: 'problems', label: 'Problemas', badge: '0' },
    { id: 'output', label: 'Output' },
    { id: 'debug', label: 'Debug Console' },
    { id: 'terminal', label: 'Terminal' },
    { id: 'ports', label: 'Ports' },
    { id: 'gitlens', label: 'GitLens' },
    { id: 'query', label: 'Query Results' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: isDark ? '#0d1117' : '#ffffff', userSelect: 'none' }}>
      {/* Main Header Bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)',
        height: 34, flexShrink: 0, padding: '0 8px',
      }}>
        {/* Left Feature Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, overflowX: 'auto' }}>
          {featureTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveBottomTab(tab.id)}
              style={{
                background: 'transparent',
                color: activeBottomTab === tab.id ? 'var(--text-primary)' : 'var(--text-muted)',
                border: 'none',
                borderBottom: `2px solid ${activeBottomTab === tab.id ? 'var(--accent)' : 'transparent'}`,
                padding: '0 8px',
                height: 34,
                fontSize: 11,
                fontWeight: activeBottomTab === tab.id ? 600 : 400,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                whiteSpace: 'nowrap',
              }}
            >
              <span>{tab.label}</span>
              {tab.badge && (
                <span style={{
                  fontSize: 10, padding: '0 5px', borderRadius: 8,
                  background: 'var(--bg-hover)', color: 'var(--text-secondary)',
                }}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Right Action Icons for Terminal */}
        {activeBottomTab === 'terminal' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, position: 'relative' }}>
            {/* Copy button */}
            <button
              title="Copiar Seleção (Ctrl+C)"
              onClick={copyCurrentSelection}
              style={{
                background: 'transparent', border: 'none',
                color: 'var(--text-secondary)', padding: '3px 6px', borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <IconCopy size={13} />
            </button>

            {/* Paste button */}
            <button
              title="Colar da Área de Transferência (Ctrl+V)"
              onClick={pasteToCurrentTab}
              style={{
                background: 'transparent', border: 'none',
                color: 'var(--text-secondary)', padding: '3px 6px', borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: 11, fontWeight: 600,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              📋
            </button>

            {/* Shell selector (+) */}
            <div style={{ position: 'relative' }}>
              <button
                title="Novo Terminal (PowerShell / CMD / Bash)"
                onClick={() => setShowShellMenu(v => !v)}
                style={{
                  background: 'transparent', border: 'none',
                  color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer',
                  padding: '3px 6px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 3,
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
              </button>

              {/* Shell Dropdown */}
              {showShellMenu && (
                <div style={{
                  position: 'absolute', right: 0, top: '100%', marginTop: 4,
                  background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                  borderRadius: 6, boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
                  padding: '4px 0', zIndex: 1000, minWidth: 150,
                }}>
                  <div
                    onClick={() => addTab('powershell')}
                    style={{ padding: '6px 12px', fontSize: 11, cursor: 'pointer', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                    PowerShell
                  </div>
                  <div
                    onClick={() => addTab('cmd')}
                    style={{ padding: '6px 12px', fontSize: 11, cursor: 'pointer', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8l4 4-4 4M12 16h6"/></svg>
                    Command Prompt (CMD)
                  </div>
                  <div
                    onClick={() => addTab('bash')}
                    style={{ padding: '6px 12px', fontSize: 11, cursor: 'pointer', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
                    Git Bash / Bash
                  </div>
                </div>
              )}
            </div>

            {/* Split Terminal button */}
            <button
              title={isSplitView ? 'Unsplit Terminals' : 'Split Terminal Side-by-Side'}
              onClick={() => setIsSplitView(v => !v)}
              style={{
                background: isSplitView ? 'var(--bg-hover)' : 'transparent',
                border: 'none', color: isSplitView ? 'var(--accent)' : 'var(--text-secondary)',
                padding: '3px 6px', borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = isSplitView ? 'var(--bg-hover)' : 'transparent')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="12" y1="3" x2="12" y2="21" /></svg>
            </button>

            {/* Trash / Clear Output button */}
            <button
              title="Limpar Saída do Terminal (Clear)"
              onClick={clearCurrentTab}
              style={{
                background: 'transparent', border: 'none',
                color: 'var(--text-secondary)', padding: '3px 6px', borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <IconDelete size={14} />
            </button>

            {/* Close Bottom Panel */}
            {onClose && (
              <button
                title="Fechar Painel do Terminal"
                onClick={onClose}
                style={{
                  background: 'transparent', border: 'none',
                  color: 'var(--text-secondary)', padding: '3px 6px', borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <IconClose size={14} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Body View Content */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

        {/* Tab 1: Problemas */}
        {activeBottomTab === 'problems' && (
          <div style={{ padding: 16, fontSize: 12, color: 'var(--text-muted)' }}>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              <span>Nenhum problema detetado no espaço de trabalho.</span>
            </div>
            <div>Static code analysis, TypeScript errors, and linter diagnostic results will appear here.</div>
          </div>
        )}

        {/* Tab 2: Output */}
        {activeBottomTab === 'output' && (
          <div style={{ padding: 12, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', overflowY: 'auto', height: '100%' }}>
            <div style={{ color: 'var(--accent)' }}>[EZZO Studio Dev Output Log]</div>
            <div>[System] Connected to Electron Main Process</div>
            <div>[Vite] Dev server running at http://localhost:5173/</div>
            <div>[Socket.io] Local collaboration server ready on port 7700</div>
          </div>
        )}

        {/* Tab 3: Debug Console */}
        {activeBottomTab === 'debug' && (
          <div style={{ padding: 12, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            <div>Debug session not active. Press F5 or start Debugging from Run menu.</div>
          </div>
        )}

        {/* Tab 4: Terminal */}
        {activeBottomTab === 'terminal' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Terminal Tab Bar (when multiple tabs exist) */}
            {tabs.length > 1 && (
              <div style={{
                display: 'flex', alignItems: 'center',
                background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border)',
                flexShrink: 0, overflowX: 'auto', height: 28,
              }}>
                {tabs.map(t => (
                  <div
                    key={t.id}
                    onClick={() => setActiveId(t.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '0 10px', height: 28, cursor: 'pointer', whiteSpace: 'nowrap',
                      fontSize: 11,
                      background: t.id === activeId ? (isDark ? '#0d1117' : '#ffffff') : 'transparent',
                      borderBottom: `2px solid ${t.id === activeId ? 'var(--accent)' : 'transparent'}`,
                      color: t.id === activeId ? 'var(--text-primary)' : 'var(--text-muted)',
                      borderRight: '1px solid var(--border)',
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
                    <span>{t.name}</span>
                    <button
                      onClick={e => { e.stopPropagation(); closeTab(t.id) }}
                      style={{ color: 'var(--text-muted)', padding: '0 2px', fontSize: 11, background: 'transparent', border: 'none', cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--error)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                    >×</button>
                  </div>
                ))}
              </div>
            )}

            {/* Terminal Panes (Single or Split side-by-side) */}
            <div style={{ flex: 1, position: 'relative', display: 'flex', width: '100%', height: '100%' }}>
              {tabs.map((t, idx) => {
                const isVisible = isSplitView ? (idx < 2) : (t.id === activeId)
                return (
                  <div
                    key={t.id}
                    ref={el => attachContainer(t.id, el)}
                    style={{
                      flex: isSplitView && isVisible ? 1 : undefined,
                      position: isSplitView ? 'relative' : 'absolute',
                      inset: isSplitView ? undefined : 0,
                      display: isVisible ? 'block' : 'none',
                      padding: 4,
                      borderRight: isSplitView && idx === 0 ? '1px solid var(--border)' : 'none',
                      height: '100%',
                    }}
                  />
                )
              })}
            </div>
          </div>
        )}

        {/* Tab 5: Ports */}
        {activeBottomTab === 'ports' && (
          <div style={{ padding: 12, fontSize: 12 }}>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>Forwarded & Local Active Ports</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: 6 }}>Port</th>
                  <th style={{ padding: 6 }}>Process</th>
                  <th style={{ padding: 6 }}>Address</th>
                  <th style={{ padding: 6 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--border-light)', color: 'var(--text-primary)' }}>
                  <td style={{ padding: 6, color: 'var(--accent)' }}>5173</td>
                  <td style={{ padding: 6 }}>Vite Frontend Dev Server</td>
                  <td style={{ padding: 6 }}>http://localhost:5173</td>
                  <td style={{ padding: 6, color: '#22c55e' }}>● Running</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border-light)', color: 'var(--text-primary)' }}>
                  <td style={{ padding: 6, color: 'var(--accent)' }}>7700</td>
                  <td style={{ padding: 6 }}>EZZO Socket.io Host Server</td>
                  <td style={{ padding: 6 }}>0.0.0.0:7700</td>
                  <td style={{ padding: 6, color: '#22c55e' }}>● Listening</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 6: GitLens */}
        {activeBottomTab === 'gitlens' && (
          <div style={{ padding: 16, fontSize: 12, color: 'var(--text-secondary)' }}>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <span>GitLens Insights & Revision History</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Branch: <span style={{ color: 'var(--accent)', fontWeight: 600 }}>main</span> | Remote: <span style={{ color: 'var(--text-primary)' }}>origin/main</span>
            </div>
            <div style={{ marginTop: 10, fontSize: 11 }}>
              Hover over lines in the editor to see inline Git blame, author info, and commit details.
            </div>
          </div>
        )}

        {/* Tab 7: Query Results */}
        {activeBottomTab === 'query' && (
          <div style={{ padding: 16, fontSize: 12, color: 'var(--text-muted)' }}>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3h18v18H3z"/><path d="M3 9h18M9 3v18"/></svg>
              <span>Query Results Viewer</span>
            </div>
            <div>Execute database queries or data scripts to preview result tables here.</div>
          </div>
        )}

      </div>
    </div>
  )
}
