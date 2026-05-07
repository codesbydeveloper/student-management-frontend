export function Input({ className = '', error, id, ...rest }) {
  return (
    <input
      id={id}
      className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-inner shadow-slate-900/[0.03] transition placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 ${
        error ? 'border-red-400 ring-1 ring-red-200' : 'border-slate-200/90'
      } ${className}`}
      {...rest}
    />
  )
}
