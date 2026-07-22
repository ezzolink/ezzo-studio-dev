import React, { useEffect, useRef } from 'react'
import { useToast, type Toast } from '../hooks/useToast'

const TYPE_COLOR: Record<Toast['type'], string> = {
  info:    'var(--accent)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  error:   'var(--error)',
}

const TYPE_ICON: Record<Toast['type'], string> = {
  info:    'ℹ',
  success: '✓',
  warning: '⚠',
  error:   '✕',
}

function ToastItem({ toast }: { toast: Toast }) {
  const { removeToast } = useToast()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    requestAnimationFrame(() => {
      el.style.transform = 'translateX(0)'
      el.style.opacity = '1'
    })
  }, [])

  return (
    <div
      ref={ref}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        padding: '10px 12px',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderLeft: `3px solid ${TYPE_COLOR[toast.type]}`,
        borderRadius: 6,
        marginTop: 8,
        minWidth: 260,
        maxWidth: 360,
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        transform: 'translateX(120%)',
        opacity: 0,
        transition: 'transform 0.22s ease, opacity 0.22s ease',
      }}
    >
      <span style={{ color: TYPE_COLOR[toast.type], fontSize: 13, lineHeight: 1.4, flexShrink: 0 }}>
        {TYPE_ICON[toast.type]}
      </span>
      <span style={{ flex: 1, fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.4 }}>
        {toast.msg}
      </span>
      <button
        onClick={() => removeToast(toast.id)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-muted)', fontSize: 14, padding: 0, lineHeight: 1, flexShrink: 0,
        }}
      >×</button>
    </div>
  )
}

export default function Toast() {
  const { toasts } = useToast()
  const visible = toasts.slice(-4)

  return (
    <div style={{
      position: 'fixed',
      bottom: 32,
      right: 16,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      pointerEvents: 'none',
    }}>
      {visible.map((t) => (
        <div key={t.id} style={{ pointerEvents: 'all' }}>
          <ToastItem toast={t} />
        </div>
      ))}
    </div>
  )
}
