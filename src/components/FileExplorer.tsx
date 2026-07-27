import React, { useState, useCallback, useRef, useEffect } from 'react'
import type { FileNode } from '../types'
import {
  IconFolder, IconFolderOpen,
  IconNewFile, IconNewFolder, IconRename, IconCopy, IconDelete, IconDownload, IconRefresh,
  IconChevronRight, IconChevronDown, IconFileCode,
} from './Icons'

interface ContextMenu { x: number; y: number; node: FileNode }
interface Props {
  rootPath: string | null
  tree: FileNode | null
  onFileOpen: (node: FileNode) => void
  onRefresh: () => void
  remoteFiles?: FileNode | null | 'loading'
  onRemoteCopy?: (node: FileNode) => void
  onFileOpenSplit?: (node: FileNode) => void
  onAnalyze?: () => void
  editingPeers?: Map<string, { peerId: string; peerName: string; color: string }[]>
}

// Rich Official File Type Vector Icons Component
function FileTypeIcon({ name }: { name: string }) {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  const base = name.toLowerCase()
  const s = 14

  const SvgBox = ({ color, children }: { color: string; children: React.ReactNode }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  )

  if (base === 'package.json' || base === 'package-lock.json') {
    return (
      <SvgBox color="#cb3837">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
        <polyline points="14 2 14 8 20 8" />
        <text x="6" y="17" fontSize="6" fontWeight="bold" stroke="none" fill="#cb3837">npm</text>
      </SvgBox>
    )
  }

  if (base === 'tsconfig.json' || base.startsWith('tsconfig')) {
    return (
      <SvgBox color="#3178c6">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
        <text x="6" y="17" fontSize="6.5" fontWeight="bold" stroke="none" fill="#3178c6">TS</text>
      </SvgBox>
    )
  }

  if (base === 'vite.config.ts' || base === 'vite.config.js') {
    return (
      <SvgBox color="#bd34fe">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
        <polygon points="13 10 10 14 12 14 11 18 15 13 13 13" fill="#bd34fe" stroke="none" />
      </SvgBox>
    )
  }

  if (base === '.gitignore' || base === '.gitattributes') {
    return (
      <SvgBox color="#f05032">
        <circle cx="12" cy="12" r="8" fill="none" />
        <circle cx="12" cy="8" r="1.5" fill="#f05032" />
        <circle cx="9" cy="15" r="1.5" fill="#f05032" />
        <path d="M12 9.5v3M9 13.5l3-1.5" stroke="#f05032" strokeWidth="1.5" />
      </SvgBox>
    )
  }

  if (base === 'dockerfile' || base.startsWith('dockerfile')) {
    return (
      <SvgBox color="#2496ed">
        <rect x="4" y="6" width="16" height="12" rx="2" />
        <path d="M7 10h2M11 10h2M15 10h2M7 14h2M11 14h2" stroke="#2496ed" strokeWidth="2" />
      </SvgBox>
    )
  }

  if (base === 'readme.md' || base === 'readme') {
    return (
      <SvgBox color="#4ec9b0">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
        <text x="6" y="17" fontSize="7" fontWeight="bold" stroke="none" fill="#4ec9b0">M↓</text>
      </SvgBox>
    )
  }

  if (ext === 'ts') {
    return (
      <SvgBox color="#3178c6">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
        <text x="6" y="17" fontSize="7" fontWeight="bold" stroke="none" fill="#3178c6">TS</text>
      </SvgBox>
    )
  }

  if (ext === 'tsx') {
    return (
      <SvgBox color="#61dafb">
        <ellipse cx="12" cy="12" rx="7" ry="3" stroke="#61dafb" strokeWidth="1.2" transform="rotate(30 12 12)" />
        <ellipse cx="12" cy="12" rx="7" ry="3" stroke="#61dafb" strokeWidth="1.2" transform="rotate(-30 12 12)" />
        <circle cx="12" cy="12" r="1.5" fill="#61dafb" />
      </SvgBox>
    )
  }

  if (ext === 'js') {
    return (
      <SvgBox color="#f7df1e">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
        <text x="6" y="17" fontSize="7" fontWeight="bold" stroke="none" fill="#f7df1e">JS</text>
      </SvgBox>
    )
  }

  if (ext === 'jsx') {
    return (
      <SvgBox color="#f7df1e">
        <ellipse cx="12" cy="12" rx="7" ry="3" stroke="#f7df1e" strokeWidth="1.2" transform="rotate(30 12 12)" />
        <ellipse cx="12" cy="12" rx="7" ry="3" stroke="#f7df1e" strokeWidth="1.2" transform="rotate(-30 12 12)" />
        <circle cx="12" cy="12" r="1.5" fill="#f7df1e" />
      </SvgBox>
    )
  }

  if (ext === 'html' || ext === 'htm') {
    return (
      <SvgBox color="#e34c26">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
        <text x="5" y="17" fontSize="5.5" fontWeight="bold" stroke="none" fill="#e34c26">HTML</text>
      </SvgBox>
    )
  }

  if (ext === 'css') {
    return (
      <SvgBox color="#264de4">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
        <text x="5" y="17" fontSize="5.5" fontWeight="bold" stroke="none" fill="#264de4">CSS</text>
      </SvgBox>
    )
  }

  if (ext === 'scss' || ext === 'sass') {
    return (
      <SvgBox color="#c6538c">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
        <text x="4" y="17" fontSize="5" fontWeight="bold" stroke="none" fill="#c6538c">SCSS</text>
      </SvgBox>
    )
  }

  if (ext === 'py') {
    return (
      <SvgBox color="#3572a5">
        <path d="M12 4a3 3 0 00-3 3v2h6V7a3 3 0 00-3-3z" fill="#3572a5" stroke="none" />
        <path d="M12 20a3 3 0 003-3v-2H9v2a3 3 0 003 3z" fill="#ffc331" stroke="none" />
      </SvgBox>
    )
  }

  if (ext === 'json') {
    return (
      <SvgBox color="#f5a623">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
        <text x="6" y="17" fontSize="6.5" fontWeight="bold" stroke="none" fill="#f5a623">{"{}"}</text>
      </SvgBox>
    )
  }

  if (ext === 'md' || ext === 'mdx') {
    return (
      <SvgBox color="#4ec9b0">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
        <polyline points="7 15 9 12 11 15 13 12 15 15" stroke="#4ec9b0" strokeWidth="1.5" />
      </SvgBox>
    )
  }

  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'bmp'].includes(ext)) {
    return (
      <SvgBox color="#a8cc8c">
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </SvgBox>
    )
  }

  if (['sh', 'bash', 'zsh', 'ps1', 'bat', 'cmd'].includes(ext)) {
    return (
      <SvgBox color="#89e051">
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <polyline points="7 9 11 12 7 15" />
        <line x1="13" y1="15" x2="17" y2="15" />
      </SvgBox>
    )
  }

  if (ext === 'env' || base.startsWith('.env')) {
    return (
      <SvgBox color="#ecc94b">
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <line x1="8" y1="12" x2="16" y2="12" strokeWidth="2.5" />
      </SvgBox>
    )
  }

  if (['sql', 'db', 'sqlite'].includes(ext)) {
    return (
      <SvgBox color="#336791">
        <ellipse cx="12" cy="6" rx="8" ry="3" />
        <path d="M4 6v12c0 1.65 3.58 3 8 3s8-1.35 8-3V6" />
        <path d="M4 12c0 1.65 3.58 3 8 3s8-1.35 8-3" />
      </SvgBox>
    )
  }

  if (['txt', 'log'].includes(ext)) {
    return (
      <SvgBox color="var(--text-muted)">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
        <line x1="8" y1="13" x2="16" y2="13" />
        <line x1="8" y1="17" x2="13" y2="17" />
      </SvgBox>
    )
  }

  return (
    <SvgBox color="var(--text-secondary)">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
      <polyline points="14 2 14 8 20 8" />
    </SvgBox>
  )
}

