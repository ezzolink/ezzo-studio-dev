import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'
import * as https from 'https'
import { execSync, exec } from 'child_process'
import { createServer } from 'http'
import { Server as SocketIOServer, Socket } from 'socket.io'
import chokidar from 'chokidar'

// node-pty must be required (not imported) for native module compatibility
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pty = require('node-pty')

let mainWindow: BrowserWindow | null = null
let ioServer: SocketIOServer | null = null
let httpServer: ReturnType<typeof createServer> | null = null
let watcher: ReturnType<typeof chokidar.watch> | null = null
let currentFolder: string | null = null

function buildTree(p: string): object {
  const stat = fs.statSync(p)
  const name = path.basename(p)
  if (stat.isDirectory()) {
    let children: object[] = []
    try { children = fs.readdirSync(p).map((c) => buildTree(path.join(p, c))) } catch { /* permission denied */ }
    return { name, path: p, type: 'directory', children }
  }
  return { name, path: p, type: 'file' }
}

// Multi-terminal support
const ptyProcesses = new Map<string, ReturnType<typeof pty.spawn>>()

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

function getIconPath(): string {
  if (isDev) {
    return path.join(__dirname, '../assets/icon.ico')
  }
  // In production, assets are copied to extraResources via electron-builder
  return path.join(process.resourcesPath, 'assets/icon.ico')
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    frame: false,
    backgroundColor: '#0d1117',
    minWidth: 800,
    minHeight: 600,
    show: false,
    icon: getIconPath(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    // Kill all pty processes before nullifying mainWindow
    ptyProcesses.forEach(p => p.kill())
    ptyProcesses.clear()
    mainWindow = null
    stopServer()
  })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// ── Window controls ──────────────────────────────────────────────────────────
ipcMain.on('window-minimize', () => mainWindow?.minimize())
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize()
  else mainWindow?.maximize()
})
ipcMain.on('window-close', () => mainWindow?.close())

// ── File system ──────────────────────────────────────────────────────────────
ipcMain.handle('open-folder', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
  return result.filePaths[0] ?? null
})

ipcMain.handle('read-dir', (_e, dirPath: string) => {
  function readTree(p: string): object {
    const stat = fs.statSync(p)
    const name = path.basename(p)
    if (stat.isDirectory()) {
      let children: any[] = []
      try {
        children = fs.readdirSync(p).map((c) => readTree(path.join(p, c)))
        // Sort directories first A-Z, then files A-Z
        children.sort((a, b) => {
          if (a.type === b.type) return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
          return a.type === 'directory' ? -1 : 1
        })
      } catch {
        // permission denied
      }
      return { name, path: p, type: 'directory', children }
    }
    return { name, path: p, type: 'file' }
  }
  return readTree(dirPath)
})

ipcMain.handle('read-file', (_e, filePath: string) => fs.readFileSync(filePath, 'utf-8'))

ipcMain.handle('write-file', (_e, filePath: string, content: string) => {
  fs.writeFileSync(filePath, content, 'utf-8')
  return true
})

ipcMain.handle('create-file', (_e, filePath: string) => {
  fs.writeFileSync(filePath, '', 'utf-8')
  return true
})

ipcMain.handle('create-folder', (_e, folderPath: string) => {
  fs.mkdirSync(folderPath, { recursive: true })
  return true
})

ipcMain.handle('rename', (_e, oldPath: string, newPath: string) => {
  fs.renameSync(oldPath, newPath)
  return true
})

ipcMain.handle('move', (_e, src: string, dest: string) => {
  fs.renameSync(src, dest)
  return true
})

ipcMain.handle('copy', (_e, src: string, dest: string) => {
  fs.cpSync(src, dest, { recursive: true })
  return true
})

ipcMain.handle('delete', async (_e, filePath: string) => {
  await shell.trashItem(filePath)
  return true
})

ipcMain.handle('get-local-ip', () => {
  const interfaces = os.networkInterfaces()
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] ?? []) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address
    }
  }
  return '127.0.0.1'
})

// ── Copy external file ───────────────────────────────────────────────────────
ipcMain.handle('copy-external', (_e, src: string, dest: string) => {
  try {
    fs.copyFileSync(src, dest)
    return true
  } catch {
    return false
  }
})

