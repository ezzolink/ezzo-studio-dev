import { create } from 'zustand'

export interface Toast {
  id: string
  msg: string
  type: 'info' | 'success' | 'warning' | 'error'
}

interface ToastState {
  toasts: Toast[]
  addToast: (msg: string, type: Toast['type']) => void
  removeToast: (id: string) => void
}

export const useToast = create<ToastState>((set) => ({
  toasts: [],
  addToast: (msg, type) => {
    const id = Math.random().toString(36).slice(2)
    set((s) => ({ toasts: [...s.toasts, { id, msg, type }] }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4000)
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
