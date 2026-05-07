export function Card({ children, className = '' }) {
  return (
    <div className={`group relative ${className}`}>
      <div className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-br from-indigo-400/30 via-violet-400/15 to-cyan-400/20 opacity-40 blur-[1px] transition duration-500 group-hover:opacity-70" />
      <div className="relative w-full overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 p-4 shadow-xl shadow-slate-900/[0.08] ring-1 ring-slate-900/[0.03] backdrop-blur-sm sm:p-6">
        <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-gradient-to-br from-indigo-100/80 to-violet-100/40 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-20 h-52 w-52 rounded-full bg-gradient-to-tr from-cyan-50/90 to-indigo-50/50 blur-2xl" />
        <div className="relative">{children}</div>
      </div>
    </div>
  )
}

export function CardHeader({ title, subtitle, action }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 bg-clip-text text-xl font-bold tracking-tight text-transparent">
          {title}
        </h2>
        {subtitle ? <p className="mt-2 text-sm leading-relaxed text-slate-500">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
