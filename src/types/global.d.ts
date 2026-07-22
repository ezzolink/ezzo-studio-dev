import type { Socket } from 'socket.io-client'

declare global {
  interface Window {
    api: {
      // Window controls
      minimize: () => void
      maximize: () => void
      close: () => void

      // File system
      openFolder: () => Promise<string | null>
      readDir: (path: string) => Promise<unknown>
      readFile: (path: string) => Promise<string>
      writeFile: (path: string, content: string) => Promise<boolean>
      createFile: (path: string) => Promise<boolean>
      createFolder: (path: string) => Promise<boolean>
      rename: (oldPath: string, newPath: string) => Promise<boolean>
      move: (src: string, dest: string) => Promise<boolean>
      copy: (src: string, dest: string) => Promise<boolean>
      delete: (path: string) => Promise<boolean>
      getLocalIP: () => Promise<string>

      // Server
      startServer: (folderPath: string) => Promise<boolean>
      stopServer: () => Promise<boolean>
      setPeerPermission: (peerId: string, perm: 'read-only' | 'read-write') => void

      // Events
      onFileChange: (cb: (data: { event: string; path: string }) => void) => void
      onPeerConnected: (cb: (id: string) => void) => void
      onPeerDisconnected: (cb: (id: string) => void) => void

      // Terminal (multi-terminal)
      spawnTerminal: (idOrCols: string | number, colsOrRows: number, rows?: number) => Promise<void>
      terminalInput: (idOrData: string, data?: string) => void
      terminalResize: (idOrCols: string | number, colsOrRows: number, rows?: number) => Promise<void>
      onTerminalOutput: (idOrCb: string | ((data: string) => void), cb?: (data: string) => void) => void
      killTerminal: (id: string) => void

      // Extra
      openInVSCode?: (path: string) => void
      searchInFiles?: (root: string, query: string) => Promise<{ file: string; line: number; text: string }[]>

      // Git
      gitBranch?: (root: string) => Promise<string | null>
      gitStatus?: (root: string) => Promise<{ path: string; status: 'M' | 'A' | 'D' | '?' }[]>
      gitCommit?: (root: string, message: string) => Promise<void>
      gitLog?: (root: string) => Promise<{ hash: string; message: string; author: string; date: string }[]>
      gitDiff?: (filePath: string) => Promise<{ added: number[]; modified: number[]; removed: number[] }>
      gitPush?: (root: string, token: string) => Promise<{ ok: boolean; msg: string }>
      gitPull?: (root: string) => Promise<{ ok: boolean; msg: string }>

      // Drag & Drop external
      copyExternal?: (src: string, dest: string) => Promise<boolean>

      // Task Runner
      getTasks?: (root: string) => Promise<{ source: string; name: string; command: string }[]>

      // Open file at line
      openFileAtLine?: (path: string, line: number) => void
      onOpenFileAtLine?: (cb: (path: string, line: number) => void) => void

      onChat?: (cb: (data: { author: string; text: string }) => void) => void
      hostChatSend?: (data: { author: string; text: string }) => void
      checkUpdate?: () => Promise<{ hasUpdate: boolean; current: string; latest: string; notes: string; url: string; assets: { name: string; browser_download_url: string; size: number }[] }>
      openUpdateUrl?: (url: string) => void
      downloadUpdate?: (url: string) => Promise<{ ok: boolean; path?: string; error?: string }>
      installUpdate?: (exePath: string) => Promise<void>
      onUpdateProgress?: (cb: (pct: number) => void) => void

      // F3: analyze project
      analyzeProject?: (path: string) => Promise<{
        totalFiles: number
        totalDirs: number
        totalBytes: number
        totalLines: number
        languages: { ext: string; lang: string; count: number; lines: number }[]
        dependencies: Record<string, { name: string; version?: string }[]>
        todos: { file: string; line: number; text: string }[]
        recent: { path: string; mtime: number }[]
      }>
    }
  }
}

export {}
