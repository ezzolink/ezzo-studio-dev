import { useEffect, useRef } from 'react'
import { useAppStore } from '../store/appStore'

// Stable color palette for peer dots / cursors
const COLORS = ['#ff7b72', '#d2a8ff', '#79c0ff', '#a5d6ff', '#ffa657', '#7ee787', '#f0883e', '#ff85b3']
function peerColor(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return COLORS[Math.abs(h) % COLORS.length]
}

const PATCH_MAX_BYTES = 256 * 1024 // 256 KB cap on full-doc patch payload

interface CollabPatch {
  path: string
  content: string
  version: number
  peerName: string
  peerId: string
  ts: number
  truncated?: boolean
}

/**
 * Single subscription point for all collab socket events.
 * - Tracks per-peer editing (F2): heartbeats and leave
 * - Tracks per-file remote patches (F1): apply to store
 * Returns emit/control helpers used by App and Editor.
 */
export function useCollabSession() {
  const socket = useAppStore((s) => s.remoteSocket)
  const setEditingPeers = useAppStore((s) => s.setEditingPeers)
  const setRemotePatch = useAppStore((s) => s.setRemotePatch)
  const remoteSocketId = useRef<string | null>(null)
  const patchTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const patchBuffers = useRef<Map<string, CollabPatch>>(new Map())
  const editingIntervals = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map())
  const editingPaths = useRef<Set<string>>(new Set())

  // Subscribe to all collab events when the socket changes
  useEffect(() => {
    if (!socket) {
      setEditingPeers(new Map())
      remoteSocketId.current = null
      return
    }
    remoteSocketId.current = socket.id ?? null

    const onEditingUpdate = (entries: { path: string; peers: { peerId: string; peerName: string }[] }[]) => {
      const next = new Map<string, { peerId: string; peerName: string; color: string }[]>()
      for (const e of entries) {
        next.set(e.path, e.peers.map((p) => ({ ...p, color: peerColor(p.peerId) })))
      }
      setEditingPeers(next)
    }
    const onEditPatch = (p: CollabPatch & { path: string }) => {
      // Loopback guard
      if (p.peerId && remoteSocketId.current && p.peerId === remoteSocketId.current) return
      setRemotePatch(p.path, {
        content: p.content,
        version: p.version,
        peerName: p.peerName,
        peerId: p.peerId,
        ts: p.ts,
        truncated: p.truncated,
      })
    }
    socket.on('editing-update', onEditingUpdate)
    socket.on('edit-patch', onEditPatch)
    return () => {
      socket.off('editing-update', onEditingUpdate)
      socket.off('edit-patch', onEditPatch)
    }
  }, [socket, setEditingPeers, setRemotePatch])

  // Cleanup on unmount
  useEffect(() => {
    const timers = patchTimers.current
    const bufs = patchBuffers.current
    const ints = editingIntervals.current
    const paths = editingPaths.current
    return () => {
      for (const t of timers.values()) clearTimeout(t)
      timers.clear()
      bufs.clear()
      for (const i of ints.values()) clearInterval(i)
      ints.clear()
      paths.clear()
    }
  }, [])

  /** F2: announce that this peer is editing `path`. Heartbeats every 2s. */
  const markEditing = (path: string) => {
    const s = useAppStore.getState().remoteSocket
    if (!s || !s.connected) return
    if (editingIntervals.current.has(path)) return
    s.emit('editing', { path, peerName: getLocalPeerName() })
    const handle = setInterval(() => {
      const live = useAppStore.getState().remoteSocket
      if (!live || !live.connected) {
        markNotEditing(path)
        return
      }
      live.emit('editing', { path, peerName: getLocalPeerName() })
    }, 2000)
    editingIntervals.current.set(path, handle)
    editingPaths.current.add(path)
  }

  /** F2: stop heartbeating and tell the host. */
  const markNotEditing = (path: string) => {
    const handle = editingIntervals.current.get(path)
    if (handle) {
      clearInterval(handle)
      editingIntervals.current.delete(path)
      editingPaths.current.delete(path)
      const s = useAppStore.getState().remoteSocket
      if (s?.connected) s.emit('editing-leave', { path })
    }
  }

  /** F1: debounce 400ms per path then emit `edit-patch` with full doc. */
  const emitPatch = (path: string, content: string) => {
    const s = useAppStore.getState().remoteSocket
    if (!s || !s.connected) return
    const version = (useAppStore.getState().remoteVersions.get(path) ?? 0) + 1
    const payload: CollabPatch = {
      path,
      content,
      version,
      peerName: getLocalPeerName(),
      peerId: remoteSocketId.current ?? '',
      ts: Date.now(),
    }
    if (content.length > PATCH_MAX_BYTES) {
      // Too large — mark truncated and ask host to request-file
      payload.truncated = true
      payload.content = ''
    }
    const buf = patchBuffers.current
    const timers = patchTimers.current
    buf.set(path, { ...payload, content, peerId: remoteSocketId.current ?? '', path })
    const existing = timers.get(path)
    if (existing) clearTimeout(existing)
    const t = setTimeout(() => {
      const p = buf.get(path)
      if (!p) return
      buf.delete(path)
      timers.delete(path)
      s.emit('edit-patch', p)
    }, 400)
    timers.set(path, t)
  }

  return { markEditing, markNotEditing, emitPatch, peerColor }
}

function getLocalPeerName(): string {
  // Stored on window for simplicity (set by Connection.tsx on connect)
  const w = window as unknown as { __localPeerName?: string }
  return w.__localPeerName ?? `Peer ${Math.random().toString(36).slice(2, 6)}`
}
