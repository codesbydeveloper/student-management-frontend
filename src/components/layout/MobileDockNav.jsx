import { NavLink } from 'react-router-dom'
import { NavIconTile } from '../icons/NavIcon'
import { getNavItemsForRole } from '../../utils/navigation'

/**
 * Bottom dock for small screens — app-style primary navigation (PWA / mobile).
 * Pass `items` from the parent (same order as sidebar flat list) or `role` to build items here.
 */
export function MobileDockNav({ items: itemsProp, role, onNavigate }) {
  const items = itemsProp ?? getNavItemsForRole(role)

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