// ── Open file at line ────────────────────────────────────────────────────────
ipcMain.on('open-file-at-line', (_e, filePath: string, line: number) => {
  mainWindow?.webContents.send('open-file-at-line', filePath, line)
})

// ── Socket.io Server (Host mode) ─────────────────────────────────────────────
const peerPermissions: Record<string, 'read-only' | 'read-write'> = {}

// ── F2: "editing now" registry ────────────────────────────────────────────────
// Maps socketId → { path, peerName, lastSeen }
const editingRegistry = new Map<string, { path: string; peerName: string; lastSeen: number }>()

function snapshotEditing() {
  // Build a per-path array of { peerId, peerName }
  const map = new Map<string, { peerId: string; peerName: string }[]>()
  for (const [peerId, entry] of editingRegistry) {
    const list = map.get(entry.path) ?? []
    list.push({ peerId, peerName: entry.peerName })
    map.set(entry.path, list)
  }
  return map
}

function broadcastEditing() {
  const map = snapshotEditing()
  // Flatten to [{ path, peers: [...] }] for transport
  const payload = Array.from(map.entries()).map(([path, peers]) => ({ path, peers }))
  ioServer?.emit('editing-update', payload)
}

let editingSweeperHandle: NodeJS.Timeout | null = null
function startEditingSweeper() {
  stopEditingSweeper()
  editingSweeperHandle = setInterval(() => {
    const now = Date.now()
    let changed = false
    for (const [peerId, entry] of editingRegistry) {
      if (now - entry.lastSeen > 2500) {
        editingRegistry.delete(peerId)
        changed = true
      }
    }
    if (changed) broadcastEditing()
  }, 2000)
}
function stopEditingSweeper() {
  if (editingSweeperHandle) { clearInterval(editingSweeperHandle); editingSweeperHandle = null }
}

function stopServer() {
  stopEditingSweeper()
  editingRegistry.clear()
  watcher?.close()
  watcher = null
  ioServer?.close()
  ioServer = null
  httpServer?.close()
  httpServer = null
}

