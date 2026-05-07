import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button } from './ui/Button'

export function Modal({ open, title, children, footer, onClose, size = 'md' }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [open])

  if (!open) return null

  const width =
    size === 'lg' ? 'max-w-2xl' : size === 'sm' ? 'max-w-md' : 'max-w-lg'

  /** Portal to body so overlay is not clipped by parent `overflow-hidden` (e.g. Card). */
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-gradient-to-b from-slate-900/30 via-slate-900/40 to-indigo-950/45 backdrop-blur-sm backdrop-saturate-125 transition-opacity"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative z-10 w-full ${width} overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/25 ring-1 ring-slate-900/[0.04]`}
      >
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-400" />
        <div className="flex items-start justify-between gap-4 border-b border-slate-100/90 bg-gradient-to-r from-slate-50/90 to-indigo-50/30 px-6 py-4">
          <h3 className="bg-gradient-to-r from-slate-900 to-indigo-900 bg-clip-text text-lg font-bold tracking-tight text-transparent">
            {title}
          </h3>
          <Button type="button" variant="ghost" size="sm" className="!rounded-lg !px-2 !py-1" onClick={onClose}>
            ✕
          </Button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto overscroll-contain bg-white px-6 py-5">{children}</div>
        {footer ? (
          <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/50 px-6 py-4 backdrop-blur-sm">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}
