export interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
  remote?: boolean
}

export interface OpenedFile {
  path: string
  name: string
  content: string
  modified: boolean
  remote?: boolean
}

export interface Peer {
  id: string
  ip: string
  name: string
}

export interface TerminalLine {
  id: number
  text: string
  type: 'input' | 'output' | 'error'
}