ipcMain.handle('start-server', (_e, folderPath: string) => {
  stopServer()
  currentFolder = folderPath
  httpServer = createServer()
  ioServer = new SocketIOServer(httpServer, { cors: { origin: '*' } })

  ioServer.on('connection', (socket: Socket) => {
    peerPermissions[socket.id] = 'read-write'
    mainWindow?.webContents.send('peer-connected', socket.id)

    // Send the new peer the current editing snapshot so its UI is in sync
    const initial = Array.from(snapshotEditing().entries()).map(([path, peers]) => ({ path, peers }))
    socket.emit('editing-update', initial)

    socket.on('disconnect', () => {
      delete peerPermissions[socket.id]
      mainWindow?.webContents.send('peer-disconnected', socket.id)
      // F2: drop all editing entries for this peer
      let hadAny = false
      for (const [peerId, entry] of editingRegistry) {
        if (peerId === socket.id) { editingRegistry.delete(peerId); hadAny = true }
      }
      if (hadAny) broadcastEditing()
    })

    socket.on('permission', ({ peerId, perm }: { peerId: string; perm: 'read-only' | 'read-write' }) => {
      peerPermissions[peerId] = perm
      ioServer?.to(peerId).emit('permission-update', { perm })
    })

    socket.on('request-file', (filePath: string, cb: (c: string) => void) => {
      try { cb(fs.readFileSync(filePath, 'utf-8')) } catch { cb('') }
    })

    socket.on('get-tree', (cb: (tree: unknown) => void) => {
      if (!currentFolder) { cb(null); return }
      try { cb(buildTree(currentFolder)) } catch { cb(null) }
    })

    socket.on('get-root-path', (cb: (p: string | null) => void) => {
      cb(currentFolder)
    })

    socket.on('write-file', (filePath: string, content: string, cb?: (ok: boolean, err?: string) => void) => {
      if (peerPermissions[socket.id] === 'read-only') {
        socket.emit('permission-error', 'Permission denied: read-only')
        cb?.(false, 'Permission denied: read-only')
        return
      }
      try {
        fs.mkdirSync(path.dirname(filePath), { recursive: true })
        fs.writeFileSync(filePath, content, 'utf-8')
        mainWindow?.webContents.send('file-change', { event: 'change', path: filePath })
        cb?.(true)
      } catch (e: unknown) {
        cb?.(false, String((e as Error).message))
      }
    })

    socket.on('create-file', (filePath: string, cb?: (ok: boolean, err?: string) => void) => {
      if (peerPermissions[socket.id] === 'read-only') { cb?.(false, 'read-only'); return }
      try {
        fs.mkdirSync(path.dirname(filePath), { recursive: true })
        if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, '', 'utf-8')
        cb?.(true)
      } catch (e: unknown) { cb?.(false, String((e as Error).message)) }
    })

    socket.on('delete-file', (filePath: string, cb?: (ok: boolean, err?: string) => void) => {
      if (peerPermissions[socket.id] === 'read-only') { cb?.(false, 'read-only'); return }
      try { fs.rmSync(filePath, { recursive: true, force: true }); cb?.(true) }
      catch (e: unknown) { cb?.(false, String((e as Error).message)) }
    })

    socket.on('list-dir', (dirPath: string, cb: (entries: { name: string; type: 'file' | 'dir' }[] | null) => void) => {
      try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true })
          .map(e => ({ name: e.name, type: e.isDirectory() ? 'dir' as const : 'file' as const }))
        cb(entries)
      } catch { cb(null) }
    })

    socket.on('chat', (data: { author: string; text: string }) => {
      socket.broadcast.emit('chat', data)
      mainWindow?.webContents.send('chat', data)
    })

    socket.on('cursor', (data: { filePath: string; anchor: number; head: number; peerName: string }) => {
      socket.broadcast.emit('cursor', { ...data, peerId: socket.id })
    })

    // ── F2: "editing now" heartbeat ────────────────────────────────────────────
    socket.on('editing', (data: { path: string; peerName: string }) => {
      if (typeof data?.path !== 'string') return
      const prev = editingRegistry.get(socket.id)
      if (prev && prev.path !== data.path) {
        // peer switched file — replace entry
        editingRegistry.set(socket.id, { path: data.path, peerName: data.peerName ?? prev.peerName, lastSeen: Date.now() })
      } else {
        editingRegistry.set(socket.id, { path: data.path, peerName: data.peerName ?? prev?.peerName ?? 'Peer', lastSeen: Date.now() })
      }
      broadcastEditing()
    })

    socket.on('editing-leave', (data: { path: string }) => {
      const prev = editingRegistry.get(socket.id)
      if (prev && prev.path === data.path) {
        editingRegistry.delete(socket.id)
        broadcastEditing()
      }
    })

    // ── F1: real-time edit patches ────────────────────────────────────────────
    socket.on('edit-patch', (payload: {
      path: string; content: string; version: number;
      peerId: string; peerName: string; ts: number; truncated?: boolean;
    }) => {
      if (typeof payload?.path !== 'string') return
      if (payload.truncated) {
        // The peer already requested a full re-read on its end; nothing to rebroadcast
        return
      }
      // Rebroadcast to all other peers (NOT the sender — the renderer-side hook
      // also has a peerId === localSocketId guard, but defense-in-depth)
      socket.broadcast.emit('edit-patch', payload)
    })
  })

  watcher = chokidar.watch(folderPath, { ignoreInitial: true, persistent: true })

  const notify = (event: string) => (p: string) => {
    mainWindow?.webContents.send('file-change', { event, path: p })
    ioServer?.emit('file-change', { event, path: p })
  }

  watcher.on('add', notify('add'))
  watcher.on('change', notify('change'))
  watcher.on('unlink', notify('unlink'))
  watcher.on('addDir', notify('addDir'))
  watcher.on('unlinkDir', notify('unlinkDir'))

  httpServer.listen(7700)
  startEditingSweeper()
  return true
})

ipcMain.handle('stop-server', () => {
  stopServer()
  return true
})

ipcMain.on('set-peer-permission', (_e, peerId: string, perm: 'read-only' | 'read-write') => {
  peerPermissions[peerId] = perm
  ioServer?.to(peerId).emit('permission-update', { perm })
})

ipcMain.on('host-chat-send', (_e, data: { author: string; text: string }) => {
  ioServer?.emit('chat', data)
})

// ── Save Image (binary write from base64) ─────────────────────────────────────
ipcMain.handle('save-image', async (_e, filePath: string, base64Data: string) => {
  try {
    const buf = Buffer.from(base64Data, 'base64')
    fs.writeFileSync(filePath, buf)
    return { success: true }
  } catch (err: any) {
    return { error: err.message ?? 'Failed to save image' }
  }
})

