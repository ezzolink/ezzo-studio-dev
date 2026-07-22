import React, { useState, useEffect } from 'react'

export function markRemote(node: FileNode): FileNode {
  return {
    ...node,
    remote: true,
    children: node.children?.map(markRemote),
  }
}
import { io, Socket } from 'socket.io-client'
import { useAppStore } from '../store/appStore'
import { IconHost, IconConnect, IconDisconnect, IconPeer, IconDot } from './Icons'
import { useToast } from '../hooks/useToast'
import type { FileNode, Peer } from '../types'

type Mode = 'idle' | 'host' | 'client'
type Status = 'disconnected' | 'connecting' | 'connected' | 'sharing'

const STATUS_COLOR: Record<Status, string> = {
  disconnected: 'var(--text-muted)',
  connecting: 'var(--warning)',
  connected: 'var(--success)',
  sharing: 'var(--accent)',
}
const STATUS_LABEL: Record<Status, string> = {
  disconnected: 'Offline', connecting: 'Connecting…',
  connected: 'Connected', sharing: 'Sharing',
}

// Persist connection state outside the component so panel navigation doesn't reset it
let _persistedSocket: Socket | null = null
let _persistedMode: Mode = 'idle'
let _persistedStatus: Status = 'disconnected'
let _persistedIP = ''

