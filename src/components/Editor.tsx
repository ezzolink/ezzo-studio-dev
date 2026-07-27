import React, { useEffect, useRef, useState, useCallback } from 'react'
import { IconClose, IconFile } from './Icons'
import Breadcrumbs from './Breadcrumbs'
import { useSettings } from '../hooks/useSettings'
import { EditorView, basicSetup } from 'codemirror'
import { EditorState, StateEffect, StateField, RangeSet, type Range, type ChangeSet } from '@codemirror/state'
import { Decoration, WidgetType, GutterMarker, gutter } from '@codemirror/view'
import { oneDark } from '@codemirror/theme-one-dark'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import { css } from '@codemirror/lang-css'
import { html } from '@codemirror/lang-html'
import { json } from '@codemirror/lang-json'
import { markdown } from '@codemirror/lang-markdown'
import { marked } from 'marked'
import type { OpenedFile } from '../types'
import { useCollabCursor, type RemoteCursor } from '../hooks/useCollabCursor'
import { useGitDiff } from '../hooks/useGitDiff'
import { useAppStore } from '../store/appStore'

// ── Git diff gutter ───────────────────────────────────────────────────────────

type DiffKind = 'added' | 'modified' | 'removed'
const DIFF_COLOR: Record<DiffKind, string> = {
  added: '#3fb950',
  modified: '#d29922',
  removed: '#f85149',
}

class DiffMarker extends GutterMarker {
  constructor(readonly kind: DiffKind) { super() }
  toDOM() {
    const el = document.createElement('div')
    el.style.cssText = `width:3px;height:100%;background:${DIFF_COLOR[this.kind]};margin-left:1px;`
    el.title = this.kind
    return el
  }
}

const setDiffLines = StateEffect.define<{ added: number[]; modified: number[]; removed: number[] }>()

const diffGutterState = StateField.define<RangeSet<GutterMarker>>({
  create: () => RangeSet.empty,
  update(markers, tr) {
    markers = markers.map(tr.changes)
    for (const e of tr.effects) {
      if (e.is(setDiffLines)) {
        const ranges: { from: number; to: number; value: GutterMarker }[] = []
        const doc = tr.newDoc
        const addMarker = (lines: number[], kind: DiffKind) => {
          for (const line of lines) {
            if (line < 1 || line > doc.lines) continue
            const from = doc.line(line).from
            ranges.push({ from, to: from, value: new DiffMarker(kind) })
          }
        }
        addMarker(e.value.added, 'added')
        addMarker(e.value.modified, 'modified')
        addMarker(e.value.removed, 'removed')
        markers = ranges.length
          ? RangeSet.of(ranges.sort((a, b) => a.from - b.from), true)
          : RangeSet.empty
      }
    }
    return markers
  },
})

const diffGutterExtension = [
  diffGutterState,
  gutter({
    class: 'cm-diff-gutter',
    markers: v => v.state.field(diffGutterState),
    initialSpacer: () => new DiffMarker('added'),
  }),
  EditorView.theme({ '.cm-diff-gutter .cm-gutterElement': { padding: '0', width: '6px' } }),
]

// ── Collab cursor decorations ─────────────────────────────────────────────────

class CursorWidget extends WidgetType {
  constructor(readonly name: string, readonly color: string) { super() }
  toDOM() {
    const el = document.createElement('span')
    el.style.cssText = `
      border-left: 2px solid ${this.color};
      position: relative;
      margin-left: -1px;
    `
    const label = document.createElement('span')
    label.textContent = this.name
    label.style.cssText = `
      position: absolute;
      top: -18px;
      left: 0;
      background: ${this.color};
      color: #000;
      font-size: 10px;
      padding: 1px 4px;
      border-radius: 3px;
      white-space: nowrap;
      pointer-events: none;
      font-family: var(--font-ui);
      line-height: 1.4;
      z-index: 10;
    `
    el.appendChild(label)
    return el
  }
  ignoreEvent() { return true }
}

const setCursors = StateEffect.define<RemoteCursor[]>()