// ── Terminal (node-pty) multi-terminal ────────────────────────────────────────
ipcMain.handle('spawn-terminal', (_e, idOrCols: string | number, colsOrRows: number, rows?: number, shellType?: string) => {
  // Support legacy (cols, rows) and new (id, cols, rows, shellType) signatures
  let id: string, cols: number, r: number
  if (typeof idOrCols === 'number') {
    id = 'default'; cols = idOrCols; r = colsOrRows
  } else {
    id = idOrCols; cols = colsOrRows; r = rows ?? 24
  }

  ptyProcesses.get(id)?.kill()

  let shellExe = os.platform() === 'win32' ? 'powershell.exe' : 'bash'
  if (shellType === 'cmd') shellExe = 'cmd.exe'
  else if (shellType === 'powershell') shellExe = 'powershell.exe'
  else if (shellType === 'bash') shellExe = os.platform() === 'win32' ? 'bash.exe' : 'bash'

  const proc = pty.spawn(shellExe, [], {
    name: 'xterm-color',
    cols,
    rows: r,
    cwd: currentFolder || os.homedir(),
    env: process.env,
  })

  ptyProcesses.set(id, proc)

  proc.onData((data: string) => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.webContents.isDestroyed()) {
      mainWindow.webContents.send(`terminal-output-${id}`, data)
      // Also send on legacy channel for 'default'
      if (id === 'default') mainWindow.webContents.send('terminal-output', data)
    }
  })

  proc.onExit(() => {
    // Remove from map first to prevent further writes
    ptyProcesses.delete(id)
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.webContents.isDestroyed()) {
      mainWindow.webContents.send(`terminal-output-${id}`, '\r\n[Process exited]\r\n')
      if (id === 'default') mainWindow.webContents.send('terminal-output', '\r\n[Process exited]\r\n')
    }
  })

  return true
})

ipcMain.on('terminal-input', (_e, idOrData: string, data?: string) => {
  // Support legacy (data) and new (id, data) signatures
  if (data === undefined) {
    ptyProcesses.get('default')?.write(idOrData)
  } else {
    ptyProcesses.get(idOrData)?.write(data)
  }
})

ipcMain.handle('terminal-resize', (_e, idOrCols: string | number, colsOrRows: number, rows?: number) => {
  let id: string, cols: number, r: number
  if (typeof idOrCols === 'number') {
    id = 'default'; cols = idOrCols; r = colsOrRows
  } else {
    id = idOrCols; cols = colsOrRows; r = rows ?? 24
  }
  ptyProcesses.get(id)?.resize(cols, r)
  return true
})

ipcMain.on('kill-terminal', (_e, id: string) => {
  ptyProcesses.get(id)?.kill()
  ptyProcesses.delete(id)
})

// ── Task Runner ───────────────────────────────────────────────────────────────
ipcMain.handle('get-tasks', (_e, rootPath: string) => {
  const tasks: { source: string; name: string; command: string }[] = []

  // package.json scripts
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(rootPath, 'package.json'), 'utf-8'))
    for (const [name, command] of Object.entries(pkg.scripts ?? {})) {
      tasks.push({ source: 'npm', name, command: `npm run ${name}` })
    }
  } catch { /* no package.json */ }

  // Makefile
  try {
    const makefile = fs.readFileSync(path.join(rootPath, 'Makefile'), 'utf-8')
    for (const m of makefile.matchAll(/^([a-zA-Z0-9_-]+)\s*:/gm)) {
      if (m[1] !== '.PHONY') tasks.push({ source: 'make', name: m[1], command: `make ${m[1]}` })
    }
  } catch { /* no Makefile */ }

  // Taskfile.yml
  try {
    const taskfile = fs.readFileSync(path.join(rootPath, 'Taskfile.yml'), 'utf-8')
    for (const m of taskfile.matchAll(/^\s{2}([a-zA-Z0-9_-]+)\s*:/gm)) {
      tasks.push({ source: 'task', name: m[1], command: `task ${m[1]}` })
    }
  } catch { /* no Taskfile.yml */ }

  return tasks
})

