import React, { useEffect, useState } from 'react'
import type { UpdateInfo } from '../hooks/useUpdate'
import { EzzoLogo } from './Icons'

interface Props {
  info: UpdateInfo
  onClose: () => void
}

type Stage = 'idle' | 'downloading' | 'done' | 'error'

function formatNotes(notes: string): React.ReactNode {
  return notes.split('\n').map((line, i) => {
    const t = line.trim()
    if (t.startsWith('## ') || t.startsWith('### '))
      return <div key={i} style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', marginTop: 12, marginBottom: 4 }}>{t.replace(/^#+ /, '')}</div>
    if (t.startsWith('- ') || t.startsWith('* '))
      return <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4 }}><span style={{ color: 'var(--accent)' }}>•</span><span>{t.slice(2)}</span></div>
    if (t === '') return <div key={i} style={{ height: 4 }} />
    return <div key={i} style={{ marginBottom: 3 }}>{t}</div>
  })
}

function formatBytes(b: number) {
  return b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${(b / 1024).toFixed(0)} KB`
}

export default function UpdateModal({ info, onClose }: Props) {
  const exeAsset = info.assets?.find(a => a.name.endsWith('.exe'))
  const [stage, setStage] = useState<Stage>('idle')
  const [progress, setProgress] = useState(0)
  const [exePath, setExePath] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    window.api.onUpdateProgress?.((pct) => setProgress(pct))
  }, [])

  const handleDownload = async () => {
    const url = exeAsset?.browser_download_url ?? info.url
    setStage('downloading')
    setProgress(0)
    const result = await window.api.downloadUpdate?.(url)
    if (result?.ok && result.path) {
      setExePath(result.path)
      setStage('done')
    } else {
      setErrorMsg(result?.error ?? 'Download falhou. Verifica a tua ligação.')
      setStage('error')
    }
  }

  const handleInstall = () => {
    window.api.installUpdate?.(exePath)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 99999,
      animation: 'fadeIn 0.2s ease-out'
    }}
      onClick={stage === 'idle' ? onClose : undefined}>
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        width: 480,
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 24px 60px rgba(0, 0, 0, 0.6)',
        overflow: 'hidden',
      }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{
          padding: '24px 28px 18px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 14,
          background: 'linear-gradient(180deg, var(--bg-hover) 0%, var(--bg-secondary) 100%)',
        }}>
          <EzzoLogo height={32} />

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
              {stage === 'done' ? 'Actualização Pronta para Instalar' : stage === 'downloading' ? 'A Transferir Actualização...' : 'Nova Versão Disponível!'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 12, background: 'var(--bg-hover)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                v{info.current}
              </span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
              <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 12, background: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                v{info.latest.replace(/^v/, '')}
              </span>
            </div>
            {exeAsset && exeAsset.size > 0 && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>Tamanho: {formatBytes(exeAsset.size)}</div>
            )}
          </div>
        </div>

        {/* Progress bar (downloading) */}
        {stage === 'downloading' && (
          <div style={{ padding: '24px 28px', textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>A fazer download do ficheiro executável...</div>
            <div style={{ height: 8, background: 'var(--bg-hover)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: 'var(--accent)', borderRadius: 4, transition: 'width 0.2s ease' }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>{progress}% concluído</div>
          </div>
        )}

        {/* Done */}
        {stage === 'done' && (
          <div style={{ padding: '24px 28px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🎉</div>
            <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>Download Concluído com Sucesso!</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Clica em <strong>Instalar Agora</strong> para reiniciar a aplicação e aplicar as novidades.</div>
          </div>
        )}

        {/* Error */}
        {stage === 'error' && (
          <div style={{ padding: '24px 28px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>⚠️</div>
            <div style={{ fontSize: 13, color: 'var(--error)', fontWeight: 600 }}>Erro no Download</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{errorMsg}</div>
          </div>
        )}

        {/* Release notes */}
        {stage === 'idle' && info.notes && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 28px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Novidades nesta versão</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              {formatNotes(info.notes.slice(0, 1500))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ padding: '16px 28px', display: 'flex', gap: 10, justifyContent: 'flex-end', alignItems: 'center', background: 'var(--bg-tertiary)' }}>
          {stage === 'idle' && (
            <a href={info.url} onClick={e => { e.preventDefault(); window.api.openUpdateUrl?.(info.url) }}
              style={{ fontSize: 11, color: 'var(--text-muted)', marginRight: 'auto', cursor: 'pointer', textDecoration: 'none' }}>
              Ver no GitHub ↗
            </a>
          )}
          {stage !== 'downloading' && stage !== 'done' && (
            <button className="btn" style={{ fontSize: 12, padding: '6px 14px' }} onClick={onClose}>Mais tarde</button>
          )}
          {stage === 'idle' && (
            <button className="btn btn-primary" style={{ fontSize: 12, padding: '6px 16px', display: 'flex', alignItems: 'center', gap: 6 }} onClick={handleDownload}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
              Descarregar e Instalar
            </button>
          )}
          {stage === 'done' && (
            <button className="btn btn-primary" style={{ fontSize: 12, padding: '6px 16px', display: 'flex', alignItems: 'center', gap: 6 }} onClick={handleInstall}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v10m0 0l-3-3m3 3l3-3" /><rect x="2" y="16" width="20" height="6" rx="2" /></svg>
              Instalar Agora
            </button>
          )}
          {stage === 'error' && (
            <button className="btn btn-primary" style={{ fontSize: 12, padding: '6px 16px' }} onClick={handleDownload}>Tentar novamente</button>
          )}
        </div>
      </div>
    </div>
  )
}