const cursorField = StateField.define<RangeSet<Decoration>>({
  create: () => RangeSet.empty,
  update(deco, tr) {
    deco = deco.map(tr.changes)
    for (const e of tr.effects) {
      if (e.is(setCursors)) {
        const marks: Range<Decoration>[] = []
        for (const c of e.value) {
          const docLen = tr.newDoc.length
          const anchor = Math.min(c.anchor, docLen)
          const head = Math.min(c.head, docLen)
          // Selection highlight
          if (anchor !== head) {
            const from = Math.min(anchor, head)
            const to = Math.max(anchor, head)
            marks.push(Decoration.mark({
              attributes: { style: `background: ${c.color}33` },
            }).range(from, to))
          }
          // Cursor widget
          marks.push(Decoration.widget({
            widget: new CursorWidget(c.peerName, c.color),
            side: 1,
          }).range(head))
        }
        deco = marks.length
          ? RangeSet.of(marks.sort((a, b) => a.from - b.from))
          : RangeSet.empty
      }
    }
    return deco
  },
  provide: f => EditorView.decorations.from(f),
})

const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'])

function isImage(filename: string) {
  return IMAGE_EXTS.has(filename.split('.').pop()?.toLowerCase() ?? '')
}

function fileUrl(path: string) {
  if (typeof window !== 'undefined' && (window as any).api) {
    return 'file:///' + path.replace(/\\/g, '/')
  }
  return path
}

// ── Minimap ───────────────────────────────────────────────────────────────────

function Minimap({ content, viewRef }: { content: string; viewRef: React.RefObject<EditorView | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const WIDTH = 80
  const CHAR_H = 2
  const CHAR_W = 0.6

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const lines = content.split('\n')
    const height = Math.max(lines.length * CHAR_H, 1)
    canvas.height = height
    canvas.width = WIDTH

    ctx.fillStyle = '#0d1117'
    ctx.fillRect(0, 0, WIDTH, height)

    lines.forEach((line, i) => {
      const y = i * CHAR_H
      const len = Math.min(line.length, Math.floor(WIDTH / CHAR_W))
      if (!line.trim()) return
      ctx.fillStyle = '#4a5568'
      ctx.fillRect(0, y, len * CHAR_W, CHAR_H - 0.5)
    })
  }, [content])

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const view = viewRef.current
    if (!view) return
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const relY = (e.clientY - rect.top) / rect.height
    const totalLines = content.split('\n').length
    const targetLine = Math.floor(relY * totalLines)
    const line = view.state.doc.line(Math.max(1, Math.min(targetLine + 1, view.state.doc.lines)))
    view.dispatch({ effects: EditorView.scrollIntoView(line.from, { y: 'center' }) })
  }

  return (
    <div style={{
      width: WIDTH, flexShrink: 0,
      background: '#0d1117',
      borderLeft: '1px solid var(--border)',
      overflow: 'hidden',
      cursor: 'pointer',
      position: 'relative',
    }}>
      <canvas
        ref={canvasRef}
        width={WIDTH}
        style={{ width: '100%', height: '100%', display: 'block', imageRendering: 'pixelated' }}
        onClick={handleClick}
        title="Minimap — click to navigate"
      />
    </div>
  )
}

interface Props {
  openedFiles: OpenedFile[]
  activeFile: string | null
  onActivate: (path: string) => void
  onClose: (path: string) => void
  onSave: (path: string, content: string) => void
  onChange: (path: string, content: string) => void
  rootPath?: string | null
}

function langExtension(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'js': return javascript()
    case 'jsx': return javascript({ jsx: true })
    case 'ts': return javascript({ typescript: true })
    case 'tsx': return javascript({ typescript: true, jsx: true })
    case 'py': return python()
    case 'css': return css()
    case 'html': return html()
    case 'json': return json()
    case 'md': return markdown()
    default: return []
  }
}