// ── Git operations ────────────────────────────────────────────────────────────
function gitExec(cmd: string, cwd: string): string {
  if (!cwd || !fs.existsSync(cwd) || !fs.existsSync(path.join(cwd, '.git'))) {
    throw new Error('Not a git repository')
  }
  try {
    return execSync(cmd, { cwd, encoding: 'utf-8', timeout: 15000, stdio: ['pipe', 'pipe', 'ignore'] })
  } catch (e: unknown) {
    const err = e as { stdout?: string; stderr?: string; message?: string }
    throw new Error(err.stderr || err.stdout || err.message || String(e))
  }
}

ipcMain.handle('git-branch', (_e, root: string) => {
  try { return gitExec('git branch --show-current', root).trim() } catch { return null }
})

ipcMain.handle('git-status', (_e, root: string) => {
  try {
    const out = gitExec('git status --porcelain', root)
    return out.trim().split('\n').filter(Boolean).map(line => ({
      status: (line[0] !== ' ' ? line[0] : line[1]) as 'M' | 'A' | 'D' | '?',
      path: line.slice(3).trim(),
    }))
  } catch { return [] }
})

ipcMain.handle('git-commit', (_e, root: string, message: string) => {
  try {
    gitExec('git add -A', root)
    gitExec(`git commit -m "${message.replace(/"/g, '\\"')}"`, root)
    return { ok: true, msg: 'Committed' }
  } catch (e: unknown) {
    return { ok: false, msg: String((e as Error).message) }
  }
})

ipcMain.handle('git-log', (_e, root: string) => {
  try {
    const out = gitExec('git log --pretty=format:"%H|%s|%an|%ai" -50', root)
    return out.trim().split('\n').filter(Boolean).map(line => {
      const [hash, message, author, date] = line.replace(/^"|"$/g, '').split('|')
      return { hash, message, author, date }
    })
  } catch {
    return []
  }
})

ipcMain.handle('git-diff', (_e, filePath: string) => {
  const cwd = path.dirname(filePath)
  try {
    const out = gitExec(`git diff HEAD -- "${path.basename(filePath)}"`, cwd)
    const added: number[] = [], modified: number[] = [], removed: number[] = []
    let currentLine = 0
    for (const line of out.split('\n')) {
      const hunk = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/)
      if (hunk) { currentLine = parseInt(hunk[1]) - 1; continue }
      if (line.startsWith('+') && !line.startsWith('+++')) { currentLine++; added.push(currentLine) }
      else if (line.startsWith('-') && !line.startsWith('---')) { removed.push(currentLine + 1) }
      else if (!line.startsWith('\\')) { currentLine++ }
    }
    return { added, modified, removed }
  } catch {
    return { added: [], modified: [], removed: [] }
  }
})

ipcMain.handle('git-push', (_e, root: string, token: string) => {
  try {
    // Inject token into remote URL if provided
    if (token) {
      const remoteUrl = gitExec('git remote get-url origin', root).trim()
      const authedUrl = remoteUrl.replace('https://', `https://${token}@`)
      gitExec(`git push "${authedUrl}"`, root)
    } else {
      gitExec('git push', root)
    }
    return { ok: true, msg: 'Pushed successfully' }
  } catch (e: unknown) {
    return { ok: false, msg: String((e as Error).message) }
  }
})

ipcMain.handle('git-pull', (_e, root: string) => {
  try {
    const msg = gitExec('git pull', root)
    return { ok: true, msg: msg.trim() || 'Pulled successfully' }
  } catch (e: unknown) {
    return { ok: false, msg: String((e as Error).message) }
  }
})

// ── Auto Update ───────────────────────────────────────────────────────────────
const CURRENT_VERSION = app.getVersion() || '1.0.0'
const UPDATE_URL = 'https://api.github.com/repos/ezzolink/ezzo-studio-dev/releases/latest'

function httpsGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'EZZO-Studio-Dev' } }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => resolve(data))
    }).on('error', reject)
  })
}

function semverGt(a: string, b: string) {
  const pa = a.replace(/^v/, '').split('.').map(Number)
  const pb = b.replace(/^v/, '').split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) > (pb[i] ?? 0)) return true
    if ((pa[i] ?? 0) < (pb[i] ?? 0)) return false
  }
  return false
}

