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
import { AdminDashboardOverview } from '../components/dashboard/AdminDashboardOverview'
import { NavIconTile } from '../components/icons/NavIcon'

function Stat({ label, value, hint }) {
  return (
    <div className="dash-stat">
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
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
    { to: '/parent-notifications', label: 'School messages', key: 'parent_notifications' },
    { to: '/parent-bus', label: 'Bus tracking', key: 'parent_bus' },
    { to: '/parent/routes', label: 'Routes', key: 'parent_my_transport' },
    { to: '/driver/map', label: 'My trip', key: 'driver_map' },
    { to: '/driver/routes', label: 'Routes', key: 'driver_my_routes' },
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
  ].filter((l) => canAccessRoute(user.role, l.key))

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">
          Welcome back, {user.fullName.split(' ')[0]}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <RoleBadge role={user.role} />
          {user.role !== ROLES.TEACHER && user.role !== ROLES.PARENT ? (
            <span className="text-sm text-slate-600">
              {hydrated ? 'Workspace loaded.' : 'Loading…'}
            </span>
          ) : null}
        </div>
      </div>

      {user.role === ROLES.DRIVER ? (
        <Card>
          <h2 className="flex items-center gap-2.5 text-base font-semibold text-slate-900">
            <NavIconTile navKey="driver_map" size="sm" />
            Transport
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Start and end your route trip. Parents on your bus can see live location while a trip is active.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to="/driver/map"
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              <NavIconTile navKey="driver_map" size="sm" />
              Open my trip
            </Link>
            <Link
              to="/driver/routes"
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              <NavIconTile navKey="driver_my_routes" size="sm" />
              View routes
            </Link>
          </div>
        </Card>
      ) : null}

      {user.role === ROLES.ADMIN || user.role === ROLES.PRINCIPAL ? (
        <AdminDashboardOverview />
      ) : null}
      {user.role === ROLES.TEACHER ? <TeacherDashboardOverview /> : null}
      {user.role === ROLES.PARENT ? <ParentDashboardOverview /> : null}

      {user.role === ROLES.DRIVER ||
      user.role === ROLES.TEACHER ||
      user.role === ROLES.PARENT ||
      user.role === ROLES.ADMIN ||
      user.role === ROLES.PRINCIPAL ? null : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Teachers" value={stats.teachers} hint={`${stats.activeTeachers} active`} />
          <Stat label="Students" value={stats.students} />
          <Stat label="Classes" value={stats.classes} />
          <Stat label="Parents / guardians" value={stats.parents} />
        </div>
      )}

      {quickLinks.length &&
      user.role !== ROLES.PARENT &&
      user.role !== ROLES.ADMIN &&
      user.role !== ROLES.PRINCIPAL ? (
        <Card>
          <h2 className="text-base font-semibold text-slate-900">Shortcuts</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {quickLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <NavIconTile navKey={l.key} size="sm" />
                {l.label}
              </Link>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  )
}
