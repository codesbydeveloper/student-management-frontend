import { useMemo, useState } from 'react'
import { Input } from './ui/Input'
import { Label } from './ui/Label'

/**
 * Full-width searchable single-select (same interaction pattern as SearchableMultiSelect).
 */
export function SearchableSingleSelect({
  id,
  label,
  options,
  value,
  onChange,
  disabled,
  placeholder = 'Search and select…',
  searchPlaceholder = 'Search…',
  emptyText = 'No matches.',
  error,
  /** Tailwind max-height utility for the popup panel. Override to make the list shorter or taller. */
  panelMaxHeightClass = 'max-h-[min(50vh,22rem)]',
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        String(o.value).toLowerCase().includes(q) ||
        (o.subtext && o.subtext.toLowerCase().includes(q)),
    )
  }, [options, query])

  const selected = options.find((o) => o.value === value)
  const summary = selected ? selected.label : placeholder

  const select = (val) => {
    if (disabled) return
    onChange(val)
    setOpen(false)
    setQuery('')
  }

  const triggerId = id ? `${id}-trigger` : 'searchable-single-trigger'

  return (
    <div className="w-full space-y-2">
      {label ? <Label htmlFor={triggerId}>{label}</Label> : null}
      <button
        id={triggerId}
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => {
          if (!disabled) {
            setOpen((v) => !v)
            if (open) setQuery('')
          }
        }}
        className={`flex w-full min-h-[2.75rem] items-center justify-between gap-2 rounded-xl border bg-white px-3.5 py-2.5 text-left text-sm shadow-inner shadow-slate-900/[0.03] transition ${
          error ? 'border-red-400 ring-1 ring-red-200' : 'border-slate-200/90'
        } ${
          disabled
            ? 'cursor-not-allowed text-slate-400'
            : 'text-slate-900 hover:border-indigo-300 focus-visible:border-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/25'
        }`}
      >
        <span className={`min-w-0 flex-1 truncate ${selected ? 'font-medium' : 'text-slate-400'}`}>
          {summary}
        </span>
        <span className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden>
          ▼
        </span>
      </button>

      {open && !disabled ? (
        <div
          className={`flex w-full flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-lg ring-1 ring-slate-900/[0.04] ${panelMaxHeightClass}`}
          onWheel={(e) => e.stopPropagation()}
        >
          <div className="shrink-0 border-b border-slate-100 p-2">
            <Input
              id={id ? `${id}-search` : undefined}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              autoComplete="off"
              aria-label={searchPlaceholder}
            />
          </div>
          <div
            role="listbox"
            className="min-h-0 flex-1 touch-pan-y overflow-y-auto overflow-x-hidden overscroll-contain p-2 [scrollbar-color:rgb(129_140_248/0.75)_rgb(241_245_249/0.9)] [scrollbar-gutter:stable] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-indigo-300/90 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-100"
            onWheel={(e) => e.stopPropagation()}
          >
            {filtered.length === 0 ? (
              <p className="py-8 text-center text-sm font-medium text-slate-500">{emptyText}</p>
            ) : (
              <ul className="space-y-0.5">
                {filtered.map((o) => {
                  const active = value === o.value
                  return (
                    <li key={o.value}>
                      <button
                        type="button"
                        onClick={() => select(o.value)}
                        className={`flex w-full items-start gap-2 rounded-lg px-2 py-2.5 text-left text-sm transition hover:bg-indigo-50/60 ${
                          active ? 'bg-indigo-50 ring-1 ring-indigo-200/80' : ''
                        }`}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="font-medium text-slate-800">{o.label}</span>
                          {o.subtext ? (
                            <span className="mt-0.5 block text-xs text-slate-500">{o.subtext}</span>
                          ) : null}
                        </span>
                        {active ? (
                          <span className="shrink-0 text-xs font-bold text-indigo-600" aria-hidden>
                            ✓
                          </span>
                        ) : null}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}
      {error ? <p className="mt-1 text-xs font-medium text-red-600">{error}</p> : null}
    </div>
  )
}
