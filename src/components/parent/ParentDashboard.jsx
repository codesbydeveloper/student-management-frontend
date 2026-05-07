import { Link } from 'react-router-dom'
import { ChildCard } from './ChildCard'

/**
 * Parent-only home: welcome + child cards.
 * @param {{ parentName: string, childRows: { student: object, cls: object|null }[], childrenLoading?: boolean, childrenSubtitle?: string }} props
 */
export function ParentDashboard({ parentName, childRows, childrenLoading = false, childrenSubtitle }) {
  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-2xl border border-teal-400/25 bg-gradient-to-br from-teal-800 via-cyan-900 to-indigo-950 p-6 text-white shadow-xl shadow-teal-950/35 sm:rounded-3xl sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-emerald-300/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-52 w-52 rounded-full bg-sky-400/15 blur-3xl" />
        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-200/95">Family</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">Welcome, {parentName}</h1>
          <p className="mt-2 max-w-xl text-sm font-medium leading-relaxed text-teal-50/95">
            View your children below and open school messages anytime.
          </p>
          <div className="mt-6">
            <Link
              to="/parent-notifications"
              className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-2.5 text-sm font-bold text-slate-900 shadow-lg shadow-teal-950/25 ring-1 ring-white/80 transition hover:bg-emerald-50 hover:text-slate-950 hover:ring-emerald-200/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-[0.99]"
            >
              View notifications
            </Link>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold text-slate-900">Your children</h2>
        <p className="mt-1 text-sm text-slate-600">
          {childrenSubtitle ||
            'Names and classes come from your school. Section shows when the school provides it.'}
        </p>
        {childrenLoading && childRows.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-slate-200/90 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
            Loading your children…
          </p>
        ) : null}
        {!childrenLoading && childRows.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm font-medium text-amber-950">
            No linked students yet. Ask your school admin to connect your account to your children in Parents.
          </p>
        ) : null}
        {childRows.length > 0 ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {childRows.map(({ student, cls }) => (
              <ChildCard
                key={student.id}
                studentName={student.fullName}
                className={cls?.name}
                section={cls?.section}
                relationship={student.relationshipToChild}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
