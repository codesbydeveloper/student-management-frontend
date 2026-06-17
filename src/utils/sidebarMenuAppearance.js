import { getStaffAssignableNavGroups } from './navigation'

import { coerceHexColor } from './appBackgroundTheme'

const STORAGE_KEY = 'sm_sidebar_menu_appearance_v1'
const EVENT = 'sm-sidebar-menu-appearance-changed'

export const DEFAULT_SIDEBAR_MENU_COLORS = {
  textColor: '#f1f5f9',
  hoverTextColor: '#ffffff',
  activeTextColor: '#fef08a',
}

/** Built-in icon keys (matches NavIcon). Empty = use default for that menu key. */
export const SIDEBAR_ICON_PRESET_OPTIONS = [
  { value: '', label: 'Default for this menu' },
  { value: 'dashboard', label: 'Dashboard gauge' },
  { value: 'classes', label: 'School / classes' },
  { value: 'teachers', label: 'Teacher' },
  { value: 'students', label: 'Students' },
  { value: 'parents', label: 'Parents group' },
  { value: 'admins', label: 'Admin user' },
  { value: 'principals', label: 'Crown / principal' },
  { value: 'front_office_staff', label: 'Front desk' },
  { value: 'coordinators', label: 'Building / coordinator' },
  { value: 'transport_live_buses', label: 'Bus' },
  { value: 'transport_trip_history', label: 'History' },
  { value: 'drivers', label: 'Steering wheel' },
  { value: 'admin_create_buses', label: 'Create bus' },
  { value: 'admin_pick_up_points', label: 'Map pin' },
  { value: 'admin_transport_routes', label: 'Route' },
  { value: 'create_category', label: 'Category' },
  { value: 'create_notice', label: 'Bell / notice' },
  { value: 'notice_history', label: 'Notice history' },
  { value: 'admin_visitor_logs', label: 'Visitor log' },
  { value: 'admin_leads', label: 'Leads / CRM' },
  { value: 'staff_ptm_requests', label: 'PTM calendar' },
  { value: 'staff_ptm_history', label: 'PTM history' },
]

function defaultLabelForKey(key) {
  for (const group of getStaffAssignableNavGroups()) {
    if (group.key === key) return group.label
    const child = group.items.find((item) => item.key === key)
    if (child) return child.label
  }
  return key
}

function buildDefaultItems() {
  /** @type {Record<string, { label: string, iconPreset: string, customIconUrl: string }>} */
  const items = {}
  for (const group of getStaffAssignableNavGroups()) {
    if (group.key !== 'dashboard') {
      items[group.key] = {
        label: group.label,
        iconPreset: '',
        customIconUrl: '',
      }
    }
    for (const child of group.items) {
      items[child.key] = {
        label: child.label,
        iconPreset: '',
        customIconUrl: '',
      }
    }
  }
  return items
}

export const DEFAULT_SIDEBAR_MENU_APPEARANCE = {
  colors: { ...DEFAULT_SIDEBAR_MENU_COLORS },
  items: buildDefaultItems(),
}

function normalizeItem(raw, key) {
  const fallbackLabel = defaultLabelForKey(key)
  return {
    label: String(raw?.label ?? fallbackLabel).trim().slice(0, 80) || fallbackLabel,
    iconPreset: String(raw?.iconPreset ?? '').trim(),
    customIconUrl: String(raw?.customIconUrl ?? '').trim().slice(0, 2048),
  }
}

export function normalizeSidebarMenuAppearance(raw) {
  const defaults = DEFAULT_SIDEBAR_MENU_APPEARANCE
  const colors = {
    textColor: coerceHexColor(raw?.colors?.textColor, defaults.colors.textColor),
    hoverTextColor: coerceHexColor(raw?.colors?.hoverTextColor, defaults.colors.hoverTextColor),
    activeTextColor: coerceHexColor(raw?.colors?.activeTextColor, defaults.colors.activeTextColor),
  }
  const items = { ...defaults.items }
  const rawItems = raw?.items && typeof raw.items === 'object' ? raw.items : {}
  for (const key of Object.keys(items)) {
    items[key] = normalizeItem(rawItems[key], key)
  }
  return { colors, items }
}

export function getSidebarMenuAppearanceSnapshot() {
  if (typeof window === 'undefined') return normalizeSidebarMenuAppearance(DEFAULT_SIDEBAR_MENU_APPEARANCE)
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return normalizeSidebarMenuAppearance(DEFAULT_SIDEBAR_MENU_APPEARANCE)
    return normalizeSidebarMenuAppearance(JSON.parse(raw))
  } catch {
    return normalizeSidebarMenuAppearance(DEFAULT_SIDEBAR_MENU_APPEARANCE)
  }
}

export function setSidebarMenuAppearance(appearance) {
  const next = normalizeSidebarMenuAppearance(appearance)
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    window.dispatchEvent(new Event(EVENT))
  }
  return next
}

export function resetSidebarMenuAppearance() {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(STORAGE_KEY)
    window.dispatchEvent(new Event(EVENT))
  }
  return normalizeSidebarMenuAppearance(DEFAULT_SIDEBAR_MENU_APPEARANCE)
}

export function getSidebarMenuEditorGroups() {
  return getStaffAssignableNavGroups()
}

export function subscribeSidebarMenuAppearance(listener) {
  if (typeof window === 'undefined') return () => {}
  const handler = () => listener()
  window.addEventListener(EVENT, handler)
  return () => window.removeEventListener(EVENT, handler)
}
