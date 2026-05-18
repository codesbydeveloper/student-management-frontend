import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useAppData } from '../context/AppDataContext'
import { Card } from '../components/ui/Card'
import { RoleBadge } from '../components/ui/Badge'
import { ROLES } from '../utils/constants'
import { canAccessRoute } from '../utils/permissions'
import { TeacherDashboardOverview } from '../components/dashboard/TeacherDashboardOverview'
import { ParentDashboardOverview } from '../components/dashboard/ParentDashboardOverview'

function Stat({ label, value, hint, accent }) {
  const accents = {
    indigo: 'from-indigo-500/15 to-violet-500/10 ring-indigo-200/60',
    emerald: 'from-emerald-500/15 to-teal-500/10 ring-emerald-200/60',
    amber: 'from-amber-500/15 to-orange-500/10 ring-amber-200/60',
    rose: 'from-rose-500/15 to-pink-500/10 ring-rose-200/60',
  }
  const ring = accents[accent] || accents.indigo
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br p-5 shadow-lg shadow-slate-900/[0.04] ring-1 ring-inset ${ring}`}
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/40 blur-2xl" />
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
      {hint ? <p className="mt-2 text-xs font-semibold text-indigo-600/90">{hint}</p> : null}
    </div>
  )
}

export default function DashboardHomePage() {
  const { user } = useAuth()
  const { teachers, students, classes, parents, hydrated } = useAppData()

  const stats = useMemo(() => {
    const activeTeachers = teachers.filter((t) => t.active).length
    return {
      teachers: teachers.length,
      activeTeachers,
      students: students.length,
      classes: classes.length,
      parents: parents.length,
    }
  }, [teachers, students, classes, parents])

  const quickLinks = [
    { to: '/parent-dashboard', label: 'Family dashboard', key: 'parent_dashboard' },
    { to: '/parent-notifications', label: 'School messages', key: 'parent_notifications' },
    { to: '/parent-bus', label: 'Bus tracking', key: 'parent_bus' },
    { to: '/driver-transport', label: 'My trip', key: 'driver_transport' },
    { to: '/teachers', label: 'Teachers', key: 'teachers' },
    { to: '/drivers', label: 'Bus drivers', key: 'drivers' },
    { to: '/students', label: 'Students', key: 'students' },
    { to: '/classes', label: 'Classes', key: 'classes' },
    { to: '/parents', label: 'Parents', key: 'parents' },
    { to: '/transport/buses', label: 'Create buses', key: 'admin_create_buses' },
    { to: '/parent/ptm/request', label: 'PTM request', key: 'parent_ptm_request' },
    { to: '/parent/ptm/history', label: 'PTM history', key: 'parent_ptm_history' },
    { to: '/ptm-requests', label: 'PTM requests', key: 'teacher_ptm_requests' },
    { to: '/ptm-requests/staff', label: 'PTM request', key: 'staff_ptm_requests' },
    { to: '/ptm-requests/admin/history', label: 'PTM history', key: 'staff_ptm_history' },
    { to: '/assigned-leads', label: 'Assigned leads', key: 'teacher_assigned_leads' },
    { to: '/visitor-logs', label: 'Visitor log', key: 'admin_visitor_logs' },
    { to: '/leads', label: 'Leads (CRM)', key: 'admin_leads' },
  ]
    .filter((l) => canAccessRoute(user.role, l.key))
    .filter((l) => !(user.role === ROLES.PARENT && l.key === 'parent_dashboard'))

  return (
    <div className="space-y-10">
      <div className="relative overflow-hidden rounded-2xl border border-indigo-200/50 bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-800 p-6 text-white shadow-2xl shadow-indigo-900/30 sm:rounded-3xl sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="relative">
          {user.role !== ROLES.TEACHER && user.role !== ROLES.PARENT ? (
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-indigo-200/90">Overview</p>
          ) : null}
          <h1
            className={`text-3xl font-bold tracking-tight sm:text-4xl ${
              user.role === ROLES.TEACHER || user.role === ROLES.PARENT ? '' : 'mt-2'
            }`}
          >
            Welcome back, {user.fullName.split(' ')[0]}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <RoleBadge role={user.role} />
            {user.role !== ROLES.TEACHER && user.role !== ROLES.PARENT ? (
              <span className="text-sm font-medium text-indigo-100/90">
                {hydrated ? 'Your workspace is ready.' : 'Loading your workspace…'}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {user.role === ROLES.DRIVER ? (
        <Card>
          <h2 className="text-lg font-bold text-slate-900">Transport</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Start and end your trip: the driver map uses real device GPS. Parents with the same assigned bus see your
            position on an OpenStreetMap + Leaflet map when a trip is active (same browser demo, or Socket.IO when
            configured) — not Google Maps.
          </p>
          <div className="mt-4">
            <Link
              to="/driver-transport"
              className="inline-flex items-center rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-slate-800"
            >
              Open my trip
            </Link>
          </div>
        </Card>
      ) : null}

      {user.role === ROLES.TEACHER ? <TeacherDashboardOverview /> : null}
      {user.role === ROLES.PARENT ? <ParentDashboardOverview /> : null}

      {user.role === ROLES.DRIVER || user.role === ROLES.TEACHER || user.role === ROLES.PARENT ? null : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat
            label="Teachers"
            value={stats.teachers}
            hint={`${stats.activeTeachers} active`}
            accent="indigo"
          />
          <Stat label="Students" value={stats.students} accent="emerald" />
          <Stat label="Classes" value={stats.classes} accent="amber" />
          <Stat label="Parents / guardians" value={stats.parents} accent="rose" />
        </div>
      )}

      {quickLinks.length && user.role !== ROLES.PARENT ? (
        <Card>
          <h2 className="text-lg font-bold text-slate-900">Shortcuts</h2>
          {user.role !== ROLES.TEACHER && user.role !== ROLES.PARENT ? (
            <p className="mt-1 text-sm text-slate-600">Open a module you have permission to use.</p>
          ) : null}
          <div
            className={`flex flex-wrap gap-3 ${
              user.role === ROLES.TEACHER || user.role === ROLES.PARENT ? 'mt-4' : 'mt-5'
            }`}
          >
            {quickLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="inline-flex items-center rounded-xl border border-slate-200/90 bg-gradient-to-br from-white to-slate-50 px-5 py-2.5 text-sm font-bold text-slate-800 shadow-md shadow-slate-900/[0.04] transition hover:border-indigo-300 hover:from-indigo-50 hover:to-violet-50 hover:text-indigo-950"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  )
}
