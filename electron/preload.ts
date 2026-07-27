import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  // File system
  openFolder: () => ipcRenderer.invoke('open-folder'),
  readDir: (p: string) => ipcRenderer.invoke('read-dir', p),
  readFile: (p: string) => ipcRenderer.invoke('read-file', p),
  writeFile: (p: string, content: string) => ipcRenderer.invoke('write-file', p, content),
  createFile: (p: string) => ipcRenderer.invoke('create-file', p),
  createFolder: (p: string) => ipcRenderer.invoke('create-folder', p),
  rename: (oldPath: string, newPath: string) => ipcRenderer.invoke('rename', oldPath, newPath),
  move: (src: string, dest: string) => ipcRenderer.invoke('move', src, dest),
  copy: (src: string, dest: string) => ipcRenderer.invoke('copy', src, dest),
  delete: (p: string) => ipcRenderer.invoke('delete', p),
  getLocalIP: () => ipcRenderer.invoke('get-local-ip'),

  // Server
  startServer: (folderPath: string) => ipcRenderer.invoke('start-server', folderPath),
  stopServer: () => ipcRenderer.invoke('stop-server'),
  setPeerPermission: (peerId: string, perm: 'read-only' | 'read-write') =>
    ipcRenderer.send('set-peer-permission', peerId, perm),

  // File change events
  onFileChange: (cb: (data: { event: string; path: string }) => void) => {
    ipcRenderer.on('file-change', (_e, data) => cb(data))
  },
  onPeerConnected: (cb: (id: string) => void) => {
    ipcRenderer.on('peer-connected', (_e, id) => cb(id))
  },
  onPeerDisconnected: (cb: (id: string) => void) => {
    ipcRenderer.on('peer-disconnected', (_e, id) => cb(id))
  },

  // Terminal (multi)
  spawnTerminal: (idOrCols: string | number, colsOrRows: number, rows?: number, shellType?: string) =>
    ipcRenderer.invoke('spawn-terminal', idOrCols, colsOrRows, rows, shellType),
  terminalInput: (idOrData: string, data?: string) =>
    ipcRenderer.send('terminal-input', idOrData, data),
  terminalResize: (idOrCols: string | number, colsOrRows: number, rows?: number) =>
    ipcRenderer.invoke('terminal-resize', idOrCols, colsOrRows, rows),
  onTerminalOutput: (idOrCb: string | ((data: string) => void), cb?: (data: string) => void) => {
    if (typeof idOrCb === 'function') {
      ipcRenderer.on('terminal-output', (_e, data) => idOrCb(data))
    } else {
      ipcRenderer.on(`terminal-output-${idOrCb}`, (_e, data) => cb!(data))
    }
  },
  killTerminal: (id: string) => ipcRenderer.send('kill-terminal', id),

  // Extra
  openInVSCode: (p: string) => ipcRenderer.send('open-in-vscode', p),
  searchInFiles: (root: string, query: string) => ipcRenderer.invoke('search-in-files', root, query),

  // Git
  gitBranch: (root: string) => ipcRenderer.invoke('git-branch', root),
  gitStatus: (root: string) => ipcRenderer.invoke('git-status', root),
  gitCommit: (root: string, message: string) => ipcRenderer.invoke('git-commit', root, message),
  gitLog: (root: string) => ipcRenderer.invoke('git-log', root),
  gitDiff: (filePath: string) => ipcRenderer.invoke('git-diff', filePath),
  gitPush: (root: string, token: string) => ipcRenderer.invoke('git-push', root, token),
  gitPull: (root: string) => ipcRenderer.invoke('git-pull', root),

  // Drag & Drop external
  copyExternal: (src: string, dest: string) => ipcRenderer.invoke('copy-external', src, dest),

  // Task Runner
  getTasks: (root: string) => ipcRenderer.invoke('get-tasks', root),

  // Open file at line (from terminal link)
  openFileAtLine: (filePath: string, line: number) => ipcRenderer.send('open-file-at-line', filePath, line),

  // Listen for open-file-at-line from main
  onOpenFileAtLine: (cb: (filePath: string, line: number) => void) => {
    ipcRenderer.on('open-file-at-line', (_e, filePath, line) => cb(filePath, line))
  },

  // Chat (host receives from peers via IPC)
  onChat: (cb: (data: { author: string; text: string }) => void) =>
    ipcRenderer.on('chat', (_e, data) => cb(data)),
  hostChatSend: (data: { author: string; text: string }) =>
    ipcRenderer.send('host-chat-send', data),

  // Update
  checkUpdate: () => ipcRenderer.invoke('check-update'),
  openUpdateUrl: (url: string) => ipcRenderer.send('open-update-url', url),
  downloadUpdate: (url: string) => ipcRenderer.invoke('download-update', url),
  installUpdate: (exePath: string) => ipcRenderer.invoke('install-update', exePath),
  onUpdateProgress: (cb: (pct: number) => void) => ipcRenderer.on('update-progress', (_e, pct) => cb(pct)),

  // F3: analyze project
  analyzeProject: (path: string) => ipcRenderer.invoke('analyze-project', path),
})