function fileIconComponent(node: FileNode) {
  if (node.type === 'directory') return null
  return <FileTypeIcon name={node.name} />
}

function isDirectoryEditing(node: FileNode, editingPeers?: Map<string, any[]>): boolean {
  if (!editingPeers || editingPeers.size === 0) return false
  if (node.type === 'file') return (editingPeers.get(node.path)?.length ?? 0) > 0
  if (node.children) return node.children.some(child => isDirectoryEditing(child, editingPeers))
  return false
}

function TreeNode({
  node,
  depth,
  onFileOpen,
  onContext,
  onDragStart,
  onDrop,
  onFileOpenSplit,
  editingPeers,
  gitMap,
  collapseSignal,
}: {
  node: FileNode
  depth: number
  onFileOpen: (n: FileNode) => void
  onContext: (e: React.MouseEvent, n: FileNode) => void
  onDragStart: (n: FileNode) => void
  onDrop: (target: FileNode) => void
  onFileOpenSplit?: (n: FileNode) => void
  editingPeers?: Map<string, { peerId: string; peerName: string; color: string }[]>
  gitMap?: Map<string, 'M' | 'A' | 'D' | '?'>
  collapseSignal?: number
}) {
  const [expanded, setExpanded] = useState(depth === 0)
  const editing = node.type === 'file' ? editingPeers?.get(node.path) : undefined

  // Collapse folder when collapseSignal increments
  useEffect(() => {
    if (depth > 0 && node.type === 'directory') {
      setExpanded(false)
    }
  }, [collapseSignal, depth, node.type])

  // Get Git status for file
  const relativePath = node.path.replace(/\\/g, '/')
  let gitStatus: 'M' | 'A' | 'D' | '?' | undefined = undefined

  if (node.type === 'file' && gitMap) {
    gitStatus = gitMap.get(relativePath)
    if (!gitStatus) {
      for (const [p, st] of gitMap.entries()) {
        if (p.endsWith(node.name) || relativePath.endsWith(p)) {
          gitStatus = st
          break
        }
      }
    }
  }

  const gitBadgeColor = gitStatus === 'M' ? '#eab308' : gitStatus === 'A' ? '#22c55e' : gitStatus === '?' ? '#8b949e' : gitStatus === 'D' ? '#ef4444' : undefined
  const gitBadgeLabel = gitStatus === 'M' ? 'M' : gitStatus === 'A' ? 'A' : gitStatus === '?' ? 'U' : gitStatus === 'D' ? 'D' : undefined

  return (
    <div>
      <div
        draggable
        onDragStart={e => { e.stopPropagation(); onDragStart(node) }}
        onDragOver={e => { if (node.type === 'directory') e.preventDefault() }}
        onDrop={e => { e.preventDefault(); e.stopPropagation(); onDrop(node) }}
        onContextMenu={e => { e.preventDefault(); onContext(e, node) }}
        onClick={e => {
          if (node.type === 'directory') { setExpanded(v => !v); return }
          if (e.altKey && onFileOpenSplit) { onFileOpenSplit(node); return }
          onFileOpen(node)
        }}
        style={{
          paddingLeft: depth * 12 + 6, paddingRight: 6,
          height: 26, display: 'flex', alignItems: 'center', gap: 4,
          cursor: 'pointer', borderRadius: 3,
          color: node.remote ? 'var(--warning)' : gitBadgeColor ? gitBadgeColor : 'var(--text-primary)',
        }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
      >
        {/* Chevron for dirs */}
        <span style={{ width: 14, display: 'flex', alignItems: 'center', color: 'var(--text-muted)', flexShrink: 0 }}>
          {node.type === 'directory'
            ? (expanded ? <IconChevronDown size={12} /> : <IconChevronRight size={12} />)
            : null}
        </span>

        {/* File/folder icon */}
        <span style={{ display: 'flex', alignItems: 'center', color: node.remote ? 'var(--warning)' : node.type === 'directory' ? 'var(--accent)' : 'inherit', flexShrink: 0 }}>
          {node.type === 'directory'
            ? (expanded ? <IconFolderOpen size={14} /> : <IconFolder size={14} />)
            : fileIconComponent(node)}
        </span>

        <span style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {node.name}
        </span>

        {/* Git Status Badge */}
        {gitBadgeLabel && (
          <span
            title={`Git Status: ${gitBadgeLabel === 'M' ? 'Modified' : gitBadgeLabel === 'A' ? 'Added' : gitBadgeLabel === 'U' ? 'Untracked' : 'Deleted'}`}
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: gitBadgeColor,
              padding: '0 4px',
              borderRadius: 3,
              background: 'rgba(255, 255, 255, 0.05)',
              flexShrink: 0,
              fontFamily: 'var(--font-mono, monospace)',
            }}
          >
            {gitBadgeLabel}
          </span>
        )}

        {/* Live editing indicator */}
        {editing && editing.length > 0 && (
          <span
            title={`${editing.map(e => e.peerName).join(', ')} a editar este ficheiro`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0,
              padding: '1px 5px', borderRadius: 8,
              background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.25)',
              fontSize: 10, color: 'var(--accent)', fontWeight: 600,
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            {editing.map((e, i) => (
              <span key={e.peerId + i} style={{ width: 6, height: 6, borderRadius: '50%', background: e.color }} />
            ))}
          </span>
        )}
        {node.type === 'directory' && !expanded && isDirectoryEditing(node, editingPeers) && (
          <span
            title="Actividade de edição na pasta"
            style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, opacity: 0.8 }}
          />
        )}
        {node.remote && <span style={{ fontSize: 9, color: 'var(--warning)', flexShrink: 0, opacity: 0.8 }}>remote</span>}
      </div>

      {node.type === 'directory' && expanded && (() => {
        const sortedChildren = [...(node.children || [])].sort((a, b) => {
          if (a.type === b.type) return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
          return a.type === 'directory' ? -1 : 1
        })
        return sortedChildren.map(child => (
          <TreeNode key={child.path} node={child} depth={depth + 1}
            onFileOpen={onFileOpen} onContext={onContext}
            onDragStart={onDragStart} onDrop={onDrop} onFileOpenSplit={onFileOpenSplit}
            editingPeers={editingPeers} gitMap={gitMap} collapseSignal={collapseSignal} />
        ))
      })()}
    </div>
  )
}

