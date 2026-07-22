import React from 'react'

interface Props {
  filePath: string | null
  rootPath: string | null
}

export default function Breadcrumbs({ filePath, rootPath }: Props) {
  if (!filePath) return null

  let relative = filePath
  if (rootPath) {
    const norm = rootPath.replace(/\\/g, '/')
    const normFile = filePath.replace(/\\/g, '/')
    if (normFile.startsWith(norm)) {
      relative = normFile.slice(norm.length).replace(/^[/\\]+/, '')
    }
  }

  const segments = relative.replace(/\\/g, '/').split('/').filter(Boolean)

  return (
    <div style={{
      height: 26, display: 'flex', alignItems: 'center',
      padding: '0 10px', gap: 2, flexShrink: 0,
      background: 'var(--bg-tertiary)',
      borderBottom: '1px solid var(--border)',
      overflowX: 'auto',
    }}>
      {segments.map((seg, i) => (
        <React.Fragment key={i}>
          {i > 0 && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M9 18l6-6-6-6" />
            </svg>
          )}
          <span style={{
            fontSize: 11,
            color: i === segments.length - 1 ? 'var(--text-primary)' : 'var(--text-secondary)',
            whiteSpace: 'nowrap',
            cursor: 'default',
          }}>{seg}</span>
        </React.Fragment>
      ))}
    </div>
  )
}
