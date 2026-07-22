import React, { useState, useCallback, useRef } from 'react'
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

function FileTypeIcon({ name }: { name: string }) {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  const base = name.toLowerCase()
  const s = 14

  // Helper: colored SVG file icon
  const FileIcon = (color: string, badge?: React.ReactNode) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
      <polyline points="14 2 14 8 20 8" />
      {badge}
    </svg>
  )

  // Special file names
  if (base === 'package.json' || base === 'package-lock.json')
    return FileIcon('#cb3837') // npm red
  if (base === 'tsconfig.json' || base.startsWith('tsconfig'))
    return FileIcon('#3178c6') // typescript blue
  if (base === 'vite.config.ts' || base === 'vite.config.js')
    return FileIcon('#646cff') // vite purple
  if (base === '.gitignore' || base === '.gitattributes')
    return FileIcon('#f05032') // git orange
  if (base === 'dockerfile' || base.startsWith('dockerfile'))
    return FileIcon('#2496ed') // docker blue
  if (base === 'makefile')
    return FileIcon('#e34c26')
  if (base === 'readme.md' || base === 'readme')
    return FileIcon('#4ec9b0', <><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="12" y2="17"/></>)
  if (base === 'license' || base === 'license.txt' || base === 'license.md')
    return FileIcon('#f1c40f')

  // By extension
  if (ext === 'ts')   return FileIcon('#3178c6', <text x="5" y="17" fontSize="7" fontWeight="bold" stroke="none" fill="#3178c6">TS</text>)
  if (ext === 'tsx')  return FileIcon('#3178c6', <text x="4" y="17" fontSize="6" fontWeight="bold" stroke="none" fill="#3178c6">TSX</text>)
  if (ext === 'js')   return FileIcon('#f7df1e', <text x="5" y="17" fontSize="7" fontWeight="bold" stroke="none" fill="#f7df1e">JS</text>)
  if (ext === 'jsx')  return FileIcon('#61dafb', <text x="4" y="17" fontSize="6" fontWeight="bold" stroke="none" fill="#61dafb">JSX</text>)
  if (ext === 'mjs' || ext === 'cjs')
    return FileIcon('#f7df1e', <text x="4.5" y="17" fontSize="5.5" fontWeight="bold" stroke="none" fill="#f7df1e">{ext.toUpperCase()}</text>)
  if (ext === 'py')   return FileIcon('#3572a5')
  if (ext === 'html') return FileIcon('#e34c26', <text x="4" y="17" fontSize="5.5" fontWeight="bold" stroke="none" fill="#e34c26">HTML</text>)
  if (ext === 'css')  return FileIcon('#563d7c', <text x="3.5" y="17" fontSize="5.5" fontWeight="bold" stroke="none" fill="#563d7c">CSS</text>)
  if (ext === 'scss' || ext === 'sass')
    return FileIcon('#c6538c', <text x="3" y="17" fontSize="5" fontWeight="bold" stroke="none" fill="#c6538c">SCSS</text>)
  if (ext === 'less') return FileIcon('#1d365d')
  if (ext === 'md' || ext === 'mdx')
    return FileIcon('#4ec9b0', <><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="12" y2="17"/></>)
  if (ext === 'json') return FileIcon('#f5a623', <text x="5" y="17" fontSize="6" fontWeight="bold" stroke="none" fill="#f5a623">{'{}'}</text>)
  if (ext === 'yaml' || ext === 'yml')
    return FileIcon('#cb171e')
  if (ext === 'toml') return FileIcon('#9c4400')
  if (ext === 'xml')  return FileIcon('#e37933')
  if (ext === 'svg')  return FileIcon('#ffb13b')
  if (['png','jpg','jpeg','gif','webp','ico','bmp'].includes(ext))
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="#a8cc8c" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
      </svg>
    )
  if (['mp4','mov','avi','mkv','webm'].includes(ext))
    return FileIcon('#ff6b6b', <polygon points="10,9 10,15 15,12" stroke="none" fill="#ff6b6b"/>)
  if (['mp3','wav','ogg','flac'].includes(ext))
    return FileIcon('#c084fc')
  if (ext === 'pdf')  return FileIcon('#e53935')
  if (['zip','tar','gz','rar','7z'].includes(ext))
    return FileIcon('#d4a017')
  if (['sh','bash','zsh','fish'].includes(ext))
    return FileIcon('#89e051')
  if (ext === 'bat' || ext === 'cmd' || ext === 'ps1')
    return FileIcon('#012456', <text x="5" y="17" fontSize="6" fontWeight="bold" stroke="none" fill="#89e051">PS</text>)
  if (['env','env.local','env.production','env.development'].some(s => base.endsWith(s)) || ext === 'env')
    return FileIcon('#ecc94b', <line x1="12" y1="8" x2="12" y2="14" strokeWidth="2.5"/>)
  if (ext === 'lock') return FileIcon('#607d8b')
  if (['woff','woff2','ttf','otf','eot'].includes(ext))
    return FileIcon('#9b59b6')
  if (['sql','db','sqlite'].includes(ext))
    return FileIcon('#336791')
  if (ext === 'graphql' || ext === 'gql')
    return FileIcon('#e10098')
  if (ext === 'prisma') return FileIcon('#5a67d8')
  if (ext === 'vue')  return FileIcon('#42b883')
  if (ext === 'svelte') return FileIcon('#ff3e00')
  if (ext === 'rs')   return FileIcon('#dea584')
  if (ext === 'go')   return FileIcon('#00add8')
  if (ext === 'java' || ext === 'kt')
    return FileIcon('#b07219')
  if (ext === 'rb')   return FileIcon('#701516')
  if (ext === 'php')  return FileIcon('#4f5d95')
  if (ext === 'cs')   return FileIcon('#178600')
  if (ext === 'cpp' || ext === 'c' || ext === 'h' || ext === 'hpp')
    return FileIcon('#f34b7d')
  if (['txt','log'].includes(ext))
    return FileIcon('var(--text-muted)', <><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></>)

  return FileIcon('var(--text-secondary)')
}

