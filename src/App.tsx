import React, { useCallback, useEffect, useRef, useState } from 'react'
import TitleBar from './components/TitleBar'
import ToolBar from './components/ToolBar'
import ActivityBar, { type Panel } from './components/ActivityBar'
import FileExplorer from './components/FileExplorer'
import SearchPanel from './components/SearchPanel'
import GitPanel from './components/GitPanel'
import Connection from './components/Connection'
import { markRemote } from './components/Connection'
import Editor from './components/Editor'
import Terminal from './components/Terminal'
import StatusBar from './components/StatusBar'
import CommandPalette from './components/CommandPalette'
import ThemePanel from './components/ThemePanel'
import Toast from './components/Toast'
import ChatPanel from './components/ChatPanel'
import SessionLog from './components/SessionLog'
import TaskRunner from './components/TaskRunner'
import { useAppStore } from './store/appStore'
import { useTheme } from './hooks/useTheme'
import { useSessionLog } from './hooks/useSessionLog'
import { useToast } from './hooks/useToast'
import { useSaveWorkspace, loadWorkspace } from './hooks/useWorkspace'
import { useUpdate } from './hooks/useUpdate'
import { useCollabSession } from './hooks/useCollabSession'
import UpdateModal from './components/UpdateModal'
import AboutModal from './components/AboutModal'
import ProjectAnalysis from './components/ProjectAnalysis'
import type { FileNode, OpenedFile } from './types'

function flattenTree(node: FileNode): FileNode[] {
  if (node.type === 'file') return [node]
  return (node.children ?? []).flatMap(flattenTree)
}

