import React, { useState } from 'react'
import { EzzoLogo, IconClose } from './Icons'

interface Props {
  onClose: () => void
  onCheckUpdates?: () => void
}

export default function AboutModal({ onClose, onCheckUpdates }: Props) {
  const [activeTab, setActiveTab] = useState<'overview' | 'environment' | 'credits'>('overview')

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 99999,
      animation: 'fadeIn 0.2s ease-out'
    }} onClick={onClose}>
      <div style={{
        background: '#0d1117',
        border: '1px solid var(--border)',
        borderRadius: 16,
        width: 520,
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 24px 60px rgba(0, 0, 0, 0.7)',
        overflow: 'hidden',
        position: 'relative',
      }} onClick={e => e.stopPropagation()}>

        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 14, right: 14,
            background: 'transparent', border: 'none',
            color: 'var(--text-muted)', cursor: 'pointer',
            padding: 6, borderRadius: 6, display: 'flex', alignItems: 'center',
            zIndex: 10,
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' }}
        >
          <IconClose size={16} />
        </button>

        {/* Header Hero */}
        <div style={{
          padding: '32px 32px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          background: 'radial-gradient(ellipse at top, rgba(37, 99, 235, 0.25) 0%, rgba(13, 17, 23, 0) 70%)',
          borderBottom: '1px solid var(--border)',
        }}>
          <EzzoLogo height={42} showText={true} />

          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 }}>
              <span style={{
                fontSize: 11, fontWeight: 700,
                padding: '3px 10px', borderRadius: 12,
                background: 'rgba(59, 130, 246, 0.15)',
                color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)',
                fontFamily: 'var(--font-mono, monospace)'
              }}>
                v1.0.7 Production
              </span>
              <span style={{
                fontSize: 11, fontWeight: 600,
                padding: '3px 10px', borderRadius: 12,
                background: 'rgba(34, 197, 94, 0.15)',
                color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.3)',
              }}>
                ● Local Network Active
              </span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 10, maxWidth: 380, lineHeight: 1.5 }}>
              IDE colaborativo desktop em tempo real para equipas de desenvolvimento. Sem servidores externos, sem nuvem, sem latência.
            </p>
          </div>

          {/* Navigation Tabs */}
          <div style={{ display: 'flex', gap: 6, background: 'rgba(255, 255, 255, 0.05)', padding: 3, borderRadius: 8 }}>
            {(['overview', 'environment', 'credits'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  background: activeTab === tab ? 'var(--bg-active, #21262d)' : 'transparent',
                  color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
                  border: 'none', borderRadius: 6,
                  padding: '5px 14px', fontSize: 11, fontWeight: 600,
                  cursor: 'pointer', textTransform: 'capitalize',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Body Content */}
        <div style={{ flex: 1, padding: 24, overflowY: 'auto', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>

          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <FeatureItem title="⚡ Edição Colaborativa em Tempo Real" desc="Edição síncrona com cursores coloridos partilhados e indicação de presença de peers via Socket.io local." />
              <FeatureItem title="📝 Editor CodeMirror 6" desc="Com suporte a Split View, Minimap, Git Diff inline, Auto-save e suporte a 20+ linguagens de programação." />
              <FeatureItem title="💻 Terminal Multi-sessão Integrado" desc="Processos de terminal nativo (PowerShell / Bash) alimentados por node-pty e Xterm.js 5." />
              <FeatureItem title="🌿 Git & Source Control" desc="Visualizador de alterações, staging, commits, diffs inline e integração remota com o GitHub." />
            </div>
          )}

          {activeTab === 'environment' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <SpecRow label="Application" value="EZZO Studio Dev v1.0.7" />
              <SpecRow label="Electron" value="v36.4.0" />
              <SpecRow label="Chromium" value="v134.0.6998.35" />
              <SpecRow label="Node.js" value="v22.15.1" />
              <SpecRow label="React" value="v18.3.1 + TypeScript 5.8" />
              <SpecRow label="Vite" value="v6.3.5" />
              <SpecRow label="Architecture" value="x64 (Windows 10/11)" />
              <SpecRow label="License" value="MIT License © 2026 EZZO Digital" />
            </div>
          )}

          {activeTab === 'credits' && (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                Desenvolvido por EZZO Digital
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                Criado para proporcionar uma experiência de desenvolvimento local rápida, privada e verdadeiramente colaborativa.
              </p>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Website: <a href="https://github.com/ezzolink/ezzo-studio-dev" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>github.com/ezzolink/ezzo-studio-dev</a>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '16px 24px',
          background: '#161b22',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <button
            onClick={() => window.api.openUpdateUrl?.('https://github.com/ezzolink/ezzo-studio-dev')}
            style={{
              background: 'transparent', border: 'none',
              color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4,
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            GitHub Repository ↗
          </button>

          <div style={{ display: 'flex', gap: 8 }}>
            {onCheckUpdates && (
              <button
                onClick={() => { onClose(); onCheckUpdates() }}
                style={{
                  background: 'var(--bg-hover)', color: 'var(--text-primary)',
                  border: '1px solid var(--border)', borderRadius: 6,
                  padding: '6px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                }}
              >
                Check for Updates
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                background: 'var(--accent)', color: '#ffffff',
                border: 'none', borderRadius: 6,
                padding: '6px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

function FeatureItem({ title, desc }: { title: string; desc: string }) {
  return (
    <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: 12, borderRadius: 8, border: '1px solid rgba(255, 255, 255, 0.06)' }}>
      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{title}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{desc}</div>
    </div>
  )
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.02)' }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ color: 'var(--text-primary)', fontWeight: 500, fontFamily: 'var(--font-mono, monospace)' }}>{value}</span>
    </div>
  )
}