function fileIconComponent(node: FileNode) {
  if (node.type === 'directory') return null
  return <FileTypeIcon name={node.name} />
}

function TreeNode({ node, depth, onFileOpen, onContext, onDragStart, onDrop, onFileOpenSplit, editingPeers }: {
  node: FileNode; depth: number
  onFileOpen: (n: FileNode) => void
  onContext: (e: React.MouseEvent, n: FileNode) => void
  onDragStart: (n: FileNode) => void
  onDrop: (target: FileNode) => void
  onFileOpenSplit?: (n: FileNode) => void
  editingPeers?: Map<string, { peerId: string; peerName: string; color: string }[]>
}) {
  const [expanded, setExpanded] = useState(depth === 0)
  const editing = node.type === 'file' ? editingPeers?.get(node.path) : undefined

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
          color: node.remote ? 'var(--warning)' : 'var(--text-primary)',
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
        {/* F2: editing-now indicator */}
        {editing && editing.length > 0 && (
          <span
            title={`${editing.map(e => e.peerName).join(', ')} editando agora`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 3, flexShrink: 0, marginRight: 2 }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 1.4s linear infinite', color: 'var(--accent)' }}>
              <path d="M21 12a9 9 0 11-6.219-8.56" />
            </svg>
            {editing.map((e, i) => (
              <span key={e.peerId + i} className="editing-dot" style={{ background: e.color }} />
            ))}
          </span>
        )}
        {node.remote && <span style={{ fontSize: 9, color: 'var(--warning)', flexShrink: 0, opacity: 0.8 }}>remote</span>}
      </div>

      {node.type === 'directory' && expanded && node.children?.map(child => (
        <TreeNode key={child.path} node={child} depth={depth + 1}
          onFileOpen={onFileOpen} onContext={onContext}
          onDragStart={onDragStart} onDrop={onDrop} onFileOpenSplit={onFileOpenSplit}
          editingPeers={editingPeers} />
      ))}
    </div>
  )
}

