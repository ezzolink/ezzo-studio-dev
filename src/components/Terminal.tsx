import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Terminal as XTerm } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { WebLinksAddon } from 'xterm-addon-web-links'
import type { ILinkProvider, ILink, IBufferCellPosition, IViewportRange } from 'xterm'
import 'xterm/css/xterm.css'
import { useTheme } from '../hooks/useTheme'
import { useSettings } from '../hooks/useSettings'

interface TermTab {
  id: string
  name: string
  term: XTerm
  fit: FitAddon
  container: HTMLDivElement
}

interface Props {
  onReady?: () => void
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

// Error pattern: file.ts:123, File "path.py", line 12
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

function createTab(id: string, name: string, fontSize = 13): Omit<TermTab, 'container'> & { container: null } {
  const term = new XTerm({
    fontFamily: 'var(--font-mono)',
    fontSize,
    theme: XTERM_DARK,
    cursorBlink: true,
    allowTransparency: true,
    scrollback: 5000,
  })
  const fit = new FitAddon()
  term.loadAddon(fit)
  term.loadAddon(new WebLinksAddon())
  term.registerLinkProvider(new ErrorLinkProvider(term))
  return { id, name, term, fit, container: null }
}

export default function Terminal({ onReady }: Props) {
  const [tabs, setTabs] = useState<TermTab[]>([])
  const [activeId, setActiveId] = useState<string>('')
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
    tabsRef.current.forEach(t => t.term.options.theme = xtermTheme)
  }, [isDark])

  const spawnTab = useCallback(async (tab: TermTab) => {
    const el = containerMapRef.current.get(tab.id)
    if (!el) return
    tab.fit.activate(tab.term)
    tab.term.open(el)
    setTimeout(() => { try { tab.fit.fit() } catch { /* */ } }, 50)

    await window.api.spawnTerminal(tab.id, tab.term.cols, tab.term.rows)

    tab.term.onData((data: string) => {
      window.api.terminalInput(tab.id, data)
    })

    window.api.onTerminalOutput(tab.id, (data: string) => {
      tab.term.write(mdToAnsi(data))
    })

    const ro = new ResizeObserver(() => {
      try {
        tab.fit.fit()
        window.api.terminalResize(tab.id, tab.term.cols, tab.term.rows)
      } catch { /* */ }
    })
    ro.observe(el)
  }, [])

  const addTab = useCallback(async () => {
    termCounter++
    const id = `term-${termCounter}`
    const name = `bash ${termCounter}`
    const partial = createTab(id, name, settings.terminalFontSize)
    const tab = partial as unknown as TermTab // container set via ref callback
    setTabs(prev => {
      const next = [...prev, tab]
      tabsRef.current = next
      return next
    })
    setActiveId(id)
    // spawnTab called in container ref callback
  }, [])

  const closeTab = useCallback((id: string) => {
    window.api.killTerminal(id)
    setTabs(prev => {
      const next = prev.filter(t => t.id !== id)
      tabsRef.current = next
      setActiveId(cur => cur === id ? (next[next.length - 1]?.id ?? '') : cur)
      return next
    })
  }, [])

  // Initial tab
  useEffect(() => {
    if (initedRef.current) return
    initedRef.current = true
    termCounter++
    const id = `term-${termCounter}`
    const name = `bash ${termCounter}`
    const partial = createTab(id, name, settings.terminalFontSize)
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: isDark ? '#0d1117' : '#ffffff' }}>
      {/* Tab bar */}
      <div style={{
        display: 'flex', alignItems: 'center',
        background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)',
        flexShrink: 0, overflowX: 'auto',
      }}>
        {tabs.map(t => (
          <div
            key={t.id}
            onClick={() => setActiveId(t.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '0 10px', height: 32, cursor: 'pointer', whiteSpace: 'nowrap',
              fontSize: 11,
              background: t.id === activeId ? '#0d1117' : 'var(--bg-secondary)',
              borderBottom: `2px solid ${t.id === activeId ? 'var(--accent)' : 'transparent'}`,
              color: t.id === activeId ? 'var(--text-primary)' : 'var(--text-muted)',
              borderRight: '1px solid var(--border)',
            }}
          >
            ⬛ {t.name}
            {tabs.length > 1 && (
              <button
                onClick={e => { e.stopPropagation(); closeTab(t.id) }}
                style={{ color: 'var(--text-muted)', padding: '0 2px', fontSize: 11, lineHeight: 1 }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--error)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'}
              >×</button>
            )}
          </div>
        ))}
        <button
          onClick={addTab}
          title="New Terminal"
          style={{ padding: '0 10px', height: 32, color: 'var(--text-muted)', fontSize: 16, flexShrink: 0 }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'}
        >+</button>
      </div>

      {/* Terminal panes */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {tabs.map(t => (
          <div
            key={t.id}
            ref={el => attachContainer(t.id, el)}
            style={{
              position: 'absolute', inset: 0,
              display: t.id === activeId ? 'block' : 'none',
              padding: 4,
            }}
          />
        ))}
      </div>
    </div>
  )
}
