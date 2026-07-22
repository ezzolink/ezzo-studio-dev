import React, { useEffect, useRef, useState } from 'react'
import { IconFile, IconSearch, IconClose } from './Icons'
import type { FileNode } from '../types'

interface Props {
  open: boolean
  onClose: () => void
  files: FileNode[]
  onOpenFile: (node: FileNode) => void
  onCommand: (cmd: string) => void
  mode: 'files' | 'commands'
}

const COMMANDS = ['Save All', 'Toggle Terminal', 'Open Folder', 'Novo Ficheiro', 'Close Tab']

function fuzzyMatch(query: string, text: string): { match: boolean; ranges: [number, number][] } {
  if (!query) return { match: true, ranges: [] }
  const q = query.toLowerCase()
  const t = text.toLowerCase()
  const ranges: [number, number][] = []
  let qi = 0
  let start = -1
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) {
      if (start === -1) start = i
      qi++
      if (qi === q.length || t[i + 1] !== q[qi]) {
        ranges.push([start, i])
        start = -1
      }
    } else if (start !== -1) {
      ranges.push([start, i - 1])
      start = -1
    }
  }
  return { match: qi === q.length, ranges }
}

function HighlightedText({ text, ranges }: { text: string; ranges: [number, number][] }) {
  if (!ranges.length) return <span>{text}</span>
  const parts: React.ReactNode[] = []
  let pos = 0
  for (const [s, e] of ranges) {
    if (s > pos) parts.push(<span key={pos}>{text.slice(pos, s)}</span>)
    parts.push(<span key={s} style={{ color: 'var(--accent)', fontWeight: 600 }}>{text.slice(s, e + 1)}</span>)
    pos = e + 1
  }
  if (pos < text.length) parts.push(<span key={pos}>{text.slice(pos)}</span>)
  return <>{parts}</>
}

export default function CommandPalette({ open, onClose, files, onOpenFile, onCommand, mode }: Props) {
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIdx(0)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  const fileItems = files.map(f => {
    const r = fuzzyMatch(query, f.name)
    return { node: f, ...r }
  }).filter(x => x.match)

  const cmdItems = COMMANDS.map(c => {
    const r = fuzzyMatch(query, c)
    return { cmd: c, ...r }
  }).filter(x => x.match)

  const items = mode === 'files'
    ? fileItems.map(x => ({ label: x.node.name, ranges: x.ranges, isFile: true as const, node: x.node }))
    : cmdItems.map(x => ({ label: x.cmd, ranges: x.ranges, isFile: false as const, node: null }))

  const total = items.length

  useEffect(() => { setActiveIdx(0) }, [query])

  const itemsRef = useRef(items)
  itemsRef.current = items

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, itemsRef.current.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)) }
      if (e.key === 'Enter') {
        e.preventDefault()
        const item = itemsRef.current[activeIdx]
        if (!item) return
        if (item.isFile && item.node) onOpenFile(item.node)
        else onCommand(item.label)
        onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, activeIdx, onClose, onOpenFile, onCommand])

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${activeIdx}"]`) as HTMLElement | null
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx])

  if (!open) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '12vh',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 560, maxWidth: '90vw',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
          overflow: 'hidden',
        }}
      >
        {/* Input */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '10px 12px', gap: 8, borderBottom: '1px solid var(--border)' }}>
          <IconSearch size={15} color="var(--text-muted)" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={mode === 'files' ? 'Search files…' : 'Search commands…'}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--text-primary)', fontSize: 14,
            }}
          />
          <button onClick={onClose} style={{ color: 'var(--text-muted)', display: 'flex' }}>
            <IconClose size={14} />
          </button>
        </div>

        {/* Results */}
        <div ref={listRef} style={{ maxHeight: 360, overflowY: 'auto' }}>
          {items.length === 0 ? (
            <div style={{ padding: '20px 16px', color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>
              No results
            </div>
          ) : items.map((item, i) => (
            <div
              key={item.label + i}
              data-idx={i}
              onClick={() => {
                if (item.isFile && item.node) onOpenFile(item.node)
                else onCommand(item.label)
                onClose()
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 14px', cursor: 'pointer',
                background: i === activeIdx ? 'var(--bg-hover)' : 'transparent',
                fontSize: 13,
              }}
              onMouseEnter={() => setActiveIdx(i)}
            >
              <IconFile size={14} color="var(--text-muted)" />
              <span style={{ color: 'var(--text-primary)' }}>
                <HighlightedText text={item.label} ranges={item.ranges} />
              </span>
            </div>
          ))}
        </div>

        <div style={{ padding: '6px 14px', borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 16 }}>
          <span>↑↓ navigate</span><span>↵ open</span><span>Esc close</span>
        </div>
      </div>
    </div>
  )
}