export default function FileExplorer({ rootPath, tree, onFileOpen, onRefresh, remoteFiles, onRemoteCopy, onFileOpenSplit, onAnalyze, editingPeers }: Props) {
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null)
  const [renaming, setRenaming] = useState<FileNode | null>(null)
  const [newName, setNewName] = useState('')

  // New File/Folder Modal state
  const [creatingItem, setCreatingItem] = useState<{ type: 'file' | 'folder'; basePath: string } | null>(null)
  const [itemInputName, setItemInputName] = useState('')

  const [gitMap, setGitMap] = useState<Map<string, 'M' | 'A' | 'D' | '?'>>(new Map())
  const [collapseSignal, setCollapseSignal] = useState(0)
  const dragRef = useRef<FileNode | null>(null)

  const closeCtx = useCallback(() => setContextMenu(null), [])

  // Auto fetch Git Status for files in Explorer
  const fetchGitStatus = useCallback(async () => {
    if (!rootPath) return
    try {
      const list: { path: string; status: 'M' | 'A' | 'D' | '?' }[] = await window.api.gitStatus?.(rootPath) ?? []
      const m = new Map<string, 'M' | 'A' | 'D' | '?' >()
      list.forEach(item => {
        const norm = item.path.replace(/\\/g, '/')
        m.set(norm, item.status)
      })
      setGitMap(m)
    } catch { /* ignore */ }
  }, [rootPath])

  useEffect(() => {
    fetchGitStatus()
    const un = window.api.onFileChange(() => fetchGitStatus())
    const interval = setInterval(fetchGitStatus, 4000)
    return () => { clearInterval(interval) }
  }, [fetchGitStatus])

  const handleDrop = useCallback(async (target: FileNode) => {
    const src = dragRef.current
    if (!src || target.type !== 'directory' || src.path === target.path) return
    if (src.remote || target.remote) return
    await window.api.move(src.path, target.path + '/' + src.name)
    onRefresh()
    fetchGitStatus()
    dragRef.current = null
  }, [onRefresh, fetchGitStatus])

  const startCreateNew = (type: 'file' | 'folder', basePath?: string) => {
    const base = basePath ?? rootPath
    if (!base) return
    setCreatingItem({ type, basePath: base })
    setItemInputName('')
  }

  const doCreateItem = async () => {
    if (!creatingItem || !itemInputName.trim()) return
    const fullPath = `${creatingItem.basePath}/${itemInputName.trim()}`
    if (creatingItem.type === 'file') {
      await window.api.createFile(fullPath)
    } else {
      await window.api.createFolder(fullPath)
    }
    setCreatingItem(null)
    setItemInputName('')
    onRefresh()
    fetchGitStatus()
  }

  const execCtx = useCallback(async (action: string) => {
    const node = contextMenu?.node
    if (!node) return
    closeCtx()
    const base = node.type === 'directory' ? node.path : node.path.split(/[/\\]/).slice(0, -1).join('/')
    if (action === 'new-file') {
      startCreateNew('file', base)
    } else if (action === 'new-folder') {
      startCreateNew('folder', base)
    } else if (action === 'rename') {
      setRenaming(node); setNewName(node.name)
    } else if (action === 'copy') {
      await window.api.copy(node.path, base + '/copy_' + node.name); onRefresh(); fetchGitStatus()
    } else if (action === 'delete') {
      if (confirm(`Delete "${node.name}"?`)) { await window.api.delete(node.path); onRefresh(); fetchGitStatus() }
    } else if (action === 'remote-copy' && onRemoteCopy) {
      onRemoteCopy(node)
    }
  }, [contextMenu, closeCtx, onRefresh, onRemoteCopy, fetchGitStatus])

  const doRename = async () => {
    if (!renaming || !newName) return
    const dir = renaming.path.split(/[/\\]/).slice(0, -1).join('/')
    await window.api.rename(renaming.path, dir + '/' + newName)
    setRenaming(null); onRefresh(); fetchGitStatus()
  }

  const [dropActive, setDropActive] = useState(false)

  const handleExternalDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setDropActive(false)
    if (!rootPath) return
    const files = Array.from(e.dataTransfer.files)
    for (const file of files) {
      const src = (file as any).path as string
      if (!src) continue
      const dest = rootPath + '/' + file.name
      await window.api.copyExternal?.(src, dest)
    }
    onRefresh()
    fetchGitStatus()
  }, [rootPath, onRefresh, fetchGitStatus])

  return (
    <div
      style={{ flex: 1, overflow: 'auto', position: 'relative', display: 'flex', flexDirection: 'column', outline: dropActive ? '2px dashed var(--accent)' : 'none' }}
      onClick={closeCtx}
      onDragOver={e => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setDropActive(true) } }}
      onDragLeave={() => setDropActive(false)}
      onDrop={handleExternalDrop}
    >

      {/* Header Bar Actions */}
      <div style={{
        padding: '0 8px', height: 32, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Explorer
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* 1. New File (+) */}
          <button
            title="Novo Ficheiro (New File)"
            onClick={() => startCreateNew('file')}
            disabled={!rootPath}
            style={{
              background: 'transparent', border: 'none', cursor: rootPath ? 'pointer' : 'default',
              padding: '3px 5px', borderRadius: 4, color: rootPath ? 'var(--text-secondary)' : 'var(--text-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: rootPath ? 1 : 0.4,
            }}
            onMouseEnter={e => { if (rootPath) { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)' } }}
            onMouseLeave={e => { if (rootPath) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' } }}
          >
            <IconNewFile size={14} />
          </button>

          {/* 2. New Folder (Folder +) */}
          <button
            title="Nova Pasta (New Folder)"
            onClick={() => startCreateNew('folder')}
            disabled={!rootPath}
            style={{
              background: 'transparent', border: 'none', cursor: rootPath ? 'pointer' : 'default',
              padding: '3px 5px', borderRadius: 4, color: rootPath ? 'var(--text-secondary)' : 'var(--text-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: rootPath ? 1 : 0.4,
            }}
            onMouseEnter={e => { if (rootPath) { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)' } }}
            onMouseLeave={e => { if (rootPath) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' } }}
          >
            <IconNewFolder size={14} />
          </button>

          {/* 3. Refresh */}
          <button
            title="Atualizar / Refresh"
            onClick={() => { onRefresh(); fetchGitStatus() }}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              padding: '3px 5px', borderRadius: 4, color: 'var(--text-secondary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
          >
            <IconRefresh size={14} />
          </button>

          {/* 4. Collapse All Folders */}
          <button
            title="Recolher Pastas (Collapse All Folders)"
            onClick={() => setCollapseSignal(s => s + 1)}
            disabled={!rootPath}
            style={{
              background: 'transparent', border: 'none', cursor: rootPath ? 'pointer' : 'default',
              padding: '3px 5px', borderRadius: 4, color: rootPath ? 'var(--text-secondary)' : 'var(--text-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: rootPath ? 1 : 0.4,
            }}
            onMouseEnter={e => { if (rootPath) { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)' } }}
            onMouseLeave={e => { if (rootPath) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' } }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
          </button>

          {/* 5. EZZO Project Analytics */}
          {onAnalyze && (
            <button
              title="EZZO Project Analytics"
              onClick={onAnalyze}
              disabled={!rootPath}
              style={{
                background: 'transparent', border: 'none', cursor: rootPath ? 'pointer' : 'default',
                padding: '3px 5px', borderRadius: 4, color: rootPath ? 'var(--accent)' : 'var(--text-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: rootPath ? 1 : 0.4, marginLeft: 2,
              }}
              onMouseEnter={e => { if (rootPath) { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)' } }}
              onMouseLeave={e => { if (rootPath) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--accent)' } }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 2v8L4 18a2 2 0 002 2h12a2 2 0 002-2l-6-8V2" />
                <line x1="8" y1="2" x2="16" y2="2" />
                <circle cx="14" cy="15" r="1.5" fill="currentColor" stroke="none" />
                <circle cx="10" cy="17" r="1" fill="currentColor" stroke="none" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Local tree */}
      <div style={{ flex: 1, overflow: 'auto', paddingTop: 2 }}>
        {tree ? (
          <TreeNode node={tree} depth={0} onFileOpen={onFileOpen}
            onContext={(e, n) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, node: n }) }}
            onDragStart={n => { dragRef.current = n }}
            onDrop={handleDrop} onFileOpenSplit={onFileOpenSplit} editingPeers={editingPeers}
            gitMap={gitMap} collapseSignal={collapseSignal} />
        ) : (
          <div style={{ padding: '24px 16px', color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', lineHeight: 1.8 }}>
            <IconFolder size={32} color="var(--text-muted)" style={{ margin: '0 auto 8px', display: 'block' }} />
            No folder open<br />
            <span style={{ fontSize: 11 }}>Use Open Folder above</span>
          </div>
        )}

        {/* Remote tree */}
        {remoteFiles === 'loading' && (
          <div style={{ marginTop: 8, borderTop: '1px solid var(--border)' }}>
            <div style={{ padding: '6px 8px', fontSize: 10, color: 'var(--warning)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Remote Files
            </div>
            <div style={{ padding: '16px 8px', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 12 }}>
              <svg style={{ animation: 'spin 1s linear infinite' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 11-6.219-8.56"/>
              </svg>
              A carregar repositório…
            </div>
          </div>
        )}
        {remoteFiles && remoteFiles !== 'loading' && (
          <div style={{ marginTop: 8, borderTop: '1px solid var(--border)' }}>
            <div style={{ padding: '6px 8px', fontSize: 10, color: 'var(--warning)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Remote Files
            </div>
            <TreeNode node={remoteFiles as FileNode} depth={0} onFileOpen={onFileOpen}
              onContext={(e, n) => setContextMenu({ x: e.clientX, y: e.clientY, node: n })}
              onDragStart={n => { dragRef.current = n }}
              onDrop={handleDrop} editingPeers={editingPeers} />
          </div>
        )}
      </div>

      {/* New File / Folder Modal */}
      {creatingItem && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
        }} onClick={() => setCreatingItem(null)}>
          <div style={{ background: 'var(--bg-secondary)', padding: 20, borderRadius: 8, border: '1px solid var(--border)', minWidth: 320, boxShadow: '0 12px 32px rgba(0,0,0,0.4)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ marginBottom: 12, fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>
              {creatingItem.type === 'file' ? '📄 Criar Novo Ficheiro' : '📁 Criar Nova Pasta'}
            </div>
            <input
              autoFocus
              placeholder={creatingItem.type === 'file' ? 'exemplo.ts' : 'minha-pasta'}
              value={itemInputName}
              onChange={e => setItemInputName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') doCreateItem(); if (e.key === 'Escape') setCreatingItem(null) }}
              style={{
                width: '100%', marginBottom: 16, padding: '6px 10px', fontSize: 12,
                background: 'var(--bg-primary)', color: 'var(--text-primary)',
                border: '1px solid var(--border)', borderRadius: 4, boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setCreatingItem(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={doCreateItem} disabled={!itemInputName.trim()}>Criar</button>
            </div>
          </div>
        </div>
      )}

      {/* Rename modal */}
      {renaming && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
        }} onClick={() => setRenaming(null)}>
          <div style={{ background: 'var(--bg-secondary)', padding: 20, borderRadius: 8, border: '1px solid var(--border)', minWidth: 300 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ marginBottom: 12, fontWeight: 600 }}>Rename</div>
            <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') doRename(); if (e.key === 'Escape') setRenaming(null) }}
              style={{ width: '100%', marginBottom: 12 }} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setRenaming(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={doRename}>Rename</button>
            </div>
          </div>
        </div>
      )}

      {/* Context menu */}
      {contextMenu && (
        <div className="context-menu" style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={e => e.stopPropagation()}>
          {!contextMenu.node.remote && <>
            <div className="context-menu-item" onClick={() => execCtx('new-file')}>
              <IconNewFile size={13} /><span>New File</span>
            </div>
            <div className="context-menu-item" onClick={() => execCtx('new-folder')}>
              <IconNewFolder size={13} /><span>New Folder</span>
            </div>
            <div className="context-menu-separator" />
            <div className="context-menu-item" onClick={() => execCtx('rename')}>
              <IconRename size={13} /><span>Rename</span>
            </div>
            <div className="context-menu-item" onClick={() => execCtx('copy')}>
              <IconCopy size={13} /><span>Copy</span>
            </div>
          </>}
          {contextMenu.node.remote && onRemoteCopy && (
            <div className="context-menu-item" onClick={() => execCtx('remote-copy')}>
              <IconDownload size={13} /><span>Copy to Local</span>
            </div>
          )}
          {onFileOpenSplit && contextMenu.node.type === 'file' && (
            <div className="context-menu-item" onClick={() => { closeCtx(); onFileOpenSplit(contextMenu.node) }}>
              <IconFileCode size={13} /><span>Open in Split</span>
            </div>
          )}
          {!contextMenu.node.remote && <>
            <div className="context-menu-separator" />
            <div className="context-menu-item danger" onClick={() => execCtx('delete')}>
              <IconDelete size={13} /><span>Delete</span>
            </div>
          </>}
        </div>
      )}
    </div>
  )
}
