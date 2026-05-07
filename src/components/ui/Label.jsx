export function Label({ children, htmlFor, className = '' }) {
  return (
    <label
      htmlFor={htmlFor}
      className={`mb-1.5 block text-sm font-medium text-slate-700 ${className}`}
    >
      {children}
    </label>
  )
}