ipcMain.handle('check-update', async () => {
  try {
    const raw = await httpsGet(UPDATE_URL)
    const release = JSON.parse(raw)
    const latest = release.tag_name as string
    const hasUpdate = semverGt(latest, CURRENT_VERSION)
    return {
      hasUpdate,
      current: CURRENT_VERSION,
      latest,
      notes: release.body as string ?? '',
      url: release.html_url as string ?? '',
      assets: (release.assets as { name: string; browser_download_url: string }[]) ?? [],
    }
  } catch {
    return { hasUpdate: false, current: CURRENT_VERSION, latest: CURRENT_VERSION, notes: '', url: '', assets: [] }
  }
})

ipcMain.on('open-update-url', (_e, url: string) => {
  shell.openExternal(url)
})

// ── Download & install update ─────────────────────────────────────────────────
ipcMain.handle('download-update', async (_e, url: string) => {
  const tmpPath = path.join(os.tmpdir(), 'ezzo-update-setup.exe')

  function doDownload(downloadUrl: string, redirects = 0): Promise<{ ok: boolean; path?: string; error?: string }> {
    return new Promise((resolve) => {
      const file = fs.createWriteStream(tmpPath)
      https.get(downloadUrl, { headers: { 'User-Agent': 'EZZO-Studio-Dev' } }, (res) => {
        if ((res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) && res.headers.location && redirects < 5) {
          file.close()
          fs.unlink(tmpPath, () => {})
          doDownload(res.headers.location, redirects + 1).then(resolve)
          return
        }
        if (res.statusCode !== 200) {
          file.close()
          resolve({ ok: false, error: `HTTP ${res.statusCode}` })
          return
        }
        const total = parseInt(res.headers['content-length'] ?? '0', 10)
        let downloaded = 0
        res.on('data', (chunk: Buffer) => {
          downloaded += chunk.length
          if (total > 0) mainWindow?.webContents.send('update-progress', Math.round((downloaded / total) * 100))
        })
        res.pipe(file)
        file.on('finish', () => { file.close(); resolve({ ok: true, path: tmpPath }) })
        file.on('error', (e) => resolve({ ok: false, error: e.message }))
        res.on('error', (e) => resolve({ ok: false, error: e.message }))
      }).on('error', (e) => resolve({ ok: false, error: e.message }))
    })
  }

  return doDownload(url)
})

ipcMain.handle('install-update', (_e, exePath: string) => {
  shell.openPath(exePath)
  setTimeout(() => app.quit(), 1000)
})

// ── Open in VS Code ───────────────────────────────────────────────────────────
ipcMain.on('open-in-vscode', (_e, filePath: string) => {
  shell.openExternal(`vscode://file/${filePath}`).catch(() => {
    try { execSync(`code "${filePath}"`) } catch { /* VS Code not installed */ }
  })
})

// ── Search in files ───────────────────────────────────────────────────────────
ipcMain.handle('search-in-files', (_e, root: string, query: string) => {
  const results: { file: string; line: number; text: string }[] = []
  if (!query.trim()) return results
  const q = query.toLowerCase()
  const SKIP = new Set(['node_modules', '.git', 'dist', 'dist-electron', 'dist-app'])

  function walk(dir: string) {
    try {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (results.length >= 500) return
        const full = path.join(dir, entry.name)
        if (entry.isDirectory() && !SKIP.has(entry.name)) { walk(full); continue }
        if (!entry.isFile()) continue
        try {
          const lines = fs.readFileSync(full, 'utf-8').split('\n')
          lines.forEach((text, i) => {
            if (text.toLowerCase().includes(q)) results.push({ file: full, line: i + 1, text })
          })
        } catch { /* binary */ }
      }
    } catch { /* permission */ }
  }

  walk(root)
  return results
})

