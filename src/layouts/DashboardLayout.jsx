import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ROLES } from '../utils/constants'
import { getNavItemsForRole, getNavSidebarEntries } from '../utils/navigation'
import { RoleBadge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { MobileDockNav } from '../components/layout/MobileDockNav'
import { PwaMobileInstallBanner } from '../components/layout/PwaMobileInstallBanner'
import { HeaderWebPushToggle } from '../components/layout/HeaderWebPushToggle'

function navClass({ isActive }) {
  return `group flex min-h-[2.75rem] items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 active:scale-[0.99] ${
    isActive
      ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-900/40 ring-1 ring-white/10'
      : 'text-slate-400 hover:bg-slate-800/80 hover:text-white'
  }`
}

function navChildClass({ isActive }) {
  return `group flex min-h-[2.5rem] items-center gap-2.5 rounded-lg py-2 pl-9 pr-3 text-[13px] font-semibold transition-all duration-200 active:scale-[0.99] ${
    isActive
      ? 'bg-indigo-600/25 text-white ring-1 ring-indigo-400/35'
      : 'text-slate-500 hover:bg-slate-800/60 hover:text-slate-200'
  }`
}

function navGroupPathActive(
  entryKey,
  academicsPathActive,
  transportPathActive,
  noticesPathActive,
  operationsPathActive,
  ptmPathActive,
) {
  if (entryKey === 'academics') return academicsPathActive
  if (entryKey === 'transport') return transportPathActive
  if (entryKey === 'notices') return noticesPathActive
  if (entryKey === 'operations') return operationsPathActive
  if (entryKey === 'ptm') return ptmPathActive
  return false
}

function navLinkUsesEnd(to) {
  return (
    to === '/dashboard' ||
    to === '/parent-dashboard' ||
    to === '/classes' ||
    to === '/teachers' ||
    to === '/students' ||
    to === '/parents' ||
    to === '/notifications' ||
    to === '/notifications/admin-approval' ||
    to === '/notifications/principal-approval' ||
    to === '/create-category' ||
    to === '/create-notice' ||
    to === '/parent-bus' ||
    to === '/parent/ptm/request' ||
    to === '/parent/ptm/history' ||
    to === '/driver-transport' ||
    to === '/transport/buses' ||
    to === '/transport/assign-bus' ||
    to === '/drivers' ||
    to === '/visitor-logs' ||
    to === '/leads' ||
    to === '/ptm-requests' ||
    to === '/ptm-requests/staff' ||
    to === '/ptm-requests/admin/history' ||
    to === '/notifications/history' ||
    to === '/assigned-leads' ||
    to === '/create-lead' ||
    to === '/settings/login-branding'
  )
}

export function DashboardLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)

  const sidebarEntries = getNavSidebarEntries(user.role)
  const dockItems = getNavItemsForRole(user.role)
  const showHeaderSettings = user.role === ROLES.ADMIN || user.role === ROLES.PRINCIPAL

  const academicsPathActive = ['/classes', '/teachers', '/students', '/parents'].some(
    (base) => location.pathname === base || location.pathname.startsWith(`${base}/`),
  )
  const transportPathActive = ['/drivers', '/transport/assign-bus', '/transport/buses'].some(
    (base) => location.pathname === base || location.pathname.startsWith(`${base}/`),
  )
  const noticesPathActive = ['/create-category', '/create-notice', '/notifications/history'].some(
    (base) => location.pathname === base || location.pathname.startsWith(`${base}/`),
  )
  const operationsPathActive = [
    '/notifications/admin-approval',
    '/notifications/principal-approval',
    '/visitor-logs',
    '/leads',
  ].some((base) => location.pathname === base || location.pathname.startsWith(`${base}/`))
  const ptmPathActive = ['/ptm-requests/staff', '/ptm-requests/admin/history'].some(
    (base) => location.pathname === base || location.pathname.startsWith(`${base}/`),
  )
  const [navGroupOpen, setNavGroupOpen] = useState({
    academics: academicsPathActive,
    transport: transportPathActive,
    notices: noticesPathActive,
    operations: operationsPathActive,
    ptm: ptmPathActive,
  })
  useEffect(() => {
    if (academicsPathActive) setNavGroupOpen((g) => ({ ...g, academics: true }))
  }, [academicsPathActive])
  useEffect(() => {
    if (transportPathActive) setNavGroupOpen((g) => ({ ...g, transport: true }))
  }, [transportPathActive])
  useEffect(() => {
    if (noticesPathActive) setNavGroupOpen((g) => ({ ...g, notices: true }))
  }, [noticesPathActive])
  useEffect(() => {
    if (operationsPathActive) setNavGroupOpen((g) => ({ ...g, operations: true }))
  }, [operationsPathActive])
  useEffect(() => {
    if (ptmPathActive) setNavGroupOpen((g) => ({ ...g, ptm: true }))
  }, [ptmPathActive])

  const onLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="relative flex h-dvh max-h-dvh min-h-0 overflow-hidden bg-slate-200">
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgb(99_102_241/0.08),transparent)]"
        aria-hidden
      />

      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-dvh max-h-dvh w-[min(20rem,calc(100vw-1.25rem))] flex-col overflow-hidden border-r border-slate-800 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 shadow-xl transition-transform duration-300 ease-out lg:static lg:h-dvh lg:w-72 lg:max-w-none lg:shrink-0 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
        <div className="flex shrink-0 items-center gap-3 border-b border-slate-800/80 px-5 py-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))] lg:min-h-[4.25rem] lg:px-6 lg:py-4 lg:pt-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-lg shadow-indigo-500/30">
            S
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold tracking-tight text-white">EduConsole</p>
            <p className="truncate text-xs font-medium text-indigo-300/90">Operations hub</p>
          </div>
        </div>
        <nav className="scrollbar-none min-h-0 flex-1 space-y-1 overflow-x-hidden overflow-y-auto overscroll-contain p-3 lg:p-4">
          {sidebarEntries.map((entry) =>
            entry.type === 'link' ? (
              <NavLink
                key={entry.to}
                to={entry.to}
                className={navClass}
                end={navLinkUsesEnd(entry.to)}
                onClick={() => setOpen(false)}
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full transition-colors ${
                        isActive ? 'bg-white shadow-sm shadow-white/50' : 'bg-slate-600 group-hover:bg-indigo-400'
                      }`}
                    />
                    <span className="truncate">{entry.label}</span>
                  </>
                )}
              </NavLink>
            ) : (
              <div key={entry.key} className="space-y-1">
                <button
                  type="button"
                  className={`flex w-full min-h-[2.75rem] items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-all duration-200 active:scale-[0.99] ${
                    navGroupPathActive(
                      entry.key,
                      academicsPathActive,
                      transportPathActive,
                      noticesPathActive,
                      operationsPathActive,
                      ptmPathActive,
                    )
                      ? 'bg-slate-800/90 text-white ring-1 ring-indigo-500/40'
                      : 'text-slate-400 hover:bg-slate-800/80 hover:text-white'
                  }`}
                  aria-expanded={navGroupOpen[entry.key] ?? false}
                  onClick={() =>
                    setNavGroupOpen((g) => ({
                      ...g,
                      [entry.key]: !g[entry.key],
                    }))
                  }
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center text-slate-500 transition-transform ${
                      navGroupOpen[entry.key] ? 'rotate-90 text-indigo-300' : ''
                    }`}
                    aria-hidden
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="truncate">{entry.label}</span>
                </button>
                {entry.hint ? (
                  <p className="ml-8 mr-2 pb-1.5 text-[10px] leading-snug text-slate-500">{entry.hint}</p>
                ) : null}
                {navGroupOpen[entry.key] ? (
                  <div className="space-y-0.5 border-l border-slate-700/80 pl-1 ml-3">
                    {entry.children.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        className={navChildClass}
                        end={navLinkUsesEnd(item.to)}
                        onClick={() => setOpen(false)}
                      >
                        {({ isActive }) => (
                          <>
                            <span
                              className={`h-1.5 w-1.5 shrink-0 rounded-full transition-colors ${
                                isActive ? 'bg-indigo-300 shadow-sm' : 'bg-slate-600 group-hover:bg-slate-400'
                              }`}
                            />
                            <span className="truncate">{item.label}</span>
                          </>
                        )}
                      </NavLink>
                    ))}
                  </div>
                ) : null}
              </div>
            ),
          )}
        </nav>
        <div className="shrink-0 border-t border-slate-800/80 bg-slate-950/90 px-5 py-3 backdrop-blur-sm lg:py-3.5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
            School year 2026
          </p>
        </div>
      </aside>

      <div className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white lg:shadow-[-12px_0_32px_-8px_rgba(15,23,42,0.12)]">
        <header className="sticky top-0 z-30 shrink-0 border-b border-slate-200 bg-white/95 pt-[env(safe-area-inset-top,0px)] backdrop-blur-md supports-[backdrop-filter]:bg-white/85">
          <div className="flex min-h-[3.5rem] items-center justify-between gap-3 px-3 sm:min-h-[4.25rem] sm:gap-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="min-h-11 shrink-0 border-slate-200/80 px-3 lg:hidden"
                onClick={() => setOpen((v) => !v)}
              >
                Menu
              </Button>
              <div className="hidden min-w-0 sm:block">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-500/90">
                  Live overview
                </p>
                <p className="truncate text-sm font-bold text-slate-900">Institution workspace</p>
              </div>
              <p className="truncate text-sm font-bold text-slate-900 sm:hidden">
                {user.fullName}
                {user.id ? (
                  <span className="ml-1.5 font-mono text-[11px] font-semibold text-slate-500">· #{user.id}</span>
                ) : null}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:gap-4">
              {showHeaderSettings ? (
                <NavLink
                  to="/settings/login-branding"
                  end
                  title="Login page — logo, title, subtitle"
                  aria-label="Login page appearance settings"
                  className={({ isActive }) =>
                    `flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 ${
                      isActive ? 'border-indigo-400 ring-2 ring-indigo-200' : 'border-slate-200/80'
                    }`
                  }
                >
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </NavLink>
              ) : null}
              <HeaderWebPushToggle />
              <div className="hidden text-right sm:block">
                <p className="text-sm font-bold text-slate-900">{user.fullName}</p>
                <div className="mt-1 flex flex-wrap items-center justify-end gap-2">
                  {user.id ? (
                    <span className="rounded-full bg-slate-100/90 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-slate-600 ring-1 ring-slate-200/80">
                      #{user.id}
                    </span>
                  ) : null}
                  <RoleBadge role={user.role} />
                </div>
              </div>
              <Link
                to="/dashboard"
                className="hidden h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-md shadow-indigo-500/25 sm:flex"
              >
                {user.fullName?.charAt(0) ?? '?'}
              </Link>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="min-h-11 px-3 sm:px-4"
                onClick={onLogout}
              >
                Log out
              </Button>
            </div>
          </div>
        </header>

        <PwaMobileInstallBanner />

        <main className="scrollbar-none relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto bg-slate-50/80 px-3 py-5 pb-[calc(5.75rem+env(safe-area-inset-bottom,0px))] sm:px-6 sm:py-8 lg:px-10 lg:pb-8">
          <Outlet />
        </main>

        <MobileDockNav items={dockItems} onNavigate={() => setOpen(false)} />
      </div>
    </div>
  )
}
