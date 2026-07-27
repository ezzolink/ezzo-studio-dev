import { IpcRendererEvent } from 'electron'

declare global {
  interface Window {
    api: {
      // Window controls
      minimize: () => void
      maximize: () => void
      close: () => void

      // File system
      openFolder: () => Promise<{ folderPath: string | null; files: FileNode[] } | { error: string }>
      readDir: (path: string) => Promise<{ entries: DirEntry[] } | { error: string }>
      readFile: (path: string) => Promise<{ content: string } | { error: string }>
      writeFile: (path: string, content: string) => Promise<{ success: boolean } | { error: string }>
      createFile: (path: string) => Promise<{ success: boolean } | { error: string }>
      createFolder: (path: string) => Promise<{ success: boolean } | { error: string }>
      rename: (oldPath: string, newPath: string) => Promise<{ success: boolean } | { error: string }>
      move: (src: string, dest: string) => Promise<{ success: boolean } | { error: string }>
      copy: (src: string, dest: string) => Promise<{ success: boolean } | { error: string }>
      delete: (path: string) => Promise<{ success: boolean } | { error: string }>
      getLocalIP: () => Promise<{ ip: string } | { error: string }>

      // Server
      startServer: (folderPath: string) => Promise<{ port: number } | { error: string }>
      stopServer: () => Promise<{ success: boolean } | { error: string }>
      setPeerPermission: (peerId: string, perm: 'read-only' | 'read-write') => void

      // File change events
      onFileChange: (cb: (data: { event: string; path: string }) => void) => void
      onPeerConnected: (cb: (id: string) => void) => void
      onPeerDisconnected: (cb: (id: string) => void) => void

      // Terminal (multi)
      spawnTerminal: (idOrCols: string | number, colsOrRows: number, rows?: number, shellType?: string) => Promise<boolean>
      terminalInput: (idOrData: string, data?: string) => void
      terminalResize: (idOrCols: string | number, colsOrRows: number, rows?: number) => void
      killTerminal: (id?: string) => void

      // Legacy terminal
      spawnLegacyTerminal: (cols?: number, rows?: number) => void
      legacyTerminalInput: (data: string) => void
      legacyTerminalResize: (cols: number, rows: number) => void

      // Updates
      checkUpdates: () => Promise<UpdateInfo | null>
      downloadUpdate: () => Promise<void>
      installUpdate: () => void

      // Open in VS Code
      openInVSCode: (filePath: string) => Promise<void>

      // F3: analyze project
      analyzeProject: (path: string) => Promise<ProjectAnalysis>
    }
  }
}

// Types from main.ts
interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
}

interface DirEntry {
  name: string
  path: string
  type: 'file' | 'directory'
  size: number
}

interface UpdateInfo {
  current: string
  latest: string
  hasUpdate: boolean
  releaseNotes?: string
  downloadUrl?: string
}

interface ProjectAnalysis {
  root: string
  languages: Record<string, { files: number; lines: number }>
  dependencies: { name: string; version: string; type: 'prod' | 'dev' }[]
  scripts: Record<string, string>
  todos: { file: string; line: number; text: string }[]
  entryPoints: string[]
  configFiles: string[]
  testFiles: string[]
  structure: { dirs: number; files: number; totalLines: number }
  error?: string
}

export {}