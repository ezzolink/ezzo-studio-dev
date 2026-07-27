declare global {
  interface Window {
    api: {
      // Window controls
      minimize: () => void
      maximize: () => void
      close: () => void

      // File system
      openFolder: () => Promise<any>
      readDir: (path: string) => Promise<any>
      readFile: (path: string) => Promise<any>
      writeFile: (path: string, content: string) => Promise<any>
      createFile: (path: string) => Promise<any>
      createFolder: (path: string) => Promise<any>
      rename: (oldPath: string, newPath: string) => Promise<any>
      move: (src: string, dest: string) => Promise<any>
      copy: (src: string, dest: string) => Promise<any>
      delete: (path: string) => Promise<any>
      getLocalIP: () => Promise<any>

      // Server
      startServer: (folderPath: string) => Promise<any>
      stopServer: () => Promise<any>
      setPeerPermission: (peerId: string, perm: 'read-only' | 'read-write') => void

      // Events
      onFileChange: (cb: (data: { event: string; path: string }) => void) => void
      onPeerConnected: (cb: (id: string) => void) => void
      onPeerDisconnected: (cb: (id: string) => void) => void

      // Terminal (multi-terminal)
      spawnTerminal: (idOrCols: string | number, colsOrRows: number, rows?: number) => Promise<any>
      terminalInput: (idOrData: string, data?: string) => void
      terminalResize: (idOrCols: string | number, colsOrRows: number, rows?: number) => Promise<any> | void
      onTerminalOutput: (idOrCb: string | ((data: string) => void), cb?: (data: string) => void) => void
      killTerminal: (id?: string) => void

      // Extra
      openInVSCode?: (path: string) => void
      searchInFiles?: (root: string, query: string) => Promise<any>

      // Git
      gitBranch?: (root: string) => Promise<any>
      gitStatus?: (root: string) => Promise<any>
      gitCommit?: (root: string, message: string) => Promise<any>
      gitLog?: (root: string) => Promise<any>
      gitDiff?: (filePath: string) => Promise<any>
      gitPush?: (root: string, token: string) => Promise<any>
      gitPull?: (root: string) => Promise<any>

      // Drag & Drop external
      copyExternal?: (src: string, dest: string) => Promise<any>

      // Task Runner
      getTasks?: (root: string) => Promise<any>

      // Open file at line
      openFileAtLine?: (path: string, line: number) => void
      onOpenFileAtLine?: (cb: (path: string, line: number) => void) => void

      // Chat
      onChat?: (cb: (data: { author: string; text: string }) => void) => void
      hostChatSend?: (data: { author: string; text: string }) => void

      // Updates
      checkUpdate?: () => Promise<any>
      openUpdateUrl?: (url: string) => void
      downloadUpdate?: (url: string) => Promise<any>
      installUpdate?: (exePath: string) => Promise<any> | void
      onUpdateProgress?: (cb: (pct: number) => void) => void

      // Project analysis
      analyzeProject?: (path: string) => Promise<any>
    }
  }
}

export {}
