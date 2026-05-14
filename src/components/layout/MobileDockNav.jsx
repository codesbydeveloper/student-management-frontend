import { NavLink } from 'react-router-dom'
import { getNavItemsForRole } from '../../utils/navigation'

function initial(label) {
  return label.trim().charAt(0).toUpperCase()
}

/**
 * Bottom dock for small screens — app-style primary navigation (PWA / mobile).
 */
export function MobileDockNav({ role, onNavigate }) {
  const items = getNavItemsForRole(role)

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-800/90 bg-slate-950/95 shadow-[0_-8px_32px_rgb(0_0_0/0.35)] backdrop-blur-xl supports-[backdrop-filter]:bg-slate-950/88 lg:hidden"
      style={{ paddingBottom: 'max(0.35rem, env(safe-area-inset-bottom, 0px))' }}
      aria-label="Primary navigation"
    >
      <div className="flex overflow-x-auto px-1 pt-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={
              item.to === '/dashboard' ||
              item.to === '/notifications' ||
              item.to === '/parent-bus' ||
              item.to === '/parent/ptm/request' ||
              item.to === '/parent/ptm/history' ||
              item.to === '/driver-transport' ||
              item.to === '/transport/buses' ||
              item.to === '/transport/assign-bus' ||
              item.to === '/drivers' ||
              item.to === '/visitor-logs' ||
              item.to === '/leads' ||
              item.to === '/ptm-requests' ||
              item.to === '/ptm-requests/staff' ||
              item.to === '/ptm-requests/admin/history' ||
              item.to === '/assigned-leads' ||
              item.to === '/create-lead' ||
              item.to === '/settings/login-branding'
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
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-extrabold tracking-tight transition ${
                    isActive
                      ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-900/40 ring-1 ring-white/15'
                      : 'bg-slate-800/90 text-slate-200 ring-1 ring-slate-700/80'
                  }`}
                  aria-hidden
                >
                  {initial(item.label)}
                </span>
                <span className="max-w-[4.75rem] truncate px-0.5 text-center text-[9px] font-bold uppercase leading-tight tracking-wide">
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
