import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getNavItemsForRole } from '../utils/navigation'
import { RoleBadge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { MobileDockNav } from '../components/layout/MobileDockNav'

function navClass({ isActive }) {
  return `group flex min-h-[2.75rem] items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 active:scale-[0.99] ${
    isActive
      ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-900/40 ring-1 ring-white/10'
      : 'text-slate-400 hover:bg-slate-800/80 hover:text-white'
  }`
}

export function DashboardLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const items = getNavItemsForRole(user.role)

  const onLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="relative flex min-h-dvh bg-slate-100">
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgb(99_102_241/0.12),transparent)]"
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
        className={`fixed inset-y-0 left-0 z-50 w-[min(20rem,calc(100vw-1.25rem))] transform border-r border-slate-800/80 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 shadow-2xl shadow-slate-950/50 transition-transform duration-300 ease-out lg:static lg:w-72 lg:max-w-none lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
        <div className="flex min-h-[3.5rem] items-center gap-3 border-b border-slate-800/80 px-5 pt-[max(0.75rem,env(safe-area-inset-top,0px))] lg:min-h-[4.25rem] lg:px-6 lg:pt-0">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-lg shadow-indigo-500/30">
            S
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold tracking-tight text-white">EduConsole</p>
            <p className="truncate text-xs font-medium text-indigo-300/90">Operations hub</p>
          </div>
        </div>
        <nav className="space-y-1 overflow-y-auto p-3 pb-24 lg:pb-4" style={{ maxHeight: 'calc(100dvh - 9rem)' }}>
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={navClass}
              end={item.to === '/dashboard' || item.to === '/notifications'}
              onClick={() => setOpen(false)}
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full transition-colors ${
                      isActive ? 'bg-white shadow-sm shadow-white/50' : 'bg-slate-600 group-hover:bg-indigo-400'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 border-t border-slate-800/80 bg-slate-950/80 px-5 py-3 backdrop-blur-sm lg:py-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
            School year 2026
          </p>
        </div>
      </aside>

      <div className="relative flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 pt-[env(safe-area-inset-top,0px)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/70">
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

        <main className="relative flex-1 px-3 py-5 pb-[calc(5.75rem+env(safe-area-inset-bottom,0px))] sm:px-6 sm:py-8 lg:px-10 lg:pb-8">
          <Outlet />
        </main>

        <MobileDockNav role={user.role} onNavigate={() => setOpen(false)} />
      </div>
    </div>
  )
}
