import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useAuth } from '../../context/AuthContext'
import { useAppData } from '../../context/AppDataContext'
import { useConfirm } from '../../context/ConfirmContext'
import { DataTable } from '../../components/DataTable'
import { Modal } from '../../components/Modal'
import { Card, CardHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { Select } from '../../components/ui/Select'
import { Badge } from '../../components/ui/Badge'
import { canManageDrivers } from '../../utils/permissions'
import { email, minLength, required } from '../../utils/validators'
import { createDriver, deleteDriver, fetchDriversList, updateDriver } from '../../api/driversApi'
import { fetchBuses } from '../../api/busesApi'

const SEARCH_KEYS = ['fullName', 'email', 'phone', 'licenseNumber']
const DRIVER_LIST_PAGE = 1
const DRIVER_LIST_LIMIT = 50
const ASSIGNED_BUS_PICKER_PAGE = 1
const ASSIGNED_BUS_PICKER_LIMIT = 20

const emptyForm = () => ({
  fullName: '',
  email: '',
  password: '',
  phone: '',
  licenseNumber: '',
  busId: '',
  active: true,
})

export function DriversModule() {
  const { user, token } = useAuth()
  const { drivers, setDrivers } = useAppData()
  const confirm = useConfirm()
  const manage = canManageDrivers(user.role)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const quickAddOpenedRef = useRef(false)

  /** `null` = use app-data seed/fallback; array = last successful GET /api/drivers. */
  const [apiRows, setApiRows] = useState(null)
  const [listLoading, setListLoading] = useState(false)

  const loadDrivers = useCallback(async () => {
    if (!token) {
      setApiRows(null)
      setListLoading(false)
      return
    }
    setListLoading(true)
    const res = await fetchDriversList(token, { page: DRIVER_LIST_PAGE, limit: DRIVER_LIST_LIMIT })
    setListLoading(false)
    if (res.ok) {
      setApiRows(res.rows)
    } else {
      toast.error(res.error)
      setApiRows(null)
    }
  }, [token])

  useEffect(() => {
    void loadDrivers()
  }, [loadDrivers])

  const displayRows = apiRows !== null ? apiRows : drivers

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [formErrors, setFormErrors] = useState({})
  const [saving, setSaving] = useState(false)
  /** Row id while PATCH isActive is in flight (avoids double-clicks). */
  const [togglingActiveId, setTogglingActiveId] = useState(null)
  /** Row id while DELETE /api/drivers/:id is in flight. */
  const [deletingDriverId, setDeletingDriverId] = useState(null)

  const [pickerBuses, setPickerBuses] = useState([])
  const [busesLoading, setBusesLoading] = useState(false)

  useEffect(() => {
    if (!modalOpen) return
    if (!token) {
      setPickerBuses([])
      setBusesLoading(false)
      return
    }
    let cancelled = false
    setBusesLoading(true)
    setPickerBuses([])
    void (async () => {
      const res = await fetchBuses(token, {
        page: ASSIGNED_BUS_PICKER_PAGE,
        limit: ASSIGNED_BUS_PICKER_LIMIT,
      })
      if (cancelled) return
      setBusesLoading(false)
      if (res.ok) {
        setPickerBuses(res.buses)
      } else {
        setPickerBuses([])
        toast.error(res.error || 'Could not load buses.')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [modalOpen, token])

  const busIdVal = String(form.busId ?? '').trim()
  const busInPickerList = busIdVal !== '' && pickerBuses.some((b) => String(b.id) === busIdVal)
  const showUnlistedBusOption = busIdVal !== '' && !busInPickerList

  const openCreate = useCallback(() => {
    setEditing(null)
    setForm(emptyForm())
    setFormErrors({})
    setModalOpen(true)
  }, [])

  useEffect(() => {
    if (searchParams.get('new') !== '1') {
      quickAddOpenedRef.current = false
      return
    }
    if (!manage || quickAddOpenedRef.current) return
    quickAddOpenedRef.current = true
    openCreate()
    navigate('/drivers', { replace: true })
  }, [manage, searchParams, openCreate, navigate])

  const openEdit = useCallback((row) => {
    setEditing(row)
    setForm({
      fullName: row.fullName ?? '',
      email: row.email ?? '',
      password: '',
      phone: row.phone ?? '',
      licenseNumber: row.licenseNumber ?? '',
      busId: row.busId ?? '',
      active: Boolean(row.active),
    })
    setFormErrors({})
    setModalOpen(true)
  }, [])

  const closeModal = () => {
    setModalOpen(false)
    setEditing(null)
    setFormErrors({})
  }

  const saveDriver = async () => {
    const e1 = required(form.fullName, 'Name')
    const e2 = required(form.email, 'Email')
    const e3 = email(form.email)
    const e4 = required(form.phone, 'Phone')
    const e5 = required(form.licenseNumber, 'License number')
    let ePwd = ''
    if (!editing) {
      ePwd = required(form.password, 'Password') || minLength(form.password, 8, 'Password')
    } else if (form.password.trim()) {
      ePwd = minLength(form.password, 8, 'Password')
    }
    const next = { fullName: e1, email: e2 || e3, phone: e4, licenseNumber: e5, password: ePwd }
    setFormErrors(next)
    if (e1 || e2 || e3 || e4 || e5 || ePwd) return

    const emailNorm = form.email.trim().toLowerCase()
    const dup = displayRows.some(
      (d) =>
        d.email.toLowerCase() === emailNorm && (!editing || String(d.id) !== String(editing.id)),
    )
    if (dup) {
      toast.error('A driver with this email already exists.')
      return
    }

    if (editing) {
      setSaving(true)
      try {
        if (!token) {
          const patch = (d) =>
            String(d.id) === String(editing.id)
              ? {
                  ...d,
                  fullName: form.fullName.trim(),
                  email: emailNorm,
                  phone: form.phone.trim(),
                  licenseNumber: form.licenseNumber.trim(),
                  busId: form.busId.trim() || '',
                  active: form.active,
                  ...(form.password.trim() ? { password: form.password.trim() } : {}),
                }
              : d
          setDrivers((list) => list.map(patch))
          setApiRows((prev) => (prev !== null ? prev.map(patch) : null))
          toast.success('Driver updated.')
          closeModal()
          return
        }

        const patchBody = {
          fullName: form.fullName.trim(),
          email: emailNorm,
          phone: form.phone.trim(),
          licenseNumber: form.licenseNumber.trim(),
          assignedBus: form.busId.trim(),
          isActive: form.active,
        }
        if (form.password.trim()) {
          patchBody.password = form.password.trim()
        }

        const res = await updateDriver(token, editing.id, patchBody)
        if (!res.ok) {
          toast.error(res.error)
          return
        }
        toast.success('Driver updated.')
        closeModal()
        if (apiRows !== null) {
          await loadDrivers()
        } else {
          const patch = (d) =>
            String(d.id) === String(editing.id)
              ? {
                  ...d,
                  fullName: form.fullName.trim(),
                  email: emailNorm,
                  phone: form.phone.trim(),
                  licenseNumber: form.licenseNumber.trim(),
                  busId: form.busId.trim() || '',
                  active: form.active,
                  ...(form.password.trim() ? { password: form.password.trim() } : {}),
                }
              : d
          setDrivers((list) => list.map(patch))
        }
      } finally {
        setSaving(false)
      }
      return
    }

    if (!token) {
      toast.error('Sign in again to create a driver.')
      return
    }

    setSaving(true)
    try {
      const apiRes = await createDriver(token, {
        fullName: form.fullName.trim(),
        email: emailNorm,
        phone: form.phone.trim(),
        licenseNumber: form.licenseNumber.trim(),
        assignedBus: form.busId.trim(),
        isActive: form.active,
        password: form.password.trim(),
      })
      if (!apiRes.ok) {
        toast.error(apiRes.error)
        return
      }
      toast.success('Driver created.')
      closeModal()
      await loadDrivers()
    } finally {
      setSaving(false)
    }
  }

  const removeDriver = useCallback(
    async (row) => {
      const ok = await confirm({
        title: 'Remove driver',
        message: `Remove ${row.fullName} from the directory?`,
        confirmLabel: 'Remove',
        variant: 'danger',
      })
      if (!ok) return

      if (!token) {
        setDrivers((list) => list.filter((d) => String(d.id) !== String(row.id)))
        setApiRows((prev) => (prev !== null ? prev.filter((d) => String(d.id) !== String(row.id)) : null))
        toast.success('Driver removed.')
        return
      }

      setDeletingDriverId(String(row.id))
      try {
        const res = await deleteDriver(token, row.id)
        if (!res.ok) {
          toast.error(res.error)
          return
        }
        toast.success('Driver removed.')
        if (apiRows !== null) {
          await loadDrivers()
        } else {
          setDrivers((list) => list.filter((d) => String(d.id) !== String(row.id)))
        }
      } finally {
        setDeletingDriverId(null)
      }
    },
    [confirm, token, apiRows, loadDrivers, setDrivers],
  )

  const toggleActive = useCallback(
    async (row) => {
      if (!manage) return
      const nextActive = !row.active

      if (!token) {
        const patch = (d) =>
          String(d.id) === String(row.id) ? { ...d, active: nextActive } : d
        setDrivers((list) => list.map(patch))
        setApiRows((prev) => (prev !== null ? prev.map(patch) : null))
        toast.success(`Driver ${row.active ? 'deactivated' : 'activated'}.`)
        return
      }

      const patchBody = {
        fullName: (row.fullName ?? '').trim(),
        email: (row.email ?? '').trim().toLowerCase(),
        phone: (row.phone ?? '').trim(),
        licenseNumber: (row.licenseNumber ?? '').trim(),
        assignedBus: (row.busId ?? '').trim(),
        isActive: nextActive,
      }

      setTogglingActiveId(String(row.id))
      try {
        const res = await updateDriver(token, row.id, patchBody)
        if (!res.ok) {
          toast.error(res.error)
          return
        }
        toast.success(`Driver ${row.active ? 'deactivated' : 'activated'}.`)
        if (apiRows !== null) {
          await loadDrivers()
        } else {
          const patch = (d) =>
            String(d.id) === String(row.id) ? { ...d, active: nextActive } : d
          setDrivers((list) => list.map(patch))
        }
      } finally {
        setTogglingActiveId(null)
      }
    },
    [manage, token, apiRows, loadDrivers, setDrivers],
  )

  const displayAssignedBus = useCallback((row) => {
    const v = (row?.assignedBus ?? row?.busId ?? '').trim()
    return v || '—'
  }, [])

  const columns = useMemo(
    () => [
      { key: 'fullName', header: 'Name', thClassName: 'min-w-[8rem]' },
      { key: 'email', header: 'Email' },
      { key: 'phone', header: 'Phone', tdClassName: 'whitespace-nowrap' },
      { key: 'licenseNumber', header: 'License', tdClassName: 'text-xs' },
      {
        key: 'busId',
        header: 'Assigned bus',
        render: (row) => (
          <span className="font-mono text-sm font-medium text-slate-800">{displayAssignedBus(row)}</span>
        ),
      },
      {
        key: 'active',
        header: 'Status',
        render: (row) => (
          <Badge
            className={
              row.active
                ? 'bg-emerald-50 text-emerald-800 ring-emerald-600/20'
                : 'bg-slate-100 text-slate-600 ring-slate-500/15'
            }
          >
            {row.active ? 'Active' : 'Inactive'}
          </Badge>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        thClassName: 'text-right',
        tdClassName: 'text-right',
        render: (row) =>
          manage ? (
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={togglingActiveId === String(row.id)}
                onClick={() => void toggleActive(row)}
              >
                {togglingActiveId === String(row.id) ? '…' : row.active ? 'Deactivate' : 'Activate'}
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => openEdit(row)}>
                Edit
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                disabled={deletingDriverId === String(row.id)}
                onClick={() => void removeDriver(row)}
              >
                {deletingDriverId === String(row.id) ? '…' : 'Remove'}
              </Button>
            </div>
          ) : (
            <span className="text-xs text-slate-400">—</span>
          ),
      },
    ],
    [manage, displayAssignedBus, openEdit, removeDriver, toggleActive, togglingActiveId, deletingDriverId],
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Bus drivers"
          subtitle="View everyone who drives a school bus. Add new drivers, update their details, turn access on or off, or remove someone from the list."
          action={
            manage ? (
              <Button type="button" onClick={openCreate}>
                Create bus driver
              </Button>
            ) : null
          }
        />

        {listLoading ? (
          <div className="flex min-h-[12rem] items-center justify-center text-sm text-slate-500">
            Loading drivers…
          </div>
        ) : (
          <>
            {displayRows.length === 0 && manage ? (
              <div className="mb-4 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-10 text-center">
                <p className="text-sm font-medium text-slate-700">No bus drivers yet</p>
                <p className="mt-1 max-w-sm text-xs text-slate-500">
                  Your directory is empty. Add a driver to assign buses and trips in transport.
                </p>
                <Button type="button" className="mt-4" onClick={openCreate}>
                  Create bus driver
                </Button>
              </div>
            ) : null}

            <DataTable
              columns={columns}
              rows={displayRows}
              searchKeys={SEARCH_KEYS}
              searchPlaceholder="Search drivers…"
              pageSize={8}
              emptyMessage="No bus drivers yet. Add one to get started."
            />
          </>
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={saving ? () => {} : closeModal}
        title={editing ? 'Edit driver' : 'Add driver'}
        size="md"
        footer={
          <div className="flex w-full flex-wrap justify-end gap-2">
            <Button type="button" variant="secondary" disabled={saving} onClick={closeModal}>
              Cancel
            </Button>
            <Button type="button" disabled={saving} onClick={() => void saveDriver()}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Create bus driver'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="drv-name">Full name</Label>
            <Input
              id="drv-name"
              value={form.fullName}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              className="mt-1.5"
            />
            {formErrors.fullName ? (
              <p className="mt-1 text-xs font-medium text-red-600">{formErrors.fullName}</p>
            ) : null}
          </div>
          <div>
            <Label htmlFor="drv-email">Email</Label>
            <Input
              id="drv-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="mt-1.5"
            />
            {formErrors.email ? (
              <p className="mt-1 text-xs font-medium text-red-600">{formErrors.email}</p>
            ) : null}
          </div>
          <div>
            <Label htmlFor="drv-password">{editing ? 'New password' : 'Password'}</Label>
            <Input
              id="drv-password"
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder={editing ? 'Leave blank to keep current password' : 'At least 8 characters'}
              className="mt-1.5"
              autoComplete="new-password"
            />
            {formErrors.password ? (
              <p className="mt-1 text-xs font-medium text-red-600">{formErrors.password}</p>
            ) : null}
            <p className="mt-1 text-xs text-slate-500">
              {editing
                ? 'Optional. If set, sent on PATCH as password (omit if your API does not accept it).'
                : 'Sent to POST /api/drivers with the rest of the form; the server stores a hash.'}
            </p>
          </div>
          <div>
            <Label htmlFor="drv-phone">Phone</Label>
            <Input
              id="drv-phone"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="mt-1.5"
            />
            {formErrors.phone ? (
              <p className="mt-1 text-xs font-medium text-red-600">{formErrors.phone}</p>
            ) : null}
          </div>
          <div>
            <Label htmlFor="drv-license">License number</Label>
            <Input
              id="drv-license"
              value={form.licenseNumber}
              onChange={(e) => setForm((f) => ({ ...f, licenseNumber: e.target.value }))}
              className="mt-1.5"
            />
            {formErrors.licenseNumber ? (
              <p className="mt-1 text-xs font-medium text-red-600">{formErrors.licenseNumber}</p>
            ) : null}
          </div>
          <div>
            <Label htmlFor="drv-bus">Assigned bus</Label>
            {token ? (
              <>
                <Select
                  id="drv-bus"
                  value={busIdVal}
                  onChange={(e) => setForm((f) => ({ ...f, busId: e.target.value }))}
                  disabled={busesLoading}
                  className="mt-1.5"
                >
                  <option value="">{busesLoading ? 'Loading buses…' : 'No bus assigned'}</option>
                  {pickerBuses.map((b) => (
                    <option key={b.id} value={String(b.id)}>
                      {b.name} — {b.plate}
                    </option>
                  ))}
                  {showUnlistedBusOption ? (
                    <option value={busIdVal}>
                      Current assignment ({displayAssignedBus({ busId: form.busId, assignedBus: form.busId })})
                    </option>
                  ) : null}
                </Select>
                <p className="mt-1 text-xs text-slate-500">
                  Each row shows the bus name and number plate. Leave unassigned if you do not need a bus yet.
                </p>
              </>
            ) : (
              <>
                <Input
                  id="drv-bus"
                  value={form.busId}
                  onChange={(e) => setForm((f) => ({ ...f, busId: e.target.value }))}
                  placeholder="Bus id or plate (sign in to pick from list)"
                  className="mt-1.5"
                  autoComplete="off"
                />
                <p className="mt-1 text-xs text-slate-500">Sign in to choose a bus from the directory.</p>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              id="drv-active"
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <Label htmlFor="drv-active" className="!mb-0 cursor-pointer font-normal">
              Active
            </Label>
          </div>
        </div>
      </Modal>
    </div>
  )
}
