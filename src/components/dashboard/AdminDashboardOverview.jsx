import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { fetchAdminDashboard, fetchPrincipalDashboard } from '../../api/adminApi'
import { LEAD_STAGES, LEAD_STAGE_LABELS } from '../../data/phase6Constants'
import { EMPTY_ADMIN_DASHBOARD } from './adminDashboardTypes'
import { Card, CardHeader } from '../ui/Card'
import { Button } from '../ui/Button'
import { NotificationReadReportModal } from '../notifications/NotificationReadReportModal'
import { NOTIFICATION_CATEGORY_LABELS } from '../../utils/notificationConstants'
import { ROLES } from '../../utils/constants'

function fmtNum(v) {
  return v != null && Number.isFinite(Number(v)) ? String(v) : '—'
}

function fmtTime(ts) {
  if (ts == null || ts === '') return '—'
  try {
    const d = typeof ts === 'number' ? new Date(ts) : new Date(ts)
    if (Number.isNaN(d.getTime())) return '—'
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(d)
  } catch {
    return '—'
  }
}

function noticeStatusBadge(status) {
  const s = String(status || 'pending').toLowerCase()
  if (s.includes('approv'))
    return 'rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800'
  if (s.includes('reject'))
    return 'rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-800'
  return 'rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900'
}

function noticeCategoryQuery(n) {
  const cat = String(n.actions?.approvalQueueCategory ?? n.category ?? '')
    .trim()
    .toLowerCase()
  if (cat === 'administrative' || cat === 'academic') {
    return `?category=${encodeURIComponent(cat)}`
  }
  return ''
}

/** Pending → approval queue; approved/rejected → notice history. */
function noticeAction(n, approvalsPath) {
  const status = String(n.status || '').toLowerCase()
  const qs = noticeCategoryQuery(n)
  const pending =
    n.actions?.canApprove ||
    n.actions?.canReject ||
    status.includes('pending')

  if (pending) {
    return { to: `${approvalsPath}${qs}`, label: 'Review' }
  }
  return { to: `/notifications/history${qs}`, label: 'Review' }
}

/**
 * Clickable stat tile — navigates to a related page.
 */
function StatLink({ to, label, value, hint, className = '' }) {
  return (
    <Link
      to={to}
      className={`dash-stat block transition hover:border-slate-300 hover:bg-slate-50/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 ${className}`}
    >
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </Link>
  )
}

function SectionTitle({ children, id }) {
  return (
    <h2 id={id} className="text-base font-semibold text-slate-900">
      {children}
    </h2>
  )
}

/**
 * Admin → GET /api/admin/dashboard; principal → GET /api/principal/dashboard (same UI).
 */
