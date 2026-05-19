import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useAppData } from '../../context/AppDataContext'
import { useNotifications } from '../../context/NotificationContext'
import { fetchTeacherDashboard } from '../../api/teachersApi'
import { Card } from '../ui/Card'
import { NOTIFICATION_STATUSES } from '../../utils/notificationConstants'
import { formatApprovalDateTime } from '../../utils/notificationTimestamps'

function fmtTime(ts) {
  if (ts == null) return '—'
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(ts)
  } catch {
    return '—'
  }
}

function statusBadge(status) {
  const s = String(status || '')
  if (s === NOTIFICATION_STATUSES.APPROVED)
    return 'rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800'
  if (s === NOTIFICATION_STATUSES.REJECTED)
    return 'rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-800'
  if (s === NOTIFICATION_STATUSES.PENDING_ADMIN || s === NOTIFICATION_STATUSES.PENDING_PRINCIPAL)
    return 'rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900'
  return 'rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700'
}

/**
 * Teacher home dashboard — GET /api/teachers/dashboard when a token is present; local data fills gaps.
 */
export function TeacherDashboardOverview() {
  const { user, token } = useAuth()
  const { teachers, students, classes, hydrated } = useAppData()
  const { notifications } = useNotifications()

  const [apiDashboard, setApiDashboard] = useState(null)
  const [apiLoading, setApiLoading] = useState(false)
  const [apiError, setApiError] = useState('')

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
      const res = await fetchTeacherDashboard(token)
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

  const me = useMemo(
    () => teachers.find((t) => String(t.id) === String(user?.id)),
    [teachers, user?.id],
  )

  const assignedClassIds = useMemo(() => {
    const ids = me?.classIds
    if (!Array.isArray(ids)) return []
    return [...new Set(ids.map(String))]
  }, [me?.classIds])

  const assignedClasses = useMemo(
    () => classes.filter((c) => assignedClassIds.includes(String(c.id))),
    [classes, assignedClassIds],
  )

  const studentsInAssigned = useMemo(() => {
    const set = new Set(assignedClassIds)
    return students.filter((s) => set.has(String(s.classId))).length
  }, [students, assignedClassIds])

  const myNotifications = useMemo(
    () => (notifications || []).filter((n) => String(n.createdBy) === String(user?.id)),
    [notifications, user?.id],
  )

  const clientNotifCounts = useMemo(() => {
    let approved = 0
    let rejected = 0
    let pending = 0
    for (const n of myNotifications) {
      if (n.status === NOTIFICATION_STATUSES.APPROVED) approved += 1
      else if (n.status === NOTIFICATION_STATUSES.REJECTED) rejected += 1
      else if (
        n.status === NOTIFICATION_STATUSES.PENDING_ADMIN ||
        n.status === NOTIFICATION_STATUSES.PENDING_PRINCIPAL
      )
        pending += 1
    }
    return { approved, rejected, pending }
  }, [myNotifications])

  const clientRecentNotices = useMemo(
    () =>
      [...myNotifications]
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
        .slice(0, 5)
        .map((n) => ({
          id: n.id,
          title: n.title || 'Untitled',
          status: n.status,
          createdAt: n.createdAt,
        })),
    [myNotifications],
  )

  const dash = apiDashboard

  const assignedClassesCount =
    dash?.assignedClassesCount != null && Number.isFinite(Number(dash.assignedClassesCount))
      ? Number(dash.assignedClassesCount)
      : hydrated
        ? assignedClasses.length
        : null

  const studentsInAssignedCount =
    dash?.studentsInAssignedClasses != null && Number.isFinite(Number(dash.studentsInAssignedClasses))
      ? Number(dash.studentsInAssignedClasses)
      : hydrated
        ? studentsInAssigned
        : null

  const notifCounts = useMemo(() => {
    const a = apiDashboard?.notificationCounts
    if (a && (a.approved != null || a.rejected != null || a.pending != null)) {
      return {
        approved: a.approved ?? 0,
        rejected: a.rejected ?? 0,
        pending: a.pending ?? 0,
      }
    }
    return clientNotifCounts
  }, [apiDashboard?.notificationCounts, clientNotifCounts])

  const ptmUpcoming =
    dash?.ptmCounts?.upcoming != null && Number.isFinite(Number(dash.ptmCounts.upcoming))
      ? Number(dash.ptmCounts.upcoming)
      : 0
  const ptmCompleted =
    dash?.ptmCounts?.completed != null && Number.isFinite(Number(dash.ptmCounts.completed))
      ? Number(dash.ptmCounts.completed)
      : 0

  const recentPtmRows = Array.isArray(dash?.recentPtmRequests) ? dash.recentPtmRequests : []

  const leadsDisplay =
    dash?.assignedLeadsTotal != null && Number.isFinite(Number(dash.assignedLeadsTotal))
      ? String(dash.assignedLeadsTotal)
      : '—'

  const recentNoticesRows = dash?.recentNotices?.length ? dash.recentNotices : clientRecentNotices

  return (
    <div className={`space-y-6 ${apiLoading ? 'opacity-70' : ''}`}>
      {apiError ? (
        <p className="rounded-xl border border-amber-200/90 bg-amber-50/90 px-4 py-2.5 text-sm text-amber-950">
          {apiError}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="dash-stat">
          <p className="text-sm font-medium text-slate-600">Assigned classes</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {assignedClassesCount != null ? assignedClassesCount : '—'}
          </p>
        </div>
        <div className="dash-stat">
          <p className="text-sm font-medium text-slate-600">Students in those classes</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {studentsInAssignedCount != null ? studentsInAssignedCount : '—'}
          </p>
        </div>
        <div className="dash-stat">
          <p className="text-sm font-medium text-slate-600">Notifications</p>
          <div className="mt-2 flex flex-wrap gap-2 text-sm font-semibold text-slate-800">
            <span className="rounded-lg bg-white/80 px-2 py-1 text-emerald-800 ring-1 ring-emerald-200/60">
              Approved {notifCounts.approved}
            </span>
            <span className="rounded-lg bg-white/80 px-2 py-1 text-rose-800 ring-1 ring-rose-200/60">
              Rejected {notifCounts.rejected}
            </span>
            <span className="rounded-lg bg-white/80 px-2 py-1 text-amber-900 ring-1 ring-amber-200/60">
              Pending {notifCounts.pending}
            </span>
          </div>
          <Link to="/notifications" className="mt-3 inline-block text-sm font-medium text-indigo-700 hover:underline">
            Open notifications →
          </Link>
        </div>
        <div className="dash-stat">
          <p className="text-sm font-medium text-slate-600">PTM</p>
          <div className="mt-2 flex gap-4 text-sm">
            <div>
              <p className="text-2xl font-bold text-slate-900">{ptmUpcoming}</p>
              <p className="text-xs text-slate-500">Upcoming</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{ptmCompleted}</p>
              <p className="text-xs text-slate-500">Completed</p>
            </div>
          </div>
          <Link to="/ptm-requests" className="mt-3 inline-block text-sm font-medium text-indigo-700 hover:underline">
            PTM requests →
          </Link>
        </div>
      </div>

      <Card>
        <p className="text-sm font-medium text-slate-600">Assigned leads</p>
        <p className="mt-1 text-2xl font-semibold text-slate-900">{leadsDisplay}</p>
        <Link
          to="/assigned-leads"
          className="mt-4 inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          View leads
        </Link>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Recent notices</h2>
            </div>
            <Link
              to="/notifications/create"
              className="shrink-0 text-xs font-bold text-indigo-600 hover:underline"
            >
              New notice
            </Link>
          </div>
          {recentNoticesRows.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">No notices yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100">
              {recentNoticesRows.map((n) => (
                <li key={n.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{n.title || 'Untitled'}</p>
                    <p className="text-xs text-slate-500">{fmtTime(n.createdAt)}</p>
                  </div>
                  <span className="flex flex-col items-end gap-0.5">
                    <span className={statusBadge(n.status)}>{String(n.status || '').replace(/_/g, ' ')}</span>
                    {n.status === NOTIFICATION_STATUSES.APPROVED && n.approvedAt ? (
                      <span className="text-[10px] font-medium text-slate-500 tabular-nums">
                        {formatApprovalDateTime(n.approvedAt)}
                      </span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Recent PTM requests</h2>
            </div>
            <Link to="/ptm-requests" className="shrink-0 text-xs font-bold text-indigo-600 hover:underline">
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
                    <th className="px-3 py-2">Family / student</th>
                    <th className="px-3 py-2">Slot</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentPtmRows.map((r) => (
                    <tr key={r.id}>
                      <td className="px-3 py-2 font-medium text-slate-900">{r.family}</td>
                      <td className="px-3 py-2 text-slate-600">{r.when}</td>
                      <td className="px-3 py-2">
                        <span
                          className={
                            r.state === 'Upcoming'
                              ? 'rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-bold text-sky-900'
                              : 'rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700'
                          }
                        >
                          {r.state}
                        </span>
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
