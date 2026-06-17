import { useEffect, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import { SettingsNav } from '../../components/settings/SettingsNav'
import { SidebarMenuAppearancePreview } from '../../components/settings/SidebarMenuAppearancePreview'
import { CompactColorField } from '../../components/settings/CompactColorField'
import { Card, CardHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Label } from '../../components/ui/Label'
import { NavIconTile } from '../../components/icons/NavIcon'
import {
  getSidebarMenuAppearanceSnapshot,
  getSidebarMenuEditorGroups,
  resetSidebarMenuAppearance,
  setSidebarMenuAppearance,
} from '../../utils/sidebarMenuAppearance'

const MAX_ICON_BYTES = 256 * 1024

function MenuItemEditorRow({ itemKey, menuLabel, value, disabled, isGroup = false, onIconChange, onPickIcon }) {
  const fileId = `sidebar-icon-${itemKey}`

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200/90 bg-slate-50/50 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900">{menuLabel}</p>
        <p className="mt-0.5 text-[11px] text-slate-500">{itemKey}</p>
      </div>

      <div className="flex items-center gap-3">
        <div>
          <Label variant="compact" className="mb-1.5 block text-right sm:text-left">
            Icon
          </Label>
          <div className="flex items-center gap-3">
            {value.customIconUrl ? (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white">
                <img src={value.customIconUrl} alt="" className="h-6 w-6 object-contain" decoding="async" />
              </span>
            ) : (
              <NavIconTile navKey={isGroup ? undefined : itemKey} groupKey={isGroup ? itemKey : undefined} size="sm" />
            )}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              id={fileId}
              disabled={disabled}
              onChange={onPickIcon}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={disabled}
              onClick={() => document.getElementById(fileId)?.click()}
            >
              Change icon
            </Button>
            {value.customIconUrl ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={disabled}
                onClick={() => onIconChange({ customIconUrl: '', iconPreset: '' })}
              >
                Use default
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SidebarMenuAppearanceSettingsPage() {
  const [appearance, setAppearance] = useState(() => getSidebarMenuAppearanceSnapshot())
  const [savedAppearance, setSavedAppearance] = useState(() => getSidebarMenuAppearanceSnapshot())
  const [saving, setSaving] = useState(false)
  const iconBlobRef = useRef(new Map())

  useEffect(() => {
    return () => {
      for (const url of iconBlobRef.current.values()) {
        if (url.startsWith('blob:')) URL.revokeObjectURL(url)
      }
      iconBlobRef.current.clear()
    }
  }, [])

  const groups = getSidebarMenuEditorGroups()
  const hasChanges = JSON.stringify(appearance) !== JSON.stringify(savedAppearance)

  const patchItemIcon = (key, patch) => {
    setAppearance((prev) => ({
      ...prev,
      items: {
        ...prev.items,
        [key]: { ...prev.items[key], ...patch },
      },
    }))
  }

  const onPickIcon = (key) => (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file.')
      return
    }
    if (file.size > MAX_ICON_BYTES) {
      toast.error('Icon is too large (max 256 KB).')
      return
    }
    const prev = iconBlobRef.current.get(key)
    if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev)
    const url = URL.createObjectURL(file)
    iconBlobRef.current.set(key, url)
    patchItemIcon(key, { customIconUrl: url, iconPreset: '' })
  }

  const onSave = async () => {
    setSaving(true)
    try {
      const next = setSidebarMenuAppearance(appearance)
      setAppearance(next)
      setSavedAppearance(next)
      toast.success('Saved in this browser. API sync will be added later.')
    } finally {
      setSaving(false)
    }
  }

  const onReset = () => {
    for (const url of iconBlobRef.current.values()) {
      if (url.startsWith('blob:')) URL.revokeObjectURL(url)
    }
    iconBlobRef.current.clear()
    const next = resetSidebarMenuAppearance()
    setAppearance(next)
    setSavedAppearance(next)
    toast.info('Restored default sidebar menu appearance.')
  }

  const busy = saving

  return (
    <div className="space-y-6">
      <SettingsNav active="sidebar-menu" />

      <Card>
        <CardHeader
          title="Sidebar menu appearance"
          subtitle="Set menu text colors and upload custom icons. Menu names are fixed and cannot be changed here."
        />

        <div className="space-y-8">
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Sidebar preview</p>
              <p className="mt-1 text-sm text-slate-600">
                Hover and click rows to test your colors on the current sidebar background.
              </p>
              <div className="mt-3">
                <SidebarMenuAppearancePreview colors={appearance.colors} items={appearance.items} />
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Menu text colors</p>
              <CompactColorField
                label="Sidebar menu text"
                value={appearance.colors.textColor}
                hint="Normal menu label color."
                onChange={(textColor) =>
                  setAppearance((prev) => ({ ...prev, colors: { ...prev.colors, textColor } }))
                }
              />
              <CompactColorField
                label="Menu hover"
                value={appearance.colors.hoverTextColor}
                hint="Color when the pointer is over a menu item."
                onChange={(hoverTextColor) =>
                  setAppearance((prev) => ({ ...prev, colors: { ...prev.colors, hoverTextColor } }))
                }
              />
              <CompactColorField
                label="Active text"
                value={appearance.colors.activeTextColor}
                hint="Color for the selected menu item."
                onChange={(activeTextColor) =>
                  setAppearance((prev) => ({ ...prev, colors: { ...prev.colors, activeTextColor } }))
                }
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Menu icons</p>
              <p className="mt-1 text-sm text-slate-600">
                Upload a new icon only if you want to replace the default. Menu text names cannot be edited.
              </p>
            </div>

            {groups.map((group) => (
              <div key={group.key} className="space-y-2">
                <p className="text-sm font-bold text-slate-900">{group.label}</p>
                {group.key !== 'dashboard' ? (
                  <MenuItemEditorRow
                    itemKey={group.key}
                    menuLabel={group.label}
                    value={appearance.items[group.key]}
                    disabled={busy}
                    isGroup
                    onIconChange={(patch) => patchItemIcon(group.key, patch)}
                    onPickIcon={onPickIcon(group.key)}
                  />
                ) : null}
                {group.items.map((item) => (
                  <MenuItemEditorRow
                    key={item.key}
                    itemKey={item.key}
                    menuLabel={item.label}
                    value={appearance.items[item.key]}
                    disabled={busy}
                    onIconChange={(patch) => patchItemIcon(item.key, patch)}
                    onPickIcon={onPickIcon(item.key)}
                  />
                ))}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void onSave()} disabled={busy || !hasChanges}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
            <Button type="button" variant="secondary" onClick={onReset} disabled={busy}>
              Reset to defaults
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