export function AdminDashboardOverview() {
  const { token, user } = useAuth()
  const isPrincipal = user?.role === ROLES.PRINCIPAL
  const noticeApprovalsPath = '/notifications/history'
  const [apiDashboard, setApiDashboard] = useState(null)
  const [apiLoading, setApiLoading] = useState(false)
  const [apiError, setApiError] = useState('')
  const [readReport, setReadReport] = useState({ open: false, id: null, title: '' })

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
      const res = isPrincipal
        ? await fetchPrincipalDashboard(token)
        : await fetchAdminDashboard(token)
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
  }, [token, isPrincipal])

  const dash = apiDashboard ?? EMPTY_ADMIN_DASHBOARD
  const leadByStatus = dash.leads.byStatus || {}

  return (
    <div className={`space-y-8 ${apiLoading ? 'opacity-70' : ''}`}>
      <NotificationReadReportModal
        open={readReport.open}
        onClose={() => setReadReport({ open: false, id: null, title: '' })}
        notificationId={readReport.id}
        notificationTitle={readReport.title}
        token={token}
      />
      {apiError ? (
        <p className="rounded-xl border border-amber-200/90 bg-amber-50/90 px-4 py-2.5 text-sm text-amber-950">
          {apiError}
        </p>
      ) : null}

      {/* Staff & fleet */}
      <section className="space-y-3" aria-labelledby="admin-dash-staff">
        <SectionTitle id="admin-dash-staff">Staff & fleet</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatLink
            to="/teachers"
            label="Active teachers"
            value={fmtNum(dash.teachers.active)}
            hint="Open teachers list →"
          />
          <StatLink
            to="/teachers"
            label="Inactive teachers"
            value={fmtNum(dash.teachers.inactive)}
            hint="Filter inactive on list →"
          />
          <StatLink
            to="/transport/buses"
            label="Total buses"
            value={fmtNum(dash.transport.totalBuses)}
            hint="Manage buses →"
          />
          <StatLink
            to="/drivers"
            label="Total drivers"
            value={fmtNum(dash.transport.totalDrivers)}
            hint="Bus drivers →"
          />
        </div>
      </section>

      {/* Notices */}
      <section className="space-y-3" aria-labelledby="admin-dash-notices">
        <SectionTitle id="admin-dash-notices">Notices</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatLink
            to={noticeApprovalsPath}
            label="Pending notice approvals"
            value={fmtNum(dash.pendingNoticeApprovals)}
            hint="Review queue →"
            className="sm:col-span-2 lg:col-span-1"
          />
        </div>
      </section>

      {/* Transport */}
      <section className="space-y-3" aria-labelledby="admin-dash-transport">
        <SectionTitle id="admin-dash-transport">Transport</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <StatLink
            to="/transport-assignments"
            label="Active trips today"
            value={fmtNum(dash.transport.activeTripsToday)}
            hint="Assignments & live trips →"
          />
          <StatLink
            to="/transport-assignments"
            label="Completed trips today"
            value={fmtNum(dash.transport.completedTripsToday)}
            hint="Trip history →"
          />
        </div>
      </section>

      {/* Visitors */}
      <section className="space-y-3" aria-labelledby="admin-dash-visitors">
        <SectionTitle id="admin-dash-visitors">Visitors</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <StatLink
            to="/visitor-logs"
            label="Visitors today"
            value={fmtNum(dash.visitors.today)}
            hint="Visitor log →"
          />
          <StatLink
            to="/visitor-logs"
            label="Visitors this week"
            value={fmtNum(dash.visitors.thisWeek)}
            hint="Weekly view on log →"
          />
        </div>
      </section>

      {/* Leads */}
      <section className="space-y-3" aria-labelledby="admin-dash-leads">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <SectionTitle id="admin-dash-leads">Leads</SectionTitle>
          <Link
            to="/leads"
            className="text-sm font-medium text-indigo-700 hover:underline"
          >
            Open CRM →
          </Link>
        </div>
        <Card className="!p-0">
          <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
            <p className="text-sm font-medium text-slate-600">Total leads</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{fmtNum(dash.leads.total)}</p>
          </div>
          <div className="grid gap-px bg-slate-100 sm:grid-cols-2 lg:grid-cols-3">
            {LEAD_STAGES.map((stage) => (
              <Link
                key={stage}
                to={`/leads?stage=${encodeURIComponent(stage)}`}
                className="flex items-center justify-between bg-white px-4 py-3 transition hover:bg-slate-50 sm:px-6"
              >
                <span className="text-sm font-medium text-slate-700">
                  {LEAD_STAGE_LABELS[stage] ?? stage}
                </span>
                <span className="text-lg font-semibold text-slate-900">
                  {fmtNum(leadByStatus[stage])}
                </span>
              </Link>
            ))}
          </div>
        </Card>
      </section>

      {/* PTM */}
      <section className="space-y-3" aria-labelledby="admin-dash-ptm">
        <SectionTitle id="admin-dash-ptm">PTM</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatLink
            to="/ptm-requests/admin/history"
            label="Completed"
            value={fmtNum(dash.ptm.completed)}
            hint="PTM history →"
          />
          <StatLink
            to="/ptm-requests/staff"
            label="Upcoming"
            value={fmtNum(dash.ptm.upcoming)}
            hint="Staff PTM queue →"
          />
          <StatLink
            to="/ptm-requests/staff"
            label="Pending requests"
            value={fmtNum(dash.ptm.pending)}
            hint="Review requests →"
          />
        </div>
      </section>

      {/* Recent notices */}
      <Card>
        <CardHeader
          title="Recent notices"
          subtitle="Up to 10 — review or open the approval queue."
          action={
            <Link
              to={noticeApprovalsPath}
              className="text-sm font-medium text-indigo-700 hover:underline"
            >
              Approval queue
            </Link>
          }
        />
        {dash.recentNotices.length === 0 ? (
          <p className="text-sm text-slate-600">
            {apiLoading ? 'Loading notices…' : 'No recent notices to show.'}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-100">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="app-table-head">
                  <th className="px-3 py-2.5 font-semibold">Title</th>
                  <th className="px-3 py-2.5 font-semibold">Category</th>
                  <th className="px-3 py-2.5 font-semibold">For</th>
                  <th className="px-3 py-2.5 font-semibold">Status</th>
                  <th className="px-3 py-2.5 font-semibold">Submitted</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {dash.recentNotices.slice(0, 10).map((n) => {
                  const action = noticeAction(n, noticeApprovalsPath)
                  return (
                    <tr key={n.id} className="hover:bg-slate-50/80">
                      <td className="px-3 py-3">
                        <p className="font-medium text-slate-900">{n.title || 'Untitled'}</p>
                        {n.shortSummary ? (
                          <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{n.shortSummary}</p>
                        ) : null}
                        {n.submittedBy ? (
                          <p className="mt-0.5 text-xs text-slate-500">By {n.submittedBy}</p>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        <p>{NOTIFICATION_CATEGORY_LABELS[n.category] || n.category || '—'}</p>
                        {n.subcategoryName ? (
                          <p className="mt-0.5 text-xs text-slate-500">{n.subcategoryName}</p>
                        ) : null}
                      </td>
                      <td className="max-w-[12rem] px-3 py-3 text-slate-600">
                        {n.target || '—'}
                      </td>
                      <td className="px-3 py-3">
                        <span className={noticeStatusBadge(n.status)}>
                          {String(n.status || 'pending').replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-600">{fmtTime(n.createdAt)}</td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Link
                            to={action.to}
                            className="inline-flex rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 hover:bg-slate-50"
                          >
                            {action.label}
                          </Link>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="!px-2.5 !py-1 !text-xs"
                            onClick={() =>
                              setReadReport({
                                open: true,
                                id: n.id,
                                title: n.title || 'School notice',
                              })
                            }
                          >
                            Read report
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
