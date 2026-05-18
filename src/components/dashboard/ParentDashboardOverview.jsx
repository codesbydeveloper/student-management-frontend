import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { fetchParentDashboard } from '../../api/parentsApi'
import { Card } from '../ui/Card'
import { PtmStatusBadge } from '../phase6/PtmStatusBadge'

function fmtTime(ts) {
  if (ts == null || ts === '—') return '—'
  try {
    const d = typeof ts === 'number' ? ts : new Date(ts)
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(d)
  } catch {
    return '—'
  }
}

function countTeachers(groups) {
  const unique = new Set()
  let total = 0
  for (const g of groups) {
    for (const t of g.teachers || []) {
      total += 1
      unique.add(t.id || t.name)
    }
  }
  return { total, unique: unique.size }
}

/**
 * Parent dashboard — GET /api/parents/dashboard.
 * Teachers (tap for names/subjects), notice counts, bus trip, recent notices & PTM.
 */
export function ParentDashboardOverview() {
  const { token } = useAuth()
  const [apiDashboard, setApiDashboard] = useState(null)
  const [apiLoading, setApiLoading] = useState(false)
  const [apiError, setApiError] = useState('')
  const [teachersOpen, setTeachersOpen] = useState(false)

  useEffect(() => {
    if (!token) {
      setApiDashboard(null)
      setApiError('')
      setApiLoading(false)
      return
    }
    let cancelled = false
    setApiLoading(true)
    setApiError('')
    void (async () => {
      const res = await fetchParentDashboard(token)
      if (cancelled) return
      setApiLoading(false)
      if (res.ok && res.dashboard) {
        setApiDashboard(res.dashboard)
        setApiError('')
      } else {
        setApiDashboard(null)
        setApiError(res.error || 'Could not load dashboard.')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  const dash = apiDashboard
  const studentTeachers = Array.isArray(dash?.studentTeachers) ? dash.studentTeachers : []
  const teacherCounts = useMemo(() => countTeachers(studentTeachers), [studentTeachers])

  const totalNotices =
    dash?.totalNotices != null && Number.isFinite(Number(dash.totalNotices))
      ? Number(dash.totalNotices)
      : null
  const unreadNotices =
    dash?.unreadNotices != null && Number.isFinite(Number(dash.unreadNotices))
      ? Number(dash.unreadNotices)
      : null
  const busTripActive = dash?.busTripActive === true
  const busTripKnown = dash?.busTripActive === true || dash?.busTripActive === false

  const recentNoticesRows = Array.isArray(dash?.recentNotices) ? dash.recentNotices : []
  const recentPtmRows = Array.isArray(dash?.recentPtmRequests) ? dash.recentPtmRequests : []

  const teachersCount =
    teacherCounts.unique > 0
      ? teacherCounts.unique
      : teacherCounts.total > 0
        ? teacherCounts.total
        : null

  return (
    <div className={`space-y-6 ${apiLoading ? 'opacity-70' : ''}`}>
      {apiError ? (
        <p className="rounded-xl border border-amber-200/90 bg-amber-50/90 px-4 py-2.5 text-sm text-amber-950">
          {apiError}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <button
          type="button"
          onClick={() => setTeachersOpen((o) => !o)}
          aria-expanded={teachersOpen}
          className={`relative overflow-hidden rounded-2xl border p-5 text-left shadow-lg shadow-slate-900/[0.04] ring-1 ring-inset transition ${
            teachersOpen
              ? 'border-indigo-300 bg-gradient-to-br from-indigo-500/20 to-violet-500/15 ring-indigo-300/80'
              : 'border-slate-200/80 bg-gradient-to-br from-indigo-500/15 to-violet-500/10 ring-indigo-200/60 hover:border-indigo-300/80'
          }`}
        >
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Teachers</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {teachersCount != null ? teachersCount : '—'}
          </p>
          <p className="mt-2 text-xs font-bold text-indigo-700">
            {teachersOpen ? 'Hide names & subjects' : 'Tap for names & subjects'}
          </p>
        </button>

        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-emerald-500/15 to-teal-500/10 p-5 shadow-lg shadow-slate-900/[0.04] ring-1 ring-inset ring-emerald-200/60">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Total notices</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {totalNotices != null ? totalNotices : '—'}
          </p>
          <Link
            to="/parent-notifications"
            className="mt-3 inline-block text-xs font-bold text-indigo-700 hover:underline"
          >
            School messages →
          </Link>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-amber-500/15 to-orange-500/10 p-5 shadow-lg shadow-slate-900/[0.04] ring-1 ring-inset ring-amber-200/60">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Unread notices</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {unreadNotices != null ? unreadNotices : '—'}
          </p>
          <Link
            to="/parent-notifications"
            className="mt-3 inline-block text-xs font-bold text-indigo-700 hover:underline"
          >
            Open messages →
          </Link>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-sky-500/15 to-cyan-500/10 p-5 shadow-lg shadow-slate-900/[0.04] ring-1 ring-inset ring-sky-200/60">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Bus trip</p>
          <div className="mt-3 flex items-center gap-2">
            <span
              className={`inline-flex h-2.5 w-2.5 shrink-0 rounded-full ${
                busTripKnown && busTripActive
                  ? 'animate-pulse bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.25)]'
                  : busTripKnown
                    ? 'bg-slate-300'
                    : 'bg-slate-200'
              }`}
              aria-hidden
            />
            <span className="text-sm font-bold text-slate-900">
              {!busTripKnown ? '—' : busTripActive ? 'Active' : 'Not active'}
            </span>
          </div>
          <Link
            to="/parent-bus"
            className="mt-3 inline-block text-xs font-bold text-indigo-700 hover:underline"
          >
            Bus tracking →
          </Link>
        </div>
      </div>

      {teachersOpen ? (
        <Card>
          <h2 className="text-lg font-bold text-slate-900">Teachers assigned to your child</h2>
          {studentTeachers.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">No teachers listed yet.</p>
          ) : (
            <ul className="mt-4 space-y-5">
              {studentTeachers.map((group) => (
                <li
                  key={group.studentId}
                  className="rounded-xl border border-slate-100 bg-slate-50/60 p-4"
                >
                  <p className="text-sm font-bold text-slate-900">{group.studentName}</p>
                  {group.teachers?.length ? (
                    <ul className="mt-3 divide-y divide-slate-200/80">
                      {group.teachers.map((t) => (
                        <li
                          key={`${group.studentId}-${t.id}`}
                          className="flex flex-wrap items-baseline justify-between gap-2 py-2.5 first:pt-0 last:pb-0"
                        >
                          <span className="font-semibold text-slate-800">{t.name}</span>
                          <span className="text-sm text-slate-600">{t.subjectLabel}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">No teachers assigned.</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900">Recent notices</h2>
            <Link
              to="/parent-notifications"
              className="shrink-0 text-xs font-bold text-indigo-600 hover:underline"
            >
              View all
            </Link>
          </div>
          {recentNoticesRows.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">No notices yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100">
              {recentNoticesRows.map((n) => (
                <li
                  key={n.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{n.title}</p>
                    <p className="text-xs text-slate-500">{fmtTime(n.createdAt)}</p>
                  </div>
                  {!n.isRead ? (
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-900">
                      Unread
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                      Read
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900">Recent PTM requests</h2>
            <Link
              to="/parent/ptm/history"
              className="shrink-0 text-xs font-bold text-indigo-600 hover:underline"
            >
              View all
            </Link>
          </div>
          {recentPtmRows.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">No recent PTM requests.</p>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-xl border border-slate-100">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2">Request</th>
                    <th className="px-3 py-2">When</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentPtmRows.map((r) => (
                    <tr key={r.id}>
                      <td className="px-3 py-2 font-medium text-slate-900">{r.label}</td>
                      <td className="px-3 py-2 text-slate-600">{fmtTime(r.when)}</td>
                      <td className="px-3 py-2">
                        <PtmStatusBadge status={r.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