// ── Analyze project (F3) ──────────────────────────────────────────────────────
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'dist-electron', 'dist-app', 'build', '.next', '.cache', 'coverage', '.vscode', '.idea', 'out'])
const LANG_BY_EXT: Record<string, string> = {
  ts: 'TypeScript', tsx: 'TypeScript', js: 'JavaScript', jsx: 'JavaScript', mjs: 'JavaScript', cjs: 'JavaScript',
  py: 'Python', rb: 'Ruby', php: 'PHP', java: 'Java', kt: 'Kotlin', swift: 'Swift',
  cs: 'C#', cpp: 'C++', c: 'C', h: 'C', hpp: 'C++', rs: 'Rust', go: 'Go',
  html: 'HTML', css: 'CSS', scss: 'SCSS', sass: 'Sass', less: 'Less',
  json: 'JSON', yaml: 'YAML', yml: 'YAML', toml: 'TOML', xml: 'XML',
  md: 'Markdown', mdx: 'MDX', vue: 'Vue', svelte: 'Svelte',
  sh: 'Shell', bash: 'Shell', zsh: 'Shell', ps1: 'PowerShell', bat: 'Batch',
  sql: 'SQL', graphql: 'GraphQL', gql: 'GraphQL', prisma: 'Prisma',
  dockerfile: 'Dockerfile', env: 'Env',
  png: 'Image', jpg: 'Image', jpeg: 'Image', gif: 'Image', webp: 'Image', ico: 'Image', bmp: 'Image', svg: 'Image',
  mp4: 'Video', mov: 'Video', avi: 'Video', mkv: 'Video', webm: 'Video',
  mp3: 'Audio', wav: 'Audio', ogg: 'Audio', flac: 'Audio',
  zip: 'Archive', tar: 'Archive', gz: 'Archive', rar: 'Archive', '7z': 'Archive',
  pdf: 'PDF', lock: 'Lock', txt: 'Text', log: 'Text',
}
const TEXT_EXT = new Set(['ts','tsx','js','jsx','mjs','cjs','py','rb','php','java','kt','swift','cs','cpp','c','h','hpp','rs','go','html','css','scss','sass','less','json','yaml','yml','toml','xml','md','mdx','vue','svelte','sh','bash','zsh','ps1','bat','sql','graphql','gql','prisma','env','txt','log'])

