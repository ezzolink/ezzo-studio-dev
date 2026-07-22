import React from 'react'

interface IconProps {
  size?: number
  color?: string
  style?: React.CSSProperties
}

const icon = (path: string, viewBox = '0 0 24 24') =>
  ({ size = 16, color = 'currentColor', style }: IconProps) => (
    <svg width={size} height={size} viewBox={viewBox} fill="none" stroke={color}
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={style}>
      {typeof path === 'string' ? <path d={path} /> : path}
    </svg>
  )

// File & Folder
export const IconFolder       = icon('M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z')
export const IconFolderOpen   = icon('M3 9a2 2 0 012-2h4l2 2h8a2 2 0 012 2v1H3V9zm0 3h18l-1.5 6H4.5L3 12z')
export const IconFile         = icon('M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm0 0v6h6')
export const IconFileCode     = icon('M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-2 12l-2 2-2-2m4 0l2-2 2 2M14 2v6h6')
export const IconFileText     = icon('M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM8 13h8M8 17h5M14 2v6h6')
export const IconMarkdown     = icon('M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM8 15l2-4 2 3 2-2v3M14 2v6h6')
export const IconImage        = icon('M21 19V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2zm-12-5l2.5 3L15 13l4 6H5l4-4z')
export const IconJson         = icon('M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM8 12c0-1 1.5-1 1.5 0v4c0 1-1.5 1-1.5 0M13 12v2l1.5 1-1.5 1v2M14 2v6h6')
export const IconLock         = icon('M18 11H6a2 2 0 00-2 2v7a2 2 0 002 2h12a2 2 0 002-2v-7a2 2 0 00-2-2zm-6 5v2m0-2a1 1 0 110-2 1 1 0 010 2zM8 11V7a4 4 0 018 0v4')

// Actions
export const IconNewFile      = icon('M12 5v14M5 12h14')
export const IconNewFolder    = icon('M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7zm9 1v8m-4-4h8')
export const IconRename       = icon('M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z')
export const IconCopy         = icon('M8 4H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V8l-4-4H8zm0 0v4h8M8 4a2 2 0 012-2h2.586a1 1 0 01.707.293l3.414 3.414A1 1 0 0117 6.414V18a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z')
export const IconDelete       = icon('M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14zM10 11v6M14 11v6')
export const IconDownload     = icon('M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3')
export const IconRefresh      = icon('M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15')
export const IconSave         = icon('M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2zM17 21v-8H7v8M7 3v5h8')
export const IconClose        = icon('M18 6L6 18M6 6l12 12')
export const IconMinimize     = icon('M5 12h14')
export const IconMaximize     = icon('M3 3h18v18H3z')
export const IconSettings     = icon('M12 15a3 3 0 100-6 3 3 0 000 6zm7.07-2.29a1 1 0 000-1.42l-1.06-1.06a1 1 0 01-.29-.71V9a1 1 0 00-1-1h-1.5a1 1 0 01-.71-.29L13.24 6.64a1 1 0 00-1.41 0L10.5 7.71A1 1 0 019.79 8H8.28a1 1 0 00-1 1v1.52a1 1 0 01-.29.71L5.93 12.29a1 1 0 000 1.42l1.06 1.06a1 1 0 01.29.71V17a1 1 0 001 1h1.5a1 1 0 01.71.29l1.27 1.27a1 1 0 001.41 0l1.27-1.27a1 1 0 01.71-.29H16a1 1 0 001-1v-1.52a1 1 0 01.29-.71l1.78-1.77z')

// Network / Connection
export const IconHost         = icon('M5 12.55a11 11 0 0114.08 0M1.42 9a16 16 0 0121.16 0M8.53 16.11a6 6 0 016.95 0M12 20h.01')
export const IconConnect      = icon('M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71')
export const IconDisconnect   = icon('M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71M2 2l20 20')
export const IconPeer         = icon('M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zm8 4v6m3-3h-6')

// Editor / Terminal
export const IconTerminal     = icon('M4 17l6-6-6-6M12 19h8')
export const IconPreview      = icon('M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z')
export const IconChevronRight = icon('M9 18l6-6-6-6')
export const IconChevronDown  = icon('M6 9l6 6 6-6')
export const IconOpenFolder   = icon('M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z')
export const IconSearch       = icon('M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z')

// Status dots (filled)
export const IconDot = ({ size = 8, color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 8 8">
    <circle cx="4" cy="4" r="4" fill={color} />
  </svg>
)
