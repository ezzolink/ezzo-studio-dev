import { useEffect, useRef } from 'react'
import { useAppStore } from '../store/appStore'

export interface RemoteCursor {
  peerId: string
  peerName: string
  color: string
  filePath: string
  anchor: number  // cursor position (head)
  head: number    // selection end (same as anchor if no selection)
}

// Stable colors per peer index
const COLORS = ['#f97316', '#22d3ee', '#a78bfa', '#34d399', '#fb7185', '#facc15']

function peerColor(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return COLORS[h % COLORS.length]
}

export function useCollabCursor(
  filePath: string | null,
  onRemoteCursors: (cursors: RemoteCursor[]) => void,
) {
  const { remoteSocket, isHost, connectedPeers } = useAppStore()
  const cursorsRef = useRef<Map<string, RemoteCursor>>(new Map())
  const notifyRef = useRef(onRemoteCursors)
  notifyRef.current = onRemoteCursors

  // Listen for remote cursor events
  useEffect(() => {
    // Client needs remoteSocket; host listens via ioServer events (not applicable here)
    const socket = remoteSocket
    if (!socket) return

    const handler = (data: { peerId: string; peerName: string; filePath: string; anchor: number; head: number }) => {
      cursorsRef.current.set(data.peerId, {
        ...data,
        color: peerColor(data.peerId),
      })
      notifyRef.current(Array.from(cursorsRef.current.values()))
    }

    socket.on('cursor', handler)
    return () => { socket.off('cursor', handler) }
  }, [remoteSocket])

  // Remove cursor when peer disconnects
  useEffect(() => {
    const ids = new Set(connectedPeers.map(p => p.id))
    let changed = false
    for (const id of cursorsRef.current.keys()) {
      if (!ids.has(id)) { cursorsRef.current.delete(id); changed = true }
    }
    if (changed) notifyRef.current(Array.from(cursorsRef.current.values()))
  }, [connectedPeers])

  // Broadcast local cursor position
  function broadcastCursor(anchor: number, head: number) {
    if (!filePath) return
    const socket = remoteSocket
    const name = localStorage.getItem('ezzo-peer-name') || (isHost ? 'Host' : 'Peer')
    const payload = { filePath, anchor, head, peerName: name }
    if (socket?.connected) socket.emit('cursor', payload)
  }

  return { broadcastCursor, peerColor }
}