async function analyzeProject(rootPath: string) {
  type LangBucket = { ext: string; lang: string; count: number; lines: number }
  const byExt = new Map<string, LangBucket>()
  let totalFiles = 0
  let totalDirs = 0
  let totalBytes = 0
  let totalLines = 0
  const recent: { path: string; mtime: number }[] = []
  const todos: { file: string; line: number; text: string }[] = []
  const MAX_FILES = 5000
  const MAX_TODO_FILES = 1000
  const TODO_REGEX = /(?:\/\/|#|<!--)\s*(?:TODO|FIXME)\b[^\n>]*/g

  async function walk(dir: string) {
    let entries: fs.Dirent[]
    try { entries = await fs.promises.readdir(dir, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      if (totalFiles >= MAX_FILES) return
      const full = path.join(dir, e.name)
      if (e.isDirectory()) {
        if (SKIP_DIRS.has(e.name)) continue
        totalDirs++
        await walk(full)
      } else if (e.isFile()) {
        totalFiles++
        let stat: fs.Stats
        try { stat = await fs.promises.stat(full) } catch { continue }
        totalBytes += stat.size
        const ext = e.name.includes('.') ? e.name.split('.').pop()!.toLowerCase() : ''
        const lang = LANG_BY_EXT[ext] ?? (e.name.toLowerCase() === 'dockerfile' ? 'Dockerfile' : 'Other')
        const bucket = byExt.get(ext) ?? { ext: ext || '(no ext)', lang, count: 0, lines: 0 }
        bucket.count++
        if (TEXT_EXT.has(ext) || e.name.toLowerCase() === 'dockerfile') {
          try {
            const text = await fs.promises.readFile(full, 'utf-8')
            const lines = text.split('\n').length
            bucket.lines += lines
            totalLines += lines
            if (todos.length < 500 && TEXT_EXT.has(ext)) {
              let m: RegExpExecArray | null
              TODO_REGEX.lastIndex = 0
              let ln = 0
              let idx = 0
              // Line-number scan
              for (const line of text.split('\n')) {
                ln++
                if (TODO_REGEX.test(line)) {
                  todos.push({ file: full, line: ln, text: line.trim().slice(0, 200) })
                  if (todos.length >= 500) break
                }
              }
              TODO_REGEX.lastIndex = 0
            }
          } catch { /* binary */ }
        }
        byExt.set(ext, bucket)
        recent.push({ path: full, mtime: stat.mtimeMs })
        if (recent.length > 200) recent.sort((a, b) => b.mtime - a.mtime).length = 10
      }
    }
  }

  await walk(rootPath)
  recent.sort((a, b) => b.mtime - a.mtime)
  const topRecent = recent.slice(0, 10)

  // Languages sorted by count desc
  const languages = Array.from(byExt.values()).sort((a, b) => b.count - a.count)

  // Dependencies
  const dependencies: Record<string, { name: string; version?: string }[]> = {}
  try {
    const pkg = JSON.parse(await fs.promises.readFile(path.join(rootPath, 'package.json'), 'utf-8'))
    const npm = []
    for (const [n, v] of Object.entries(pkg.dependencies ?? {})) npm.push({ name: n, version: String(v) })
    for (const [n, v] of Object.entries(pkg.devDependencies ?? {})) npm.push({ name: n + ' (dev)', version: String(v) })
    if (npm.length) dependencies.npm = npm
  } catch { /* */ }
  try {
    const txt = await fs.promises.readFile(path.join(rootPath, 'requirements.txt'), 'utf-8')
    const pip = txt.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#')).map(l => ({ name: l.replace(/[=<>~!].*$/, '') }))
    if (pip.length) dependencies.pip = pip
  } catch { /* */ }
  try {
    const txt = await fs.promises.readFile(path.join(rootPath, 'Cargo.toml'), 'utf-8')
    const m = txt.match(/\[dependencies\]([\s\S]*?)(?:\[|$)/)
    if (m) {
      const cargo = (m[1].match(/^([a-zA-Z0-9_-]+)\s*=/gm) ?? []).map(s => ({ name: s.replace(/=.*$/, '').trim() }))
      if (cargo.length) dependencies.cargo = cargo
    }
  } catch { /* */ }
  try {
    const txt = await fs.promises.readFile(path.join(rootPath, 'go.mod'), 'utf-8')
    const go = (txt.match(/^\s*([a-zA-Z0-9_\-\/]+)\s+v[0-9]/gm) ?? []).map(s => ({ name: s.trim().split(/\s+/)[0] })).filter(d => d.name !== 'module' && d.name !== 'go')
    if (go.length) dependencies.go = go
  } catch { /* */ }

  let nodeModulesInstalled = false
  try {
    nodeModulesInstalled = fs.existsSync(path.join(rootPath, 'node_modules'))
  } catch { /* */ }

  return { totalFiles, totalDirs, totalBytes, totalLines, languages, dependencies, todos, recent: topRecent, nodeModulesInstalled }
}

ipcMain.handle('analyze-project', async (_e, rootPath: string) => {
  try {
    return await analyzeProject(rootPath)
  } catch (e: unknown) {
    return { error: String((e as Error).message ?? e) }
  }
})

// Real npm install execution for Project Analytics
ipcMain.handle('exec-npm-install', async (_e, rootPath: string, pkgName?: string) => {
  return new Promise((resolve) => {
    if (!rootPath || !fs.existsSync(rootPath)) {
      resolve({ success: false, error: 'Diretório do projeto inválido ou inexistente.' })
      return
    }

    // Check that package.json exists before running npm install
    const pkgJsonPath = path.join(rootPath, 'package.json')
    if (!fs.existsSync(pkgJsonPath)) {
      resolve({ success: false, error: 'Nenhum package.json encontrado neste repositório. Crie um com "npm init -y" primeiro.' })
      return
    }

    const isWin = process.platform === 'win32'
    const command = isWin
      ? (pkgName ? `npm.cmd install ${pkgName}@latest` : 'npm.cmd install')
      : (pkgName ? `npm install ${pkgName}@latest` : 'npm install')

    console.log(`[exec-npm-install] Running: ${command} in ${rootPath}`)

    const child = exec(command, {
      cwd: rootPath,
      env: process.env,
      maxBuffer: 50 * 1024 * 1024,
      timeout: 180000,
    }, (error: Error | null, stdout: string, stderr: string) => {
      if (error) {
        console.error(`[exec-npm-install] Error:`, error.message)
        console.error(`[exec-npm-install] stderr:`, stderr)
        resolve({ success: false, error: (stderr || stdout || error.message).slice(0, 500) })
      } else {
        console.log(`[exec-npm-install] Success. stdout length: ${stdout.length}`)
        resolve({ success: true, output: stdout.slice(0, 2000) })
      }
    })

    // Stream output to the user's terminal in real-time
    const sendToTerm = (chunk: string) => {
      try {
        const activeTabId = Array.from(ptyProcesses.keys())[0]
        if (activeTabId && mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send(`terminal-output-${activeTabId}`, chunk)
        }
      } catch { /* ignore send errors */ }
    }

    child.stdout?.on('data', (data: string) => sendToTerm(data))
    child.stderr?.on('data', (data: string) => sendToTerm(data))
  })
})