function ImageViewer({ file }: { file: OpenedFile }) {
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null)
  const [mode, setMode] = useState<'preview' | 'edit'>('preview')
  const [resizeW, setResizeW] = useState(0)
  const [resizeH, setResizeH] = useState(0)
  const [lockAspect, setLockAspect] = useState(true)
  const [aspectRatio, setAspectRatio] = useState(1)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  // Crop state
  const [cropActive, setCropActive] = useState(false)
  const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null)
  const [cropRect, setCropRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const src = fileUrl(file.path) + '?t=' + Date.now()

  const PRESETS = [
    { label: '16×16', w: 16, h: 16, desc: 'Favicon' },
    { label: '32×32', w: 32, h: 32, desc: 'Small Icon' },
    { label: '48×48', w: 48, h: 48, desc: 'Icon' },
    { label: '64×64', w: 64, h: 64, desc: 'Medium Icon' },
    { label: '128×128', w: 128, h: 128, desc: 'Large Icon' },
    { label: '180×180', w: 180, h: 180, desc: 'Apple Touch' },
    { label: '192×192', w: 192, h: 192, desc: 'Android' },
    { label: '256×256', w: 256, h: 256, desc: 'App Icon' },
    { label: '512×512', w: 512, h: 512, desc: 'Store Icon' },
    { label: '1024×1024', w: 1024, h: 1024, desc: 'Hi-Res Icon' },
    { label: '500×500', w: 500, h: 500, desc: 'Logo Square' },
    { label: '800×600', w: 800, h: 600, desc: 'SVGA' },
    { label: '1280×720', w: 1280, h: 720, desc: 'HD 720p' },
    { label: '1920×1080', w: 1920, h: 1080, desc: 'Full HD' },
  ]

  const onImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    const w = img.naturalWidth
    const h = img.naturalHeight
    setDims({ w, h })
    setResizeW(w)
    setResizeH(h)
    setAspectRatio(w / h)
  }

  const handleResizeW = (val: number) => {
    setResizeW(val)
    if (lockAspect && aspectRatio) setResizeH(Math.round(val / aspectRatio))
  }

  const handleResizeH = (val: number) => {
    setResizeH(val)
    if (lockAspect && aspectRatio) setResizeW(Math.round(val * aspectRatio))
  }

  const applyPreset = (pw: number, ph: number) => {
    setResizeW(pw)
    setResizeH(ph)
    setLockAspect(false)
  }

  // Crop mouse handlers
  const handleCropMouseDown = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!cropActive) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setCropStart({ x, y })
    setCropRect(null)
  }

  const handleCropMouseMove = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!cropActive || !cropStart) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setCropRect({
      x: Math.min(cropStart.x, x),
      y: Math.min(cropStart.y, y),
      w: Math.abs(x - cropStart.x),
      h: Math.abs(y - cropStart.y),
    })
  }

  const handleCropMouseUp = () => {
    setCropStart(null)
  }

  // Save with resize or crop
  const handleSave = async (action: 'resize' | 'crop') => {
    const img = imgRef.current
    if (!img || !dims) return
    setSaving(true)
    setSaveMsg('')

    const canvas = canvasRef.current || document.createElement('canvas')
    const ctx = canvas.getContext('2d')!

    if (action === 'resize') {
      canvas.width = resizeW
      canvas.height = resizeH
      ctx.drawImage(img, 0, 0, resizeW, resizeH)
    } else if (action === 'crop' && cropRect) {
      // Convert screen coords to image coords
      const displayW = img.clientWidth
      const displayH = img.clientHeight
      const scaleX = dims.w / displayW
      const scaleY = dims.h / displayH
      const sx = cropRect.x * scaleX
      const sy = cropRect.y * scaleY
      const sw = cropRect.w * scaleX
      const sh = cropRect.h * scaleY
      canvas.width = Math.round(sw)
      canvas.height = Math.round(sh)
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
    }

    const ext = file.name.split('.').pop()?.toLowerCase()
    const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
    const quality = ext === 'png' ? undefined : 0.92

    const dataUrl = canvas.toDataURL(mimeType, quality)
    const base64 = dataUrl.split(',')[1]

    try {
      const result = await window.api.saveImage?.(file.path, base64)
      if (result && 'error' in result) {
        setSaveMsg('Error: ' + result.error)
      } else {
        setSaveMsg('Saved successfully!')
        // Update dims
        setDims({ w: canvas.width, h: canvas.height })
        setResizeW(canvas.width)
        setResizeH(canvas.height)
        setAspectRatio(canvas.width / canvas.height)
        setCropRect(null)
        setCropActive(false)
      }
    } catch (err: any) {
      setSaveMsg('Error: ' + (err.message || 'unknown'))
    }
    setSaving(false)
    setTimeout(() => setSaveMsg(''), 3000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Toggle bar */}
      <div style={{
        display: 'flex', gap: 4, padding: '4px 8px',
        background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border)',
        alignItems: 'center',
      }}>
        <button className="btn" style={{ opacity: mode === 'preview' ? 1 : 0.5 }} onClick={() => { setMode('preview'); setCropActive(false) }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4 }}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          Preview
        </button>
        <button className="btn" style={{ opacity: mode === 'edit' ? 1 : 0.5 }} onClick={() => setMode('edit')}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4 }}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Edit
        </button>
        {saveMsg && (
          <span style={{ marginLeft: 'auto', fontSize: 11, color: saveMsg.startsWith('Error') ? 'var(--error)' : '#22c55e' }}>
            {saveMsg}
          </span>
        )}
      </div>

      {/* Preview mode */}
      {mode === 'preview' && (
        <div style={{
          flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12,
        }}>
          <div style={{
            backgroundImage: 'repeating-conic-gradient(#333 0% 25%, #1a1a1a 0% 50%)',
            backgroundSize: '20px 20px',
            borderRadius: 8, padding: 8,
            display: 'inline-flex',
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          }}>
            <img
              ref={imgRef}
              src={src}
              alt={file.name}
              onLoad={onImgLoad}
              style={{ maxWidth: '70vw', maxHeight: '55vh', display: 'block', objectFit: 'contain' }}
            />
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{file.name}</div>
            {dims && <div>{dims.w} × {dims.h} px</div>}
          </div>
        </div>
      )}

      {/* Edit mode */}
      {mode === 'edit' && (
        <div style={{ flex: 1, overflow: 'auto', display: 'flex', gap: 16, padding: 16 }}>
          {/* Image + Crop overlay */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <img
                ref={imgRef}
                src={src}
                alt={file.name}
                onLoad={onImgLoad}
                draggable={false}
                onMouseDown={handleCropMouseDown}
                onMouseMove={handleCropMouseMove}
                onMouseUp={handleCropMouseUp}
                style={{
                  maxWidth: '55vw', maxHeight: '50vh', display: 'block', objectFit: 'contain',
                  cursor: cropActive ? 'crosshair' : 'default',
                  borderRadius: 4,
                  boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
                }}
              />
              {/* Crop overlay rectangle */}
              {cropRect && cropRect.w > 2 && cropRect.h > 2 && (
                <div style={{
                  position: 'absolute',
                  left: cropRect.x, top: cropRect.y,
                  width: cropRect.w, height: cropRect.h,
                  border: '2px dashed #22c55e',
                  background: 'rgba(34, 197, 94, 0.1)',
                  pointerEvents: 'none',
                }} />
              )}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>
              {dims && <span>Original: {dims.w} × {dims.h} px</span>}
              {cropRect && cropRect.w > 2 && <span style={{ marginLeft: 12, color: '#22c55e' }}>Crop: {Math.round(cropRect.w)}×{Math.round(cropRect.h)}</span>}
            </div>
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>

          {/* Tools sidebar */}
          <div style={{
            width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12,
            background: 'var(--bg-secondary)', borderRadius: 8, padding: 12,
            border: '1px solid var(--border)', overflowY: 'auto',
          }}>
            {/* Crop Tool */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4, verticalAlign: 'middle' }}><path d="M6 2v14a2 2 0 002 2h14"/><path d="M18 22V8a2 2 0 00-2-2H2"/></svg>
                Crop
              </div>
              <button
                className="btn"
                onClick={() => { setCropActive(!cropActive); setCropRect(null) }}
                style={{
                  width: '100%', padding: '6px 0', fontSize: 11,
                  background: cropActive ? 'var(--accent)' : 'var(--bg-hover)',
                  color: cropActive ? '#fff' : 'var(--text-primary)',
                  border: '1px solid var(--border)', borderRadius: 4,
                }}
              >
                {cropActive ? 'Cancel Crop' : 'Start Crop Selection'}
              </button>
              {cropRect && cropRect.w > 2 && (
                <button
                  className="btn btn-primary"
                  onClick={() => handleSave('crop')}
                  disabled={saving}
                  style={{ width: '100%', marginTop: 6, padding: '6px 0', fontSize: 11 }}
                >
                  {saving ? 'Saving...' : 'Apply Crop & Save'}
                </button>
              )}
            </div>

            {/* Resize Tool */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4, verticalAlign: 'middle' }}><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
                Resize
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Width</label>
                  <input type="number" value={resizeW} onChange={e => handleResizeW(Number(e.target.value))}
                    style={{ width: '100%', padding: '4px 6px', fontSize: 11, background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 3 }} />
                </div>
                <button
                  onClick={() => setLockAspect(!lockAspect)}
                  title={lockAspect ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
                  style={{ background: 'transparent', border: 'none', color: lockAspect ? 'var(--accent)' : 'var(--text-muted)', cursor: 'pointer', marginTop: 14, padding: 2 }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {lockAspect
                      ? <><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></>
                      : <><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 019.9-1" /></>
                    }
                  </svg>
                </button>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Height</label>
                  <input type="number" value={resizeH} onChange={e => handleResizeH(Number(e.target.value))}
                    style={{ width: '100%', padding: '4px 6px', fontSize: 11, background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 3 }} />
                </div>
              </div>
              <button
                className="btn btn-primary"
                onClick={() => handleSave('resize')}
                disabled={saving || resizeW < 1 || resizeH < 1}
                style={{ width: '100%', padding: '6px 0', fontSize: 11 }}
              >
                {saving ? 'Saving...' : 'Resize & Save'}
              </button>
            </div>

            {/* Presets */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4, verticalAlign: 'middle' }}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                Size Presets
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {PRESETS.map(p => (
                  <button
                    key={p.label}
                    title={p.desc}
                    onClick={() => applyPreset(p.w, p.h)}
                    style={{
                      padding: '3px 6px', fontSize: 9, borderRadius: 4,
                      background: resizeW === p.w && resizeH === p.h ? 'var(--accent)' : 'var(--bg-hover)',
                      color: resizeW === p.w && resizeH === p.h ? '#fff' : 'var(--text-secondary)',
                      border: '1px solid var(--border)', cursor: 'pointer',
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function EditorPane({
  file, active, onChange, onSave, onCursorChange, remoteCursors, diff,
}: {
  file: OpenedFile
  active: boolean
  onChange: (content: string) => void
  onSave: (content: string) => void
  onCursorChange?: (anchor: number, head: number) => void
  remoteCursors?: RemoteCursor[]
  diff?: { added: number[]; modified: number[]; removed: number[] }
}) {
  const settings = useSettings()
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [mdPreview, setMdPreview] = useState(false)
  const [htmlPreview, setHtmlPreview] = useState(false)
  const [liveContent, setLiveContent] = useState(file.content)
  const isMarkdown = file.name.endsWith('.md')
  const isHtml = /\.html?$/i.test(file.name)

  // Apply remote cursor decorations when they change
  useEffect(() => {
    const view = viewRef.current
    if (!view || !remoteCursors) return
    view.dispatch({ effects: setCursors.of(remoteCursors) })
  }, [remoteCursors])

  // F1: apply remote edit patches to this file
  const remotePatch = useAppStore((s) => s.remotePatches.get(file.path))
  const remoteVersion = useAppStore((s) => s.remoteVersions.get(file.path) ?? 0)
  useEffect(() => {
    if (!remotePatch) return
    const view = viewRef.current
    if (!view) return
    if (remotePatch.truncated) {
      // Fall back to a full re-read via the existing request-file socket event
      const socket = useAppStore.getState().remoteSocket
      if (socket) socket.emit('request-file', file.path, (content: string) => {
        if (typeof content !== 'string') return
        useAppStore.getState().markApplyingRemote(file.path)
        replaceDoc(view, content)
        useAppStore.getState().bumpRemoteVersion(file.path)
        setTimeout(() => useAppStore.getState().clearApplyingRemote(file.path), 100)
      })
      useAppStore.getState().bumpRemoteVersion(file.path)
      return
    }
    const current = view.state.doc.toString()
    if (current === remotePatch.content) {
      useAppStore.getState().bumpRemoteVersion(file.path)
      return
    }
    // Conflict detection: if user has non-empty selection overlapping the changed range, surface banner
    const sel = view.state.selection.main
    if (!sel.empty) {
      const changed = findChangedLineRange(current, remotePatch.content)
      if (changed && selectionOverlapsLineRange(sel, view.state.doc, changed.firstLine, changed.lastLine)) {
        // Defer to a separate effect-driven banner via remotePatch presence; user can accept via menu
        setConflict({ peerName: remotePatch.peerName, first: changed.firstLine, last: changed.lastLine, content: remotePatch.content })
        return
      }
    }
    useAppStore.getState().markApplyingRemote(file.path)
    replaceDoc(view, remotePatch.content)
    useAppStore.getState().bumpRemoteVersion(file.path)
    setTimeout(() => useAppStore.getState().clearApplyingRemote(file.path), 100)
  }, [remoteVersion]) // eslint-disable-line

  const [conflict, setConflict] = useState<{ peerName: string; first: number; last: number; content: string } | null>(null)

  // Apply git diff gutter markers when diff changes
  useEffect(() => {
    const view = viewRef.current
    if (!view || !diff) return
    view.dispatch({ effects: setDiffLines.of(diff) })
  }, [diff])

  useEffect(() => {
    if (!containerRef.current || !active) return
    if (mdPreview) return
    if (htmlPreview) return
    if (isImage(file.name)) return

    const view = new EditorView({
      state: EditorState.create({
        doc: file.content,
        extensions: [
          basicSetup,
          oneDark,
          cursorField,
          ...diffGutterExtension,
          langExtension(file.name),
          EditorView.theme({
            '&': { height: '100%', background: '#0d1117' },
            '.cm-scroller': { fontFamily: 'var(--font-mono)', fontSize: 'var(--editor-font-size, 13px)', overflow: 'auto' },
            '.cm-content': { padding: '8px 0' },
          }),
          ...(settings.wordWrap ? [EditorView.lineWrapping] : []),
          EditorView.updateListener.of((update: import('@codemirror/view').ViewUpdate) => {
            if (update.docChanged) {
              const content = update.state.doc.toString()
              setLiveContent(content)
              onChange(content)
              if (settings.autosave) {
                if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
                saveTimerRef.current = setTimeout(() => onSave(content), 1000)
              }
            }
            if (update.selectionSet && onCursorChange) {
              const sel = update.state.selection.main
              onCursorChange(sel.anchor, sel.head)
              const line = update.state.doc.lineAt(sel.head)
              window.dispatchEvent(new CustomEvent('cursor-position', {
                detail: { line: line.number, col: sel.head - line.from + 1 }
              }))
            }
          }),
          EditorView.domEventHandlers({
            keydown(e: KeyboardEvent) {
              if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault()
                if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
                const content = view.state.doc.toString()
                onSave(content)
              }
            },
          }),
        ],
      }),
      parent: containerRef.current,
    })

    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file.path, active, mdPreview, htmlPreview])

  if (!active) return null

  if (isImage(file.name)) {
    return <ImageViewer file={file} />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Markdown Edit/Preview toggle */}
      {isMarkdown && (
        <div style={{
          display: 'flex', gap: 4, padding: '4px 8px',
          background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border)',
        }}>
          <button className="btn" style={{ opacity: !mdPreview ? 1 : 0.5 }} onClick={() => setMdPreview(false)}>Edit</button>
          <button className="btn" style={{ opacity: mdPreview ? 1 : 0.5 }} onClick={() => setMdPreview(true)}>Preview</button>
        </div>
      )}

      {/* HTML Edit/Preview toggle */}
      {isHtml && (
        <div style={{
          display: 'flex', gap: 4, padding: '4px 8px',
          background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border)',
          alignItems: 'center',
        }}>
          <button className="btn" style={{ opacity: !htmlPreview ? 1 : 0.5 }} onClick={() => setHtmlPreview(false)}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4 }}><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
            Edit
          </button>
          <button className="btn" style={{ opacity: htmlPreview ? 1 : 0.5 }} onClick={() => setHtmlPreview(true)}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4 }}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            Preview
          </button>
          {htmlPreview && (
            <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)' }}>Live HTML Preview</span>
          )}
        </div>
      )}

      {/* HTML Preview iframe */}
      {htmlPreview && isHtml ? (
        <div style={{ flex: 1, overflow: 'hidden', background: '#fff' }}>
          <iframe
            srcDoc={liveContent}
            title="HTML Preview"
            sandbox="allow-scripts allow-same-origin"
            style={{ width: '100%', height: '100%', border: 'none' }}
          />
        </div>
      ) : mdPreview ? (
        <div
          style={{
            flex: 1, overflow: 'auto', padding: 24,
            color: 'var(--text-primary)', fontFamily: 'var(--font-ui)', lineHeight: 1.7,
          }}
          dangerouslySetInnerHTML={{ __html: marked(file.content) as string }}
        />
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {conflict && (
            <div style={{
              padding: '6px 10px', background: 'var(--warning)', color: '#0d1117',
              fontSize: 12, display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
            }}>
              <span style={{ flex: 1 }}>
                <b>{conflict.peerName}</b> atualizou linhas {conflict.first}–{conflict.last} que você está editando.
              </span>
              <button
                onClick={() => {
                  const view = viewRef.current
                  if (view) {
                    useAppStore.getState().markApplyingRemote(file.path)
                    replaceDoc(view, conflict.content)
                    useAppStore.getState().bumpRemoteVersion(file.path)
                    setTimeout(() => useAppStore.getState().clearApplyingRemote(file.path), 100)
                  }
                  setConflict(null)
                }}
                style={{ background: '#0d1117', color: 'var(--warning)', border: 'none', padding: '2px 8px', borderRadius: 3, cursor: 'pointer' }}
              >Aceitar o remoto</button>
              <button
                onClick={() => setConflict(null)}
                style={{ background: 'transparent', color: '#0d1117', border: '1px solid #0d1117', padding: '2px 8px', borderRadius: 3, cursor: 'pointer' }}
              >Manter o meu</button>
            </div>
          )}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            <div ref={containerRef} style={{ flex: 1, overflow: 'hidden' }} />
            {settings.minimap && <Minimap content={liveContent} viewRef={viewRef} />}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Single editor panel (used by main + split) ────────────────────────────────

function EditorPanel({
  openedFiles, activeFile, onActivate, onClose, onSave, onChange, rootPath = null,
  remoteCursors, broadcastCursor, diff, isSplit = false,
}: Props & { remoteCursors: RemoteCursor[]; broadcastCursor: (a: number, h: number) => void; diff: ReturnType<typeof useGitDiff>; isSplit?: boolean }) {
  if (openedFiles.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: 8 }}>
        <IconFile size={36} color="var(--text-muted)" />
        {isSplit
          ? <><div style={{ fontSize: 13 }}>Split Editor</div><div style={{ fontSize: 11 }}>Alt+click a file • right-click → Open in Split</div></>
          : <><div style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-secondary)' }}>EZZO Studio Dev</div><div style={{ fontSize: 13 }}>Open a folder and select a file to start editing</div></>
        }
      </div>
    )
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', overflowX: 'auto', flexShrink: 0 }}>
        {openedFiles.map((f) => (
          <div key={f.path} onClick={() => onActivate(f.path)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '0 12px', height: 35, cursor: 'pointer', whiteSpace: 'nowrap',
            borderRight: '1px solid var(--border)',
            background: f.path === activeFile ? 'var(--bg-primary)' : 'var(--bg-secondary)',
            borderBottom: f.path === activeFile ? '2px solid var(--accent)' : '2px solid transparent',
            color: f.path === activeFile ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontSize: 12,
          }}>
            <span>{f.name}</span>
            {f.modified && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--warning)', display: 'inline-block', flexShrink: 0 }} />}
            <button onClick={(e) => { e.stopPropagation(); onClose(f.path) }}
              style={{ color: 'var(--text-muted)', padding: '0 2px', borderRadius: 2, display: 'flex', alignItems: 'center' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' }}
            ><IconClose size={12} /></button>
          </div>
        ))}
      </div>

      <Breadcrumbs filePath={activeFile} rootPath={rootPath} />

      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {openedFiles.map((f) => (
          <div key={f.path} style={{ position: 'absolute', inset: 0, display: f.path === activeFile ? 'flex' : 'none', flexDirection: 'column' }}>
            <EditorPane
              file={f}
              active={f.path === activeFile}
              onChange={(content) => onChange(f.path, content)}
              onSave={(content) => onSave(f.path, content)}
              onCursorChange={f.path === activeFile ? broadcastCursor : undefined}
              remoteCursors={f.path === activeFile ? remoteCursors.filter(c => c.filePath === f.path) : undefined}
              diff={f.path === activeFile ? diff : undefined}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Editor({ openedFiles, activeFile, onActivate, onClose, onSave, onChange, rootPath = null }: Props) {
  const [remoteCursors, setRemoteCursors] = useState<RemoteCursor[]>([])
  const { broadcastCursor } = useCollabCursor(activeFile, setRemoteCursors)
  const diff = useGitDiff(activeFile)

  const { splitFiles, splitActive, splitEnabled, closeFileSplit, setSplitActive, updateFileContent, markFileSaved } = useAppStore()

  const handleSave = useCallback((path: string, content: string) => onSave(path, content), [onSave])

  const handleSplitSave = useCallback(async (path: string, content: string) => {
    const file = useAppStore.getState().splitFiles.find(f => f.path === path)
    if (file?.remote) {
      const socket = useAppStore.getState().remoteSocket
      if (!socket) return
      socket.emit('write-file', path, content, (ok: boolean) => {
        if (ok) markFileSaved(path)
      })
      return
    }
    await window.api.writeFile(path, content)
    markFileSaved(path)
  }, [markFileSaved])

  if (!splitEnabled) {
    if (openedFiles.length === 0) {
      return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: 12 }}>
          <IconFile size={48} color="var(--text-muted)" />
          <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-secondary)' }}>EZZO Studio Dev</div>
          <div style={{ fontSize: 13 }}>Open a folder and select a file to start editing</div>
        </div>
      )
    }

    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', overflowX: 'auto', flexShrink: 0 }}>
          {openedFiles.map((f) => (
            <div key={f.path} onClick={() => onActivate(f.path)} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '0 12px', height: 35, cursor: 'pointer', whiteSpace: 'nowrap',
              borderRight: '1px solid var(--border)',
              background: f.path === activeFile ? 'var(--bg-primary)' : 'var(--bg-secondary)',
              borderBottom: f.path === activeFile ? '2px solid var(--accent)' : '2px solid transparent',
              color: f.path === activeFile ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontSize: 12,
            }}>
              <span>{f.name}</span>
              {f.modified && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--warning)', display: 'inline-block', flexShrink: 0 }} />}
              <button onClick={(e) => { e.stopPropagation(); onClose(f.path) }}
                style={{ color: 'var(--text-muted)', padding: '0 2px', borderRadius: 2, display: 'flex', alignItems: 'center' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' }}
              ><IconClose size={12} /></button>
            </div>
          ))}
        </div>

        <Breadcrumbs filePath={activeFile} rootPath={rootPath} />

        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {openedFiles.map((f) => (
            <div key={f.path} style={{ position: 'absolute', inset: 0, display: f.path === activeFile ? 'flex' : 'none', flexDirection: 'column' }}>
              <EditorPane
                file={f}
                active={f.path === activeFile}
                onChange={(content) => onChange(f.path, content)}
                onSave={(content) => handleSave(f.path, content)}
                onCursorChange={f.path === activeFile ? broadcastCursor : undefined}
                remoteCursors={f.path === activeFile ? remoteCursors.filter(c => c.filePath === f.path) : undefined}
                diff={f.path === activeFile ? diff : undefined}
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Split view
  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      {/* Main panel */}
      <EditorPanel
        openedFiles={openedFiles} activeFile={activeFile} onActivate={onActivate}
        onClose={onClose} onSave={handleSave} onChange={onChange} rootPath={rootPath}
        remoteCursors={remoteCursors} broadcastCursor={broadcastCursor} diff={diff}
      />

      {/* Divider */}
      <div style={{ width: 3, background: 'var(--border)', flexShrink: 0, cursor: 'col-resize' }} />

      {/* Split panel */}
      <EditorPanel
        openedFiles={splitFiles} activeFile={splitActive} onActivate={setSplitActive}
        onClose={closeFileSplit}
        onSave={handleSplitSave}
        onChange={(path, content) => updateFileContent(path, content)}
        rootPath={rootPath}
        remoteCursors={[]} broadcastCursor={() => {}} diff={{ added: [], modified: [], removed: [] }}
        isSplit
      />
    </div>
  )
}

// ── F1 helpers ────────────────────────────────────────────────────────────────
import type { Text } from '@codemirror/state'

/**
 * Replace the entire document content. Builds a `ChangeSet` from a `ChangeSpec`
 * and applies it via `view.dispatch`. This is the typed-correct way to perform
 * a full-doc replace in CodeMirror 6.
 */
function replaceDoc(view: EditorView, content: string, effects?: StateEffect<unknown>[]) {
  const changes: ChangeSet = view.state.changes({ from: 0, to: view.state.doc.length, insert: content })
  view.dispatch({ changes, effects })
}

function findChangedLineRange(a: string, b: string): { firstLine: number; lastLine: number } | null {
  if (a === b) return null
  // Find common prefix length
  const max = Math.min(a.length, b.length)
  let prefix = 0
  while (prefix < max && a.charCodeAt(prefix) === b.charCodeAt(prefix)) prefix++
  // Find common suffix
  let suffix = 0
  while (
    suffix < (max - prefix) &&
    a.charCodeAt(a.length - 1 - suffix) === b.charCodeAt(b.length - 1 - suffix)
  ) suffix++
  const firstLine = a.slice(0, prefix).split('\n').length
  const lastLine = a.slice(0, a.length - suffix).split('\n').length
  return { firstLine, lastLine }
}

function selectionOverlapsLineRange(
  sel: { anchor: number; head: number },
  doc: Text,
  firstLine: number,
  lastLine: number,
): boolean {
  const a = Math.min(sel.anchor, sel.head)
  const b = Math.max(sel.anchor, sel.head)
  try {
    const startLine = doc.lineAt(a).number
    const endLine = doc.lineAt(b).number
    return startLine <= lastLine && endLine >= firstLine
  } catch {
    return false
  }
}