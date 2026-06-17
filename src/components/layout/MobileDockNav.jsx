import { NavLink } from 'react-router-dom'
import { NavIconTile } from '../icons/NavIcon'
import { getNavItemsForRole } from '../../utils/navigation'

/**
 * Bottom dock for small screens — app-style primary navigation (PWA / mobile).
 * Pass `items` from the parent (same order as sidebar flat list) or `role` to build items here.
 */
export function MobileDockNav({ items: itemsProp, role, onNavigate, visible = true, onToggleVisible }) {
  const items = itemsProp ?? getNavItemsForRole(role)

  if (!visible) {
    return (
      <button
        type="button"
        className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border border-slate-700/90 bg-slate-950/95 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-white shadow-lg backdrop-blur-xl active:scale-[0.97] lg:hidden"
        style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
        aria-label="Show bottom navigation"
        onClick={() => onToggleVisible?.(true)}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
          <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
        </svg>
        Show menu
      </button>
    )
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-800/90 bg-slate-950/95 shadow-[0_-8px_32px_rgb(0_0_0/0.35)] backdrop-blur-xl supports-[backdrop-filter]:bg-slate-950/88 lg:hidden"
      style={{ paddingBottom: 'max(0.35rem, env(safe-area-inset-bottom, 0px))' }}
      aria-label="Primary navigation"
    >
      <div className="flex items-center justify-end border-b border-slate-800/80 px-2 py-0.5">
        <button
          type="button"
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400 transition hover:bg-slate-800/80 hover:text-slate-200"
          aria-label="Hide bottom navigation"
          onClick={() => onToggleVisible?.(false)}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Hide
        </button>
      </div>
      <div className="flex overflow-x-auto px-1 pt-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={
              item.to === '/dashboard' ||
              item.to === '/parent-dashboard' ||
              item.to === '/classes' ||
              item.to === '/teachers' ||
              item.to === '/students' ||
              item.to === '/parents' ||
              item.to === '/notifications' ||
              item.to === '/notifications/admin-approval' ||
              item.to === '/notifications/principal-approval' ||
              item.to === '/create-category' ||
              item.to === '/create-notice' ||
              item.to === '/parent-bus' ||
              item.to === '/parent/routes' ||
              item.to === '/parent/ptm/request' ||
              item.to === '/parent/ptm/history' ||
              item.to === '/driver-transport' ||
              item.to === '/driver/map' ||
              item.to === '/driver/routes' ||
              item.to === '/transport/buses' ||
              item.to === '/transport/assign-bus' ||
              item.to === '/transport/bus-rosters' ||
              item.to === '/drivers' ||
              item.to === '/visitor-logs' ||
              item.to === '/leads' ||
              item.to === '/ptm-requests' ||
              item.to === '/ptm-requests/staff' ||
              item.to === '/ptm-requests/admin/history' ||
              item.to === '/notifications/history' ||
              item.to === '/assigned-leads' ||
              item.to === '/create-lead' ||
              item.to === '/settings' ||
              item.to === '/settings/login-branding' ||
              item.to === '/settings/smtp' ||
              item.to === '/profile'
            }
            onClick={() => onNavigate?.()}
            className={({ isActive }) =>
              `flex min-h-[3.25rem] min-w-[4.25rem] shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 transition active:scale-[0.97] ${
                isActive ? 'text-white' : 'text-slate-500 active:text-slate-300'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <NavIconTile navKey={item.key} isActive={isActive} size="lg" />
                <span
                  className={`max-w-[4.75rem] truncate px-0.5 text-center text-[9px] font-bold uppercase leading-tight tracking-wide ${
                    isActive ? 'text-white' : 'text-slate-400'
                  }`}
                >
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
