import React, { useState } from 'react'
import { useTheme } from '../hooks/useTheme'
import { useUpdate } from '../hooks/useUpdate'
import UpdateModal from './UpdateModal'

const BUILD_DATE = '2026-06-25'

const IconMoon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
)
const IconSun = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
)

const ACCENTS = [
  { color: '#388bfd', label: 'Blue' },
  { color: '#3fb950', label: 'Green' },
  { color: '#bc8cff', label: 'Purple' },
  { color: '#d29922', label: 'Orange' },
  { color: '#f85149', label: 'Red' },
]

const FONT_SIZES = [11, 12, 13, 14, 15, 16]

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: 16, marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function Toggle({ label, checked, onChange, description }: { label: string; checked: boolean; onChange: (v: boolean) => void; description?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
      <div>
        <div style={{ fontSize: 12, color: 'var(--text-primary)' }}>{label}</div>
        {description && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{description}</div>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        style={{
          width: 36, height: 20, borderRadius: 10, flexShrink: 0,
          background: checked ? 'var(--accent)' : 'var(--bg-hover)',
          border: '1px solid var(--border)',
          position: 'relative', cursor: 'pointer',
          transition: 'background 0.15s',
        }}
      >
        <span style={{
          position: 'absolute', top: 2,
          left: checked ? 18 : 2,
          width: 14, height: 14, borderRadius: '50%',
          background: '#fff',
          transition: 'left 0.15s',
          display: 'block',
        }} />
      </button>
    </div>
  )
}

const SETTINGS_KEY = 'ezzo-settings'
function loadSettings() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') } catch { return {} }
}
function saveSettings(s: object) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
}

export default function ThemePanel() {
  const { isDark, accent, setDark, setAccent } = useTheme()
  const { update, checking, check } = useUpdate()
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [settings, setSettings] = useState(() => ({
    fontSize: 13,
    minimap: true,
    autosave: true,
    wordWrap: false,
    terminalFontSize: 13,
    sidebarWidth: 250,
    ...loadSettings(),
  }))

  const applySetting = (key: string, value: unknown) => {
    const next = { ...settings, [key]: value }
    setSettings(next)
    saveSettings(next)
    if (key === 'fontSize') document.documentElement.style.setProperty('--editor-font-size', `${value}px`)
    if (key === 'sidebarWidth') document.documentElement.style.setProperty('--sidebar-width', `${value}px`)
    window.dispatchEvent(new Event('ezzo-settings-changed'))
  }

  return (
    <>
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '0 8px', height: 32, display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--border-light)', flexShrink: 0 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Settings</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px' }}>

        {/* Appearance */}
        <Section title="Appearance">
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Theme</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['dark', 'light'] as const).map(mode => (
                <button key={mode} onClick={() => setDark(mode === 'dark')} className="btn"
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    background: (isDark ? 'dark' : 'light') === mode ? 'var(--accent)' : undefined,
                    borderColor: (isDark ? 'dark' : 'light') === mode ? 'var(--accent)' : undefined,
                    color: (isDark ? 'dark' : 'light') === mode ? '#fff' : undefined,
                  }}>
                  {mode === 'dark' ? <><IconMoon /> Dark</> : <><IconSun /> Light</>}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Accent Color</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {ACCENTS.map(({ color, label }) => (
                <button key={color} title={label} onClick={() => setAccent(color)} style={{
                  width: 26, height: 26, borderRadius: '50%', background: color,
                  border: accent === color ? '2px solid var(--text-primary)' : '2px solid transparent',
                  outline: accent === color ? `2px solid ${color}` : 'none',
                  outlineOffset: 2, cursor: 'pointer', flexShrink: 0,
                }} />
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Sidebar Width</div>
            <input type="range" min={180} max={400} value={settings.sidebarWidth}
              onChange={e => applySetting('sidebarWidth', Number(e.target.value))}
              style={{ width: '100%' }} />
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'right' }}>{settings.sidebarWidth}px</div>
          </div>
        </Section>

        {/* Editor */}
        <Section title="Editor">
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Font Size</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {FONT_SIZES.map(s => (
                <button key={s} onClick={() => applySetting('fontSize', s)} className="btn"
                  style={{
                    padding: '2px 8px', fontSize: 11,
                    background: settings.fontSize === s ? 'var(--accent)' : undefined,
                    color: settings.fontSize === s ? '#fff' : undefined,
                    borderColor: settings.fontSize === s ? 'var(--accent)' : undefined,
                  }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <Toggle label="Minimap" description="Show file overview on the right" checked={settings.minimap} onChange={v => applySetting('minimap', v)} />
          <Toggle label="Auto Save" description="Save 1s after typing stops" checked={settings.autosave} onChange={v => applySetting('autosave', v)} />
          <Toggle label="Word Wrap" checked={settings.wordWrap} onChange={v => applySetting('wordWrap', v)} />
        </Section>

        {/* Terminal */}
        <Section title="Terminal">
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Font Size</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {FONT_SIZES.map(s => (
                <button key={s} onClick={() => applySetting('terminalFontSize', s)} className="btn"
                  style={{
                    padding: '2px 8px', fontSize: 11,
                    background: settings.terminalFontSize === s ? 'var(--accent)' : undefined,
                    color: settings.terminalFontSize === s ? '#fff' : undefined,
                    borderColor: settings.terminalFontSize === s ? 'var(--accent)' : undefined,
                  }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </Section>

        {/* Updates */}
        <Section title="Updates">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-primary)' }}>Current version</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>v{update?.current ?? '1.0.0'}</div>
            </div>
            <button className={update?.hasUpdate ? 'btn btn-primary' : 'btn'} style={{ fontSize: 11 }}
              onClick={update?.hasUpdate ? () => setShowUpdateModal(true) : check}
              disabled={checking}>
              {checking ? 'Checking…' : update?.hasUpdate ? `v${update.latest.replace(/^v/, '')} available` : 'Check for updates'}
            </button>
          </div>
          {!update?.hasUpdate && !checking && update && (
            <div style={{ fontSize: 11, color: 'var(--success)' }}>✓ You are up to date</div>
          )}
        </Section>

        {/* About */}
        <Section title="About">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>EZZO Work Local</span>
              <span style={{
                fontSize: 10, fontFamily: 'var(--font-mono)',
                background: 'var(--bg-active)', color: 'var(--accent)',
                padding: '2px 8px', borderRadius: 10,
              }}>v{update?.current ?? '1.0.5'}</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Build: {BUILD_DATE}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Electron + React + TypeScript</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Socket.io · CodeMirror 6 · Xterm.js</div>
          </div>
        </Section>

      </div>
    </div>

    {showUpdateModal && update?.hasUpdate && (
      <UpdateModal info={update} onClose={() => setShowUpdateModal(false)} />
    )}
    </>
  )
}
