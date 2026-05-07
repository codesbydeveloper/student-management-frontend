export function Select({ className = '', error, id, children, ...rest }) {
  return (
    <select
      id={id}
      className={`w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-inner shadow-slate-900/[0.03] focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 ${
        error ? 'border-red-400' : 'border-slate-200'
      } ${className}`}
      {...rest}
    >
      {children}
    </select>
  )
}