export default function FileExplorer({ rootPath, tree, onFileOpen, onRefresh, remoteFiles, onRemoteCopy, onFileOpenSplit, onAnalyze, editingPeers }: Props) {
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null)
  const [renaming, setRenaming] = useState<FileNode | null>(null)
  const [newName, setNewName] = useState('')
  const dragRef = useRef<FileNode | null>(null)

  const closeCtx = useCallback(() => setContextMenu(null), [])

  const handleDrop = useCallback(async (target: FileNode) => {
    const src = dragRef.current
    if (!src || target.type !== 'directory' || src.path === target.path) return
    if (src.remote || target.remote) return
    await window.api.move(src.path, target.path + '/' + src.name)
    onRefresh()
    dragRef.current = null
  }, [onRefresh])

  const createNew = useCallback(async (type: 'file' | 'folder', basePath?: string) => {
    const base = basePath ?? rootPath
    if (!base) return
    const label = type === 'file' ? 'File name:' : 'Folder name:'
    const name = prompt(label)
    if (!name) return
    if (type === 'file') await window.api.createFile(base + '/' + name)
    else await window.api.createFolder(base + '/' + name)
    onRefresh()
  }, [rootPath, onRefresh])

  const execCtx = useCallback(async (action: string) => {
    const node = contextMenu?.node
    if (!node) return
    closeCtx()
    const base = node.type === 'directory' ? node.path : node.path.split(/[/\\]/).slice(0, -1).join('/')
    if (action === 'new-file') {
      await createNew('file', base)
    } else if (action === 'new-folder') {
      await createNew('folder', base)
    } else if (action === 'rename') {
      setRenaming(node); setNewName(node.name)
    } else if (action === 'copy') {
      await window.api.copy(node.path, base + '/copy_' + node.name); onRefresh()
    } else if (action === 'delete') {
      if (confirm(`Delete "${node.name}"?`)) { await window.api.delete(node.path); onRefresh() }
    } else if (action === 'remote-copy' && onRemoteCopy) {
      onRemoteCopy(node)
    }
  }, [contextMenu, closeCtx, onRefresh, onRemoteCopy, createNew])

  const doRename = async () => {
    if (!renaming || !newName) return
    const dir = renaming.path.split(/[/\\]/).slice(0, -1).join('/')
    await window.api.rename(renaming.path, dir + '/' + newName)
    setRenaming(null); onRefresh()
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
  }, [rootPath, onRefresh])

  return (
    <div
      style={{ flex: 1, overflow: 'auto', position: 'relative', display: 'flex', flexDirection: 'column', outline: dropActive ? '2px dashed var(--accent)' : 'none' }}
      onClick={closeCtx}
      onDragOver={e => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setDropActive(true) } }}
      onDragLeave={() => setDropActive(false)}
      onDrop={handleExternalDrop}
    >

      {/* Header */}
      <div style={{
        padding: '0 8px', height: 32, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Explorer
        </span>
        <div style={{ display: 'flex', gap: 2 }}>
          <button title="New File" onClick={() => createNew('file')} disabled={!rootPath}
            style={{ padding: '2px 4px', color: rootPath ? 'var(--text-secondary)' : 'var(--text-muted)', display: 'flex', opacity: rootPath ? 1 : 0.4 }}
            onMouseEnter={e => { if (rootPath) (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' }}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = rootPath ? 'var(--text-secondary)' : 'var(--text-muted)'}>
            <IconNewFile size={14} />
          </button>
          <button title="New Folder" onClick={() => createNew('folder')} disabled={!rootPath}
            style={{ padding: '2px 4px', color: rootPath ? 'var(--text-secondary)' : 'var(--text-muted)', display: 'flex', opacity: rootPath ? 1 : 0.4 }}
            onMouseEnter={e => { if (rootPath) (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' }}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = rootPath ? 'var(--text-secondary)' : 'var(--text-muted)'}>
            <IconNewFolder size={14} />
          </button>
          <button title="Refresh" onClick={onRefresh}
            style={{ padding: '2px 4px', color: 'var(--text-secondary)', display: 'flex' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'}>
            <IconRefresh size={14} />
          </button>
          {onAnalyze && (
            <button title="Analyze project" onClick={onAnalyze} disabled={!rootPath}
              style={{ padding: '2px 4px', color: rootPath ? 'var(--text-secondary)' : 'var(--text-muted)', display: 'flex', opacity: rootPath ? 1 : 0.4 }}
              onMouseEnter={e => { if (rootPath) (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' }}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = rootPath ? 'var(--text-secondary)' : 'var(--text-muted)'}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.5" y2="16.5" />
                <line x1="8" y1="11" x2="14" y2="11" />
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
            onDrop={handleDrop} onFileOpenSplit={onFileOpenSplit} editingPeers={editingPeers} />
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
