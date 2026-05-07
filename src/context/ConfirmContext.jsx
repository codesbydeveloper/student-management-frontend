import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Button } from '../components/ui/Button'

const ConfirmContext = createContext(null)

/**
 * App-wide confirm dialog (replaces window.confirm) — same visual language as Modal.
 * @param {{ title?: string, message: string, confirmLabel?: string, cancelLabel?: string, variant?: 'danger' | 'neutral' }} options
 * @returns {Promise<boolean>}
 */
export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState({
    open: false,
    title: 'Please confirm',
    message: '',
    confirmLabel: 'OK',
    cancelLabel: 'Cancel',
    variant: 'danger',
  })
  const resolveRef = useRef(null)

  const close = useCallback((result) => {
    const fn = resolveRef.current
    resolveRef.current = null
    setDialog((d) => ({ ...d, open: false }))
    fn?.(result)
  }, [])

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve
      setDialog({
        open: true,
        title: options?.title ?? 'Please confirm',
        message: options?.message ?? '',
        confirmLabel: options?.confirmLabel ?? 'OK',
        cancelLabel: options?.cancelLabel ?? 'Cancel',
        variant: options?.variant === 'neutral' ? 'neutral' : 'danger',
      })
    })
  }, [])

  useEffect(() => {
    if (!dialog.open) return
    const onKey = (e) => {
      if (e.key === 'Escape') close(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dialog.open, close])

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {dialog.open ? (
        <div className="fixed inset-0 z-[200] flex items-end justify-center p-4 sm:items-center">
          <button
            type="button"
            aria-label="Dismiss"
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-md transition-opacity"
            onClick={() => close(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="app-confirm-title"
            className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/25 ring-1 ring-slate-900/[0.04]"
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-400" />
            <div className="flex items-start justify-between gap-4 border-b border-slate-100/90 bg-gradient-to-r from-slate-50/90 to-indigo-50/30 px-6 py-4">
              <h3
                id="app-confirm-title"
                className="bg-gradient-to-r from-slate-900 to-indigo-900 bg-clip-text text-lg font-bold tracking-tight text-transparent"
              >
                {dialog.title}
              </h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="!rounded-lg !px-2 !py-1"
                onClick={() => close(false)}
              >
                ✕
              </Button>
            </div>
            <div className="max-h-[50vh] overflow-y-auto overscroll-contain px-6 py-5 text-sm leading-relaxed text-slate-600">
              {dialog.message}
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/50 px-6 py-4 backdrop-blur-sm sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={() => close(false)}>
                {dialog.cancelLabel}
              </Button>
              <Button
                type="button"
                variant={dialog.variant === 'danger' ? 'danger' : 'primary'}
                className="w-full sm:w-auto"
                onClick={() => close(true)}
              >
                {dialog.confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) {
    throw new Error('useConfirm must be used within ConfirmProvider')
  }
  return ctx.confirm
}
