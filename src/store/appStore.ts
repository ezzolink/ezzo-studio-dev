import { create } from 'zustand'
import type { Socket } from 'socket.io-client'
import type { FileNode, OpenedFile, Peer } from '../types'

interface ChatMsg { id: string; author: string; text: string; ts: number }

interface AppState {
  // Files
  openedFiles: OpenedFile[]
  activeFile: string | null
  localFolder: string | null

  // Split
  splitFiles: OpenedFile[]
  splitActive: string | null
  splitEnabled: boolean

  // Network
  remoteSocket: Socket | null
  isHost: boolean
  connectedPeers: Peer[]
  peerPermissions: Record<string, 'read-only' | 'read-write'>
  remoteRootPath: string | null

  // Collab (F1/F2)
  editingPeers: Map<string, { peerId: string; peerName: string; color: string }[]>
  remotePatches: Map<string, { content: string; version: number; peerName: string; peerId: string; ts: number; truncated?: boolean }>
  remoteVersions: Map<string, number>
  applyingRemote: Set<string>

  // Chat
  chatMsgs: ChatMsg[]

  // Actions
  setLocalFolder: (path: string | null) => void
  openFile: (file: OpenedFile) => void
  closeFile: (path: string) => void
  setActiveFile: (path: string) => void
  updateFileContent: (path: string, content: string) => void
  markFileSaved: (path: string) => void
  setRemoteSocket: (socket: Socket | null) => void
  setIsHost: (value: boolean) => void
  addPeer: (peer: Peer) => void
  removePeer: (id: string) => void
  setPeerPermission: (id: string, perm: 'read-only' | 'read-write') => void
  setRemoteRootPath: (path: string | null) => void
  addChatMsg: (msg: ChatMsg) => void

  // Collab actions
  setEditingPeers: (next: Map<string, { peerId: string; peerName: string; color: string }[]>) => void
  setRemotePatch: (path: string, patch: { content: string; version: number; peerName: string; peerId: string; ts: number; truncated?: boolean }) => void
  bumpRemoteVersion: (path: string) => void
  markApplyingRemote: (path: string) => void
  clearApplyingRemote: (path: string) => void

  // Split actions
  openFileSplit: (file: OpenedFile) => void
  closeFileSplit: (path: string) => void
  setSplitActive: (path: string) => void
  setSplitEnabled: (v: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  openedFiles: [],
  activeFile: null,
  localFolder: null,
  splitFiles: [],
  splitActive: null,
  splitEnabled: false,
  remoteSocket: null,
  isHost: false,
  connectedPeers: [],
  peerPermissions: {},
  remoteRootPath: null,
  editingPeers: new Map(),
  remotePatches: new Map(),
  remoteVersions: new Map(),
  applyingRemote: new Set(),
  chatMsgs: [],

  setLocalFolder: (path) => set({ localFolder: path }),

  openFile: (file) =>
    set((s) => {
      const exists = s.openedFiles.find((f) => f.path === file.path)
      if (exists) return { activeFile: file.path }
      return { openedFiles: [...s.openedFiles, file], activeFile: file.path }
    }),

  closeFile: (path) =>
    set((s) => {
      const remaining = s.openedFiles.filter((f) => f.path !== path)
      const activeFile =
        s.activeFile === path ? (remaining[remaining.length - 1]?.path ?? null) : s.activeFile
      return { openedFiles: remaining, activeFile }
    }),

  setActiveFile: (path) => set({ activeFile: path }),

  updateFileContent: (path, content) =>
    set((s) => ({
      openedFiles: s.openedFiles.map((f) =>
        f.path === path ? { ...f, content, modified: true } : f,
      ),
      splitFiles: s.splitFiles.map((f) =>
        f.path === path ? { ...f, content, modified: true } : f,
      ),
    })),

  markFileSaved: (path) =>
    set((s) => ({
      openedFiles: s.openedFiles.map((f) => (f.path === path ? { ...f, modified: false } : f)),
      splitFiles: s.splitFiles.map((f) => (f.path === path ? { ...f, modified: false } : f)),
    })),

  setRemoteSocket: (socket) => set({ remoteSocket: socket }),
  setIsHost: (value) => set({ isHost: value }),
  addPeer: (peer) => set((s) => ({ connectedPeers: [...s.connectedPeers, peer] })),
  removePeer: (id) =>
    set((s) => ({ connectedPeers: s.connectedPeers.filter((p) => p.id !== id) })),
  setPeerPermission: (id, perm) =>
    set((s) => ({ peerPermissions: { ...s.peerPermissions, [id]: perm } })),
  setRemoteRootPath: (path) => set({ remoteRootPath: path }),
  addChatMsg: (msg) => set((s) => ({ chatMsgs: [...s.chatMsgs, msg] })),

  setEditingPeers: (next) => set({ editingPeers: next }),

  setRemotePatch: (path, patch) =>
    set((s) => {
      const m = new Map(s.remotePatches)
      m.set(path, patch)
      return { remotePatches: m }
    }),

  bumpRemoteVersion: (path) =>
    set((s) => {
      const m = new Map(s.remoteVersions)
      m.set(path, (m.get(path) ?? 0) + 1)
      return { remoteVersions: m }
    }),

  markApplyingRemote: (path) =>
    set((s) => {
      const set2 = new Set(s.applyingRemote)
      set2.add(path)
      return { applyingRemote: set2 }
    }),

  clearApplyingRemote: (path) =>
    set((s) => {
      const set2 = new Set(s.applyingRemote)
      set2.delete(path)
      return { applyingRemote: set2 }
    }),

  openFileSplit: (file) =>
    set((s) => {
      const exists = s.splitFiles.find((f) => f.path === file.path)
      if (exists) return { splitActive: file.path, splitEnabled: true }
      return { splitFiles: [...s.splitFiles, file], splitActive: file.path, splitEnabled: true }
    }),

  closeFileSplit: (path) =>
    set((s) => {
      const remaining = s.splitFiles.filter((f) => f.path !== path)
      const splitActive =
        s.splitActive === path ? (remaining[remaining.length - 1]?.path ?? null) : s.splitActive
      return { splitFiles: remaining, splitActive, splitEnabled: remaining.length > 0 }
    }),

  setSplitActive: (path) => set({ splitActive: path }),

  setSplitEnabled: (v) => set({ splitEnabled: v }),
}))