export default function Connection({ onRemoteTree }: { onRemoteTree?: (tree: FileNode | null) => void }) {
  const {
    localFolder, setRemoteSocket, setIsHost, addPeer, removePeer,
    connectedPeers, isHost, setPeerPermission,
  } = useAppStore()
  const peerPermissions = useAppStore(s => s.peerPermissions)
  const { addToast } = useToast()

  const [mode, setMode] = useState<Mode>(_persistedMode)
  const [status, setStatus] = useState<Status>(_persistedStatus)
  const [localIP, setLocalIP] = useState('')
  const [targetIP, setTargetIP] = useState(_persistedIP || (localStorage.getItem('ezzo-last-ip') ?? ''))
  const [recentIPs, setRecentIPs] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('ezzo-recent-ips') ?? '[]') } catch { return [] }
  })

  // Sync persisted state on change
  const setModePersist = (m: Mode) => { _persistedMode = m; setMode(m) }
  const setStatusPersist = (s: Status) => { _persistedStatus = s; setStatus(s) }

  useEffect(() => {
    window.api.getLocalIP().then((ip: string) => setLocalIP(ip))
    if (_persistedSocket) setRemoteSocket(_persistedSocket)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startHost = async () => {
    if (!localFolder) { addToast('Open a folder first', 'warning'); return }
    await window.api.startServer(localFolder)
    setModePersist('host'); setIsHost(true); setStatusPersist('sharing')
  }

  const stopHost = async () => {
    await window.api.stopServer()
    setModePersist('idle'); setIsHost(false); setStatusPersist('disconnected')
  }

  const saveRecentIP = (ip: string) => {
    const updated = [ip, ...recentIPs.filter(x => x !== ip)].slice(0, 5)
    setRecentIPs(updated)
    localStorage.setItem('ezzo-last-ip', ip)
    localStorage.setItem('ezzo-recent-ips', JSON.stringify(updated))
    return updated
  }

  const deleteRecentIP = (ip: string) => {
    const updated = recentIPs.filter(x => x !== ip)
    setRecentIPs(updated)
    localStorage.setItem('ezzo-recent-ips', JSON.stringify(updated))
    if (localStorage.getItem('ezzo-last-ip') === ip) localStorage.removeItem('ezzo-last-ip')
  }

  const connectClient = (ip?: string) => {
    const host = ip ?? targetIP
    if (!host) return
    _persistedIP = host
    saveRecentIP(host)
    setTargetIP(host)
    setStatusPersist('connecting')
    setModePersist('client')

    const socket = io(`http://${host}:7700`, { timeout: 5000 })

    socket.on('connect', () => {
      setStatusPersist('connected')
      setRemoteSocket(socket)
      _persistedSocket = socket

      // Request initial file tree from host — show loading state
      onRemoteTree?.('loading' as any)
      socket.emit('get-tree', (tree: FileNode) => {
        onRemoteTree?.(markRemote(tree))
      })
      // Get host root path for Git/TaskRunner
      socket.emit('get-root-path', (rootPath: string) => {
        useAppStore.getState().setRemoteRootPath(rootPath ?? null)
      })
    })

    socket.on('disconnect', () => {
      setStatusPersist('disconnected')
      setRemoteSocket(null)
      _persistedSocket = null
      onRemoteTree?.(null)
      useAppStore.getState().setRemoteRootPath(null)
      addToast('Disconnected from host', 'warning')
    })

    socket.on('connect_error', () => {
      setStatusPersist('disconnected')
      _persistedSocket = null
      addToast(`Cannot connect to ${host}:7700`, 'error')
    })

    socket.on('file-change', (data: { event: string; path: string }) => {
      window.dispatchEvent(new CustomEvent('remote-file-change', { detail: data }))
      // Refresh remote tree on structural changes
      if (['add', 'unlink', 'addDir', 'unlinkDir'].includes(data.event)) {
        socket.emit('get-tree', (tree: FileNode) => onRemoteTree?.(markRemote(tree)))
      }
    })
  }

  const disconnectClient = () => {
    _persistedSocket?.disconnect()
    _persistedSocket = null
    _persistedMode = 'idle'
    _persistedStatus = 'disconnected'
    setRemoteSocket(null)
    setStatusPersist('disconnected')
    setModePersist('idle')
    onRemoteTree?.(null)
  }

  const handlePermChange = (peer: Peer, perm: 'read-only' | 'read-write') => {
    setPeerPermission(peer.id, perm)
    window.api.setPeerPermission?.(peer.id, perm)
  }

  return (
    <div style={{ padding: 10, borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)', flexShrink: 0 }}>

      {/* Status row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <IconDot size={7} color={STATUS_COLOR[status]} />
        <span style={{ fontSize: 11, color: STATUS_COLOR[status] }}>{STATUS_LABEL[status]}</span>
        {(isHost ? connectedPeers.length > 0 : status === 'connected') && (
          <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
            <IconPeer size={12} />{isHost ? connectedPeers.length : targetIP}
          </span>
        )}
      </div>

      {mode === 'idle' && (
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-primary" style={{ flex: 1, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }} onClick={startHost}>
            <IconHost size={13} />Host
          </button>
          <button className="btn" style={{ flex: 1, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }} onClick={() => setModePersist('client')}>
            <IconConnect size={13} />Client
          </button>
        </div>
      )}

      {mode === 'host' && (
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 }}>
            IP: <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{localIP}</span>
            <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>:7700</span>
          </div>
          {connectedPeers.map((p: Peer) => {
            const perm = peerPermissions[p.id] ?? 'read-write'
            return (
              <div key={p.id} style={{ marginBottom: 6 }}>
                <div style={{ fontSize: 11, color: 'var(--success)', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <IconDot size={6} color="var(--success)" />{p.name}
                </div>
                <div style={{ display: 'flex', gap: 4, paddingLeft: 11 }}>
                  {(['read-only', 'read-write'] as const).map((opt) => (
                    <button key={opt} onClick={() => handlePermChange(p, opt)}
                      className={perm === opt ? 'btn btn-primary' : 'btn'}
                      style={{ fontSize: 10, padding: '2px 7px' }}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
          <button className="btn btn-danger" style={{ width: '100%', marginTop: 6, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }} onClick={stopHost}>
            <IconDisconnect size={13} />Stop Sharing
          </button>
        </div>
      )}

      {mode === 'client' && status !== 'connected' && (
        <div>
          {recentIPs.length > 0 && (
            <div style={{ marginBottom: 6 }}>
              {recentIPs.map(ip => (
                <div key={ip} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                  <button className="btn" onClick={() => connectClient(ip)}
                    style={{ flex: 1, textAlign: 'left', fontSize: 11, fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>{ip}</span>
                    <span style={{ fontSize: 10, color: 'var(--accent)' }}>{status === 'connecting' && targetIP === ip ? 'connecting…' : 'connect'}</span>
                  </button>
                  <button onClick={() => deleteRecentIP(ip)} title="Remove"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0 2px', fontSize: 14, lineHeight: 1 }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--error)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'}>
                    ×
                  </button>
                </div>
              ))}
              <div style={{ height: 1, background: 'var(--border)', margin: '6px 0' }} />
            </div>
          )}
          <input placeholder="New IP address" value={targetIP}
            onChange={e => setTargetIP(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && connectClient()}
            style={{ width: '100%', marginBottom: 6 }} />
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-primary" style={{ flex: 1, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
              onClick={() => connectClient()} disabled={status === 'connecting'}>
              <IconConnect size={13} />{status === 'connecting' ? 'Connecting…' : 'Connect'}
            </button>
            <button className="btn" style={{ flex: 1, fontSize: 11 }} onClick={() => setModePersist('idle')}>Back</button>
          </div>
        </div>
      )}

      {mode === 'client' && status === 'connected' && (
        <div>
          <div style={{ fontSize: 11, color: 'var(--success)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
            <IconDot size={6} color="var(--success)" />Connected to {targetIP}
          </div>
          <button className="btn btn-danger" style={{ width: '100%', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }} onClick={disconnectClient}>
            <IconDisconnect size={13} />Disconnect
          </button>
        </div>
      )}

      {isHost && !localFolder && (
        <div style={{ fontSize: 10, color: 'var(--error)', marginTop: 4 }}>Open a folder to share</div>
      )}
    </div>
  )
}