export default function App() {
  // Apply theme on mount
  useTheme()

  // Apply saved editor settings CSS vars on mount
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem('ezzo-settings') ?? '{}')
      if (s.fontSize) document.documentElement.style.setProperty('--editor-font-size', `${s.fontSize}px`)
      if (s.sidebarWidth) document.documentElement.style.setProperty('--sidebar-width', `${s.sidebarWidth}px`)
    } catch { /* */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const {
    localFolder, setLocalFolder,
    openedFiles, activeFile,
    openFile, closeFile, setActiveFile,
    updateFileContent, markFileSaved,
    connectedPeers, isHost,
    splitEnabled, setSplitEnabled,
    addPeer, removePeer,
    editingPeers,
  } = useAppStore()

  const { logEvent } = useSessionLog()
  const { addToast } = useToast()
  const { update, check: checkUpdate } = useUpdate()
  const [showAbout, setShowAbout] = useState(false)
  const [analysisOpen, setAnalysisOpen] = useState(false)
  const [analysis, setAnalysis] = useState<any>(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | undefined>(undefined)
  const handleAnalyze = useCallback(async () => {
    if (!localFolder) return
    setAnalysisOpen(true)
    setAnalysisLoading(true)
    setAnalysisError(undefined)
    try {
      const r = await window.api.analyzeProject!(localFolder)
      if (r && (r as any).error) { setAnalysisError((r as any).error); setAnalysis(null) }
      else setAnalysis(r)
    } catch (e: unknown) {
      setAnalysisError(String((e as Error).message ?? e))
    } finally {
      setAnalysisLoading(false)
    }
  }, [localFolder])
  const collab = useCollabSession()
  const [showUpdate, setShowUpdate] = useState(false)
  const remoteRootPath = useAppStore(s => s.remoteRootPath)
  const remoteSocket = useAppStore(s => s.remoteSocket)
  // Effective root: local folder or remote host's folder
  const effectiveRoot = localFolder ?? remoteRootPath

  const [tree, setTree]                   = useState<FileNode | null>(null)
  const [remoteFiles, setRemoteFiles]     = useState<FileNode | null | 'loading'>(null)
  const [terminalVisible, setTerminalVisible] = useState(true)
  const [terminalHeight, setTerminalHeight]   = useState(220)
  const [sidebarVisible, setSidebarVisible]   = useState(true)
  const [draggingSplit, setDraggingSplit]     = useState(false)
  const [activePanel, setActivePanel]         = useState<Panel>('explorer')
  const [gitChanges, setGitChanges]           = useState(0)
  const [isTyping, setIsTyping]               = useState(false)
  const [paletteOpen, setPaletteOpen]         = useState(false)
  const [paletteMode, setPaletteMode]         = useState<'files' | 'commands'>('files')
  const [cursorLine, setCursorLine]           = useState(1)
  const [cursorCol, setCursorCol]             = useState(1)
  const [gitBranch, setGitBranch]             = useState<string | null>(null)
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Persist workspace on unload
  useSaveWorkspace(terminalHeight, activePanel)

  // Restore workspace on first mount
  useEffect(() => {
    const ws = loadWorkspace()
    if (!ws?.folder) return
    setLocalFolder(ws.folder)
    if (ws.terminalHeight) setTerminalHeight(ws.terminalHeight)
    if (ws.activePanel) setActivePanel(ws.activePanel as Panel)
    window.api.readDir(ws.folder).then(async (t) => {
      setTree(t as FileNode)
      for (const p of ws.openedFiles ?? []) {
        try {
          const content = await window.api.readFile(p)
          const name = p.split(/[/\\]/).pop() ?? p
          openFile({ path: p, name, content, modified: false })
        } catch { /* file deleted */ }
      }
    }).catch(() => {/* folder gone */})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const folderName = localFolder ? localFolder.split(/[/\\]/).pop() ?? localFolder : null
  const flatFiles = tree ? flattenTree(tree) : []

  // Fetch git branch whenever folder changes
  useEffect(() => {
    if (!effectiveRoot) { setGitBranch(null); return }
    window.api.gitBranch?.(effectiveRoot).then(b => setGitBranch(b ?? null))
  }, [effectiveRoot])

  const refreshTree = useCallback(async (path?: string) => {
    const root = path ?? localFolder
    if (!root) return
    setTree(await window.api.readDir(root) as FileNode)
  }, [localFolder])

  const handleOpenFolder = async () => {
    const path = await window.api.openFolder()
    if (!path) return
    setLocalFolder(path)
    setTree(await window.api.readDir(path) as FileNode)
    logEvent('folder shared', { file: path })
    addToast(`Folder opened: ${path.split(/[/\\]/).pop()}`, 'info')
  }

  const handleFileOpen = useCallback(async (node: FileNode) => {
    if (node.type === 'directory') return
    if (node.remote) {
      const socket = useAppStore.getState().remoteSocket
      if (!socket) return
      socket.emit('request-file', node.path, (content: string) => {
        openFile({ path: node.path, name: node.name, content, modified: false, remote: true })
        logEvent('file opened', { file: node.path })
      })
      return
    }
    const content = await window.api.readFile(node.path)
    openFile({ path: node.path, name: node.name, content, modified: false, remote: node.remote })
    logEvent('file opened', { file: node.path })
  }, [openFile, logEvent])

  const { openFileSplit } = useAppStore()
  const handleFileOpenSplit = useCallback(async (node: FileNode) => {
    if (node.type === 'directory') return
    if (node.remote) {
      const socket = useAppStore.getState().remoteSocket
      if (!socket) return
      socket.emit('request-file', node.path, (content: string) => {
        openFileSplit({ path: node.path, name: node.name, content, modified: false, remote: true })
      })
      return
    }
    const content = await window.api.readFile(node.path)
    openFileSplit({ path: node.path, name: node.name, content, modified: false, remote: node.remote })
  }, [openFileSplit])

  const handleSave = useCallback(async (path: string, content: string) => {
    const file = useAppStore.getState().openedFiles.find(f => f.path === path)
      ?? useAppStore.getState().splitFiles.find(f => f.path === path)
    if (file?.remote) {
      const socket = useAppStore.getState().remoteSocket
      if (!socket) { addToast('Not connected', 'error'); return }
      socket.emit('write-file', path, content, (ok: boolean, err?: string) => {
        if (ok) {
          markFileSaved(path)
          logEvent('remote file saved', { file: path })
          addToast('File saved (remote)', 'success')
        } else {
          addToast(err ?? 'Permission denied', 'error')
        }
      })
      return
    }
    await window.api.writeFile(path, content)
    markFileSaved(path)
    logEvent('file saved', { file: path })
    addToast('File saved', 'success')
  }, [markFileSaved, logEvent, addToast])

  const handleSaveAll = useCallback(() => {
    openedFiles.filter(f => f.modified).forEach(f => handleSave(f.path, f.content))
  }, [openedFiles, handleSave])

  const handleChange = useCallback((path: string, content: string) => {
    // F1: skip if we're currently applying a remote patch
    if (useAppStore.getState().applyingRemote.has(path)) return
    updateFileContent(path, content)
    setIsTyping(true)
    if (typingTimer.current) clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => setIsTyping(false), 1200)
    // F1: broadcast edit (debounced inside the hook)
    collab.emitPatch(path, content)
  }, [updateFileContent, collab])

  const handleRemoteCopy = useCallback(async (node: FileNode) => {
    if (!localFolder) { alert('Open a local folder first'); return }
    const socket = useAppStore.getState().remoteSocket
    if (!socket) return
    socket.emit('request-file', node.path, async (content: string) => {
      await window.api.writeFile(localFolder + '/' + node.name, content)
      refreshTree()
    })
  }, [localFolder, refreshTree])

  const handlePaletteCommand = useCallback((cmd: string) => {
    switch (cmd) {
      case 'Save All': handleSaveAll(); break
      case 'Toggle Terminal': setTerminalVisible(v => !v); break
      case 'Open Folder': handleOpenFolder(); break
      case 'Novo Ficheiro': {
        if (!localFolder) { alert('Open a folder first'); break }
        const name = prompt('File name:')
        if (!name) break
        const path = localFolder + '/' + name
        window.api.createFile(path).then(() => refreshTree())
        break
      }
      case 'Close Tab':
        if (activeFile) closeFile(activeFile)
        break
    }
  }, [handleSaveAll, handleOpenFolder, activeFile, closeFile, localFolder, refreshTree])

  // F2: announce "editing now" for the active file (heartbeat via the hook)
  useEffect(() => {
    if (!activeFile) return
    collab.markEditing(activeFile)
    return () => { collab.markNotEditing(activeFile) }
  }, [activeFile, collab])

  // Global Ctrl+P / Ctrl+Shift+P
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault()
        setPaletteMode(e.shiftKey ? 'commands' : 'files')
        setPaletteOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // File watch
  useEffect(() => {
    window.api.onFileChange(({ event, path }: { event: string; path: string }) => {
      if (['add', 'unlink', 'addDir', 'unlinkDir'].includes(event)) refreshTree()
      // Reload file in editor if changed externally (e.g. client write)
      if (event === 'change') {
        const opened = useAppStore.getState().openedFiles.find(f => f.path === path)
        if (opened && !opened.modified) {
          // F1: skip if a remote patch was already applied (avoid redundant reload)
          const rv = useAppStore.getState().remoteVersions.get(path) ?? 0
          const patch = useAppStore.getState().remotePatches.get(path)
          if (rv > 0 && patch && Date.now() - patch.ts < 3000) return
          window.api.readFile(path).then((content: string) => {
            useAppStore.getState().updateFileContent(path, content)
            useAppStore.getState().markFileSaved(path)
          }).catch(() => {})
        }
      }
    })
    // Peer events — registered once here to avoid duplicates
    window.api.onPeerConnected((id: string) => addPeer({ id, ip: 'unknown', name: `Peer ${id.slice(0, 6)}` }))
    window.api.onPeerDisconnected((id: string) => removePeer(id))
  }, []) // eslint-disable-line

  // Cursor position from Editor
  useEffect(() => {
    const handler = (e: Event) => {
      const { line, col } = (e as CustomEvent).detail
      setCursorLine(line)
      setCursorCol(col)
    }
    window.addEventListener('cursor-position', handler)
    return () => window.removeEventListener('cursor-position', handler)
  }, [])

  // Remote file change
  useEffect(() => {
    const handler = (e: Event) => {
      const { event } = (e as CustomEvent).detail
      if (['add', 'unlink', 'addDir', 'unlinkDir'].includes(event))
        setRemoteFiles(prev => (prev && prev !== 'loading') ? { ...prev } : prev)
    }
    window.addEventListener('remote-file-change', handler)
    return () => window.removeEventListener('remote-file-change', handler)
  }, [])

  // Drag-to-resize terminal
  const handleSplitMouseDown = (e: React.MouseEvent) => {
    e.preventDefault(); setDraggingSplit(true)
  }
  useEffect(() => {
    if (!draggingSplit) return
    const onMove = (e: MouseEvent) => {
      const appEl = document.getElementById('app-main')
      if (!appEl) return
      const rect = appEl.getBoundingClientRect()
      setTerminalHeight(Math.max(80, Math.min(600, rect.bottom - e.clientY)))
    }
    const onUp = () => setDraggingSplit(false)
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
  }, [draggingSplit])

  const hasUnsaved = openedFiles.some(f => f.modified)

  const renderPanel = () => {
    switch (activePanel) {
      case 'explorer': return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          <FileExplorer rootPath={localFolder} tree={tree} onFileOpen={handleFileOpen}
            onRefresh={() => {
              refreshTree()
              const socket = useAppStore.getState().remoteSocket
              if (socket) {
                setRemoteFiles('loading' as any)
                socket.emit('get-tree', (t: FileNode) => setRemoteFiles(markRemote(t)))
              }
            }}
            remoteFiles={remoteFiles} onRemoteCopy={handleRemoteCopy}
            onFileOpenSplit={splitEnabled ? handleFileOpenSplit : undefined}
            editingPeers={editingPeers}
            onAnalyze={handleAnalyze} />
          <Connection onRemoteTree={setRemoteFiles} />
        </div>
      )
      case 'search':     return <SearchPanel rootPath={effectiveRoot} onOpenFile={async (filePath, line) => {
        const content = await window.api.readFile(filePath)
        const name = filePath.split(/[/\\]/).pop() ?? filePath
        openFile({ path: filePath, name, content, modified: false })
        // dispatch line navigation after file opens
        setTimeout(() => window.dispatchEvent(new CustomEvent('go-to-line', { detail: { path: filePath, line } })), 100)
      }} />
      case 'git':        return <GitPanel rootPath={effectiveRoot} onChangesCount={setGitChanges} />
      case 'network':    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ padding: '0 8px', height: 32, display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--border-light)', flexShrink: 0 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Network</span>
          </div>
          <Connection onRemoteTree={setRemoteFiles} />
        </div>
      )
      case 'extensions': return <TaskRunner rootPath={effectiveRoot} onRunTask={(cmd) => {
        setTerminalVisible(true)
        window.dispatchEvent(new CustomEvent('run-task', { detail: cmd }))
      }} />
      case 'testing':    return <TestingPanel rootPath={effectiveRoot} onRun={(cmd) => {
        setTerminalVisible(true)
        window.dispatchEvent(new CustomEvent('run-task', { detail: cmd }))
      }} />
      case 'chat':       return <ChatPanel />
      case 'history':    return <SessionLog />
      case 'settings':   return <ThemePanel />
      default:           return null
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <TitleBar
        folderName={folderName}
        activeFile={activeFile}
        onOpenFolder={handleOpenFolder}
        onSaveAll={handleSaveAll}
        onToggleTerminal={() => setTerminalVisible(v => !v)}
        onToggleSplit={() => setSplitEnabled(!splitEnabled)}
        onToggleSidebar={() => setSidebarVisible(v => !v)}
        onSelectPanel={setActivePanel}
        onOpenPalette={(mode) => {
          if (mode === 'command') setPaletteMode('commands')
          else setPaletteMode('files')
          setPaletteOpen(true)
        }}
        update={update}
        onShowUpdate={() => setShowUpdate(true)}
        onShowAbout={() => setShowAbout(true)}
        onCheckUpdates={async () => {
          await checkUpdate()
          setShowUpdate(true)
        }}
      />

      <ToolBar
        onOpenFolder={handleOpenFolder}
        terminalVisible={terminalVisible}
        onToggleTerminal={() => setTerminalVisible(v => !v)}
        onSaveAll={handleSaveAll}
        hasUnsaved={hasUnsaved}
        activeFile={activeFile}
        splitEnabled={splitEnabled}
        onToggleSplit={() => setSplitEnabled(!splitEnabled)}
        sidebarVisible={sidebarVisible}
        onToggleSidebar={() => setSidebarVisible(v => !v)}
      />

      <div id="app-main" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <ActivityBar
          active={activePanel}
          onChange={setActivePanel}
          gitChanges={gitChanges}
          peersOnline={connectedPeers.length}
        />

        <div style={{
          width: 'var(--sidebar-width)',
          background: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border)',
          display: sidebarVisible ? 'flex' : 'none',
          flexDirection: 'column',
          flexShrink: 0, overflow: 'hidden',
        }}>
          {renderPanel()}
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
            <Editor
              openedFiles={openedFiles}
              activeFile={activeFile}
              onActivate={setActiveFile}
              onClose={closeFile}
              onSave={handleSave}
              onChange={handleChange}
              rootPath={localFolder}
            />
          </div>

          {terminalVisible && (
            <>
              <div onMouseDown={handleSplitMouseDown} style={{
                height: 4, cursor: 'row-resize', background: 'var(--border)', flexShrink: 0,
              }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--accent)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--border)'}
              />
              <div style={{ height: terminalHeight, overflow: 'hidden', flexShrink: 0 }}>
                <Terminal />
              </div>
            </>
          )}
        </div>
      </div>

      <StatusBar
        activeFile={activeFile}
        isTyping={isTyping}
        connectedPeers={connectedPeers.length}
        isHost={isHost}
        isClientConnected={!!remoteSocket}
        gitChanges={gitChanges}
        activePeer={null}
        localFolder={localFolder}
        cursorLine={cursorLine}
        cursorCol={cursorCol}
        gitBranch={gitBranch}
        language={null}
        onClickLineCol={() => {
          const input = prompt('Go to line:')
          if (!input) return
          const line = parseInt(input)
          if (!isNaN(line) && activeFile) {
            window.dispatchEvent(new CustomEvent('go-to-line', { detail: { path: activeFile, line } }))
          }
        }}
      />

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        files={flatFiles}
        onOpenFile={handleFileOpen}
        onCommand={handlePaletteCommand}
        mode={paletteMode}
      />

      {showAbout && (
        <AboutModal
          onClose={() => setShowAbout(false)}
          onCheckUpdates={async () => {
            await checkUpdate()
            setShowUpdate(true)
          }}
        />
      )}

      {showUpdate && update && (
        <UpdateModal info={update} onClose={() => setShowUpdate(false)} />
      )}

      {analysisOpen && localFolder && (
        <ProjectAnalysis
          rootPath={localFolder}
          result={analysis}
          loading={analysisLoading}
          error={analysisError}
          onClose={() => setAnalysisOpen(false)}
          onRefresh={handleAnalyze}
        />
      )}
    </div>
  )
}

function TestingPanel({ rootPath, onRun }: { rootPath: string | null; onRun: (cmd: string) => void }) {
  const [tasks, setTasks] = React.useState<{ source: string; name: string; command: string }[]>([])

  React.useEffect(() => {
    if (!rootPath) return
    window.api.getTasks?.(rootPath).then((t: any) => setTasks(t.filter((item: { name: string }) => /test|spec|jest|vitest|mocha|cypress/.test(item.name))))
  }, [rootPath])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '0 8px', height: 32, display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--border-light)', flexShrink: 0 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Testing</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
        {!rootPath && <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: 8 }}>Open a folder first</div>}
        {rootPath && tasks.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: 8 }}>No test scripts found</div>}
        {tasks.map(t => (
          <button key={t.command} className="btn" onClick={() => onRun(t.command)}
            style={{ width: '100%', textAlign: 'left', marginBottom: 4, fontSize: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{t.source}</span>
            <span>{t.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function PlaceholderPanel({ title, message }: { title: string; message: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '0 8px', height: 32, display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--border-light)', flexShrink: 0 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{title}</span>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
        {message}
      </div>
    </div>
  )
}
