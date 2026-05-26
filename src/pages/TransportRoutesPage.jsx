import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import { useAuth } from '../context/AuthContext'
import { useConfirm } from '../context/ConfirmContext'
import { fetchAllBuses } from '../api/busesApi'
import { fetchDriversPicker } from '../api/driversApi'
import { fetchPickupPointsPicker } from '../api/pickupPointsApi'
import {
  createTransportRoute,
  deleteTransportRoute,
  fetchTransportRouteById,
  fetchTransportRoutesList,
  updateTransportRoute,
} from '../api/transportRoutesApi'
import { ApprovalListPagination } from '../components/notifications/ApprovalListPagination'
import { PickupPointsRouteField } from '../components/PickupPointsRouteField'
import { SearchableSingleSelect } from '../components/SearchableSingleSelect'
import { Card, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Label } from '../components/ui/Label'
import { Select } from '../components/ui/Select'

const ROUTE_TYPE_OPTIONS = [
  { value: 'pick_up', label: 'Pick up' },
  { value: 'drop', label: 'Drop' },
]

const PAGE_LIMIT = 10

function pickupLabelsFromRoute(route) {
  if (route.pickupPointLabels?.length) return route.pickupPointLabels
  return []
}

function buildPickupLabelMap(ids, labels) {
  const map = {}
  ids.forEach((id, i) => {
    if (labels[i]) map[id] = labels[i]
  })
  return map
}

/**
 * Transport routes — admin and principal.
 */
export default function TransportRoutesPage() {
  const { token } = useAuth()
  const confirm = useConfirm()

  const [routeName, setRouteName] = useState('')
  const [vehicleId, setVehicleId] = useState('')
  const [driverUserId, setDriverUserId] = useState('')
  const [pickupPointIds, setPickupPointIds] = useState([])
  const [routeType, setRouteType] = useState('pick_up')
  const [creating, setCreating] = useState(false)

  const [buses, setBuses] = useState([])
  const [drivers, setDrivers] = useState([])
  const [pickupPointOptions, setPickupPointOptions] = useState([])
  const [pickupPointLabels, setPickupPointLabels] = useState({})
  const [pickupPickerLoading, setPickupPickerLoading] = useState(false)
  const [pickupPickerError, setPickupPickerError] = useState(null)

  const [optionsLoading, setOptionsLoading] = useState(false)
  const [optionsError, setOptionsError] = useState(null)

  const [page, setPage] = useState(1)
  const [routes, setRoutes] = useState([])
  const [total, setTotal] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [listLoading, setListLoading] = useState(false)
  const [listError, setListError] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const [editOpen, setEditOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [editRouteName, setEditRouteName] = useState('')
  const [editVehicleId, setEditVehicleId] = useState('')
  const [editDriverUserId, setEditDriverUserId] = useState('')
  const [editPickupPointIds, setEditPickupPointIds] = useState([])
  const [editRouteType, setEditRouteType] = useState('pick_up')
  const [editPickupPointLabels, setEditPickupPointLabels] = useState({})
  const [editPickupPointOptions, setEditPickupPointOptions] = useState([])
  const [editPickupPickerLoading, setEditPickupPickerLoading] = useState(false)
  const [editPickupPickerError, setEditPickupPickerError] = useState(null)
  const [editLoading, setEditLoading] = useState(false)
  const [editSaving, setEditSaving] = useState(false)

  const pickupSearchTimerRef = useRef(null)
  const editPickupSearchTimerRef = useRef(null)

  const loadPickupPointsPicker = useCallback(
    async (q, { forEdit = false } = {}) => {
      if (!token) {
        if (forEdit) setEditPickupPointOptions([])
        else setPickupPointOptions([])
        return
      }
      if (forEdit) {
        setEditPickupPickerLoading(true)
        setEditPickupPickerError(null)
      } else {
        setPickupPickerLoading(true)
        setPickupPickerError(null)
      }
      const res = await fetchPickupPointsPicker(token, { q })
      if (forEdit) {
        setEditPickupPickerLoading(false)
      } else {
        setPickupPickerLoading(false)
      }
      if (!res.ok) {
        if (forEdit) {
          setEditPickupPointOptions([])
          setEditPickupPickerError(res.error || 'Could not load pick up points.')
        } else {
          setPickupPointOptions([])
          setPickupPickerError(res.error || 'Could not load pick up points.')
        }
        return
      }
      const applyLabels = (prev, options) => {
        const next = { ...prev }
        options.forEach((o) => {
          next[o.value] = o.label
        })
        return next
      }
      if (forEdit) {
        setEditPickupPointOptions(res.options)
        setEditPickupPointLabels((prev) => applyLabels(prev, res.options))
      } else {
        setPickupPointOptions(res.options)
        setPickupPointLabels((prev) => applyLabels(prev, res.options))
      }
    },
    [token],
  )

  const onPickupSearchQuery = useCallback(
    (q) => {
      if (pickupSearchTimerRef.current) window.clearTimeout(pickupSearchTimerRef.current)
      pickupSearchTimerRef.current = window.setTimeout(() => {
        void loadPickupPointsPicker(q)
      }, 300)
    },
    [loadPickupPointsPicker],
  )

  const onPickupPickerOpen = useCallback(
    (open) => {
      if (open) void loadPickupPointsPicker('')
    },
    [loadPickupPointsPicker],
  )

  const onEditPickupSearchQuery = useCallback(
    (q) => {
      if (editPickupSearchTimerRef.current) window.clearTimeout(editPickupSearchTimerRef.current)
      editPickupSearchTimerRef.current = window.setTimeout(() => {
        void loadPickupPointsPicker(q, { forEdit: true })
      }, 300)
    },
    [loadPickupPointsPicker],
  )

  const onEditPickupPickerOpen = useCallback(
    (open) => {
      if (open) void loadPickupPointsPicker('', { forEdit: true })
    },
    [loadPickupPointsPicker],
  )

  const loadOptions = useCallback(async () => {
    if (!token) {
      setBuses([])
      setDrivers([])
      return
    }
    setOptionsLoading(true)
    setOptionsError(null)
    const [busRes, driverRes] = await Promise.all([fetchAllBuses(token), fetchDriversPicker(token)])
    setOptionsLoading(false)

    const errors = []
    if (busRes.ok) {
      setBuses(busRes.buses)
    } else {
      setBuses([])
      errors.push(busRes.error || 'Could not load vehicles.')
    }

    if (driverRes.ok) {
      setDrivers(driverRes.drivers)
    } else {
      setDrivers([])
      errors.push(driverRes.error || 'Could not load drivers.')
    }

    setOptionsError(errors.length ? errors.join(' ') : null)
  }, [token])

  const loadList = useCallback(async () => {
    if (!token) {
      setRoutes([])
      setTotal(0)
      setHasNext(false)
      return
    }
    setListLoading(true)
    setListError(null)
    const res = await fetchTransportRoutesList(token, { page, limit: PAGE_LIMIT })
    setListLoading(false)
    if (!res.ok) {
      setRoutes([])
      setTotal(0)
      setHasNext(false)
      setListError(res.error || 'Could not load routes.')
      return
    }
    setRoutes(res.routes)
    setTotal(res.total)
    setHasNext(res.hasNextPage)
    setPage(res.page)
  }, [token, page])

  useEffect(() => {
    void loadOptions()
  }, [loadOptions])

  useEffect(() => {
    void loadList()
  }, [loadList])

  useEffect(() => {
    return () => {
      if (pickupSearchTimerRef.current) window.clearTimeout(pickupSearchTimerRef.current)
      if (editPickupSearchTimerRef.current) window.clearTimeout(editPickupSearchTimerRef.current)
    }
  }, [])

  const vehicleOptions = useMemo(
    () =>
      buses.map((b) => ({
        value: b.id,
        label: b.plate && b.plate !== '—' ? b.plate : b.name,
        subtext: b.name && b.name !== '—' ? b.name : undefined,
      })),
    [buses],
  )

  const driverOptions = useMemo(
    () =>
      drivers.map((d) => ({
        value: d.userId,
        label: d.fullName || `Driver #${d.userId}`,
        subtext: d.email || undefined,
      })),
    [drivers],
  )

  const mergedPickupPointOptions = useMemo(() => {
    const byId = new Map(pickupPointOptions.map((o) => [o.value, o]))
    pickupPointIds.forEach((id) => {
      if (!byId.has(id)) {
        byId.set(id, {
          value: id,
          label: pickupPointLabels[id] || `Pick up point #${id}`,
        })
      }
    })
    return [...byId.values()]
  }, [pickupPointOptions, pickupPointIds, pickupPointLabels])

  const mergedEditPickupPointOptions = useMemo(() => {
    const byId = new Map(editPickupPointOptions.map((o) => [o.value, o]))
    editPickupPointIds.forEach((id) => {
      if (!byId.has(id)) {
        byId.set(id, {
          value: id,
          label: editPickupPointLabels[id] || `Pick up point #${id}`,
        })
      }
    })
    return [...byId.values()]
  }, [editPickupPointOptions, editPickupPointIds, editPickupPointLabels])

  const syncPickupLabels = useCallback((ids, options, setLabels) => {
    setLabels((prev) => {
      const next = { ...prev }
      options.forEach((o) => {
        if (ids.includes(o.value)) next[o.value] = o.label
      })
      return next
    })
  }, [])

  const onPickupPointIdsChange = useCallback(
    (ids) => {
      setPickupPointIds(ids)
      syncPickupLabels(ids, mergedPickupPointOptions, setPickupPointLabels)
    },
    [mergedPickupPointOptions, syncPickupLabels],
  )

  const onEditPickupPointIdsChange = useCallback(
    (ids) => {
      setEditPickupPointIds(ids)
      syncPickupLabels(ids, mergedEditPickupPointOptions, setEditPickupPointLabels)
    },
    [mergedEditPickupPointOptions, syncPickupLabels],
  )

  const resetForm = () => {
    setRouteName('')
    setVehicleId('')
    setDriverUserId('')
    setPickupPointIds([])
    setRouteType('pick_up')
  }

  const onCreate = async (e) => {
    e.preventDefault()
    if (!token) {
      toast.error('Sign in to add a route.')
      return
    }
    const name = routeName.trim()
    if (!name) {
      toast.error('Enter a route name.')
      return
    }
    if (!vehicleId) {
      toast.error('Select a vehicle number.')
      return
    }
    if (!driverUserId) {
      toast.error('Select a driver.')
      return
    }
    if (!pickupPointIds.length) {
      toast.error('Select at least one pick up point.')
      return
    }
    if (!routeType) {
      toast.error('Select a route type.')
      return
    }

    setCreating(true)
    const res = await createTransportRoute(token, {
      routeName: name,
      busId: vehicleId,
      driverUserId,
      routeType,
      pickupPointIds,
    })
    setCreating(false)
    if (!res.ok) {
      toast.error(res.error || 'Could not create route.')
      return
    }
    toast.success('Route created.')
    resetForm()
    if (page !== 1) {
      setPage(1)
    } else {
      await loadList()
    }
  }

  const closeEdit = () => {
    if (editSaving) return
    setEditOpen(false)
    setEditId(null)
    setEditRouteName('')
    setEditVehicleId('')
    setEditDriverUserId('')
    setEditPickupPointIds([])
    setEditRouteType('pick_up')
    setEditPickupPointLabels({})
    setEditPickupPointOptions([])
    setEditPickupPickerError(null)
    setEditLoading(false)
  }

  const applyRouteToEditForm = (route) => {
    setEditRouteName(route.routeName === '—' ? '' : route.routeName)
    setEditVehicleId(route.busId || '')
    setEditDriverUserId(route.driverUserId || '')
    setEditPickupPointIds(route.pickupPointIds || [])
    setEditRouteType(route.routeType || 'pick_up')
    const labels = buildPickupLabelMap(route.pickupPointIds, route.pickupPointLabels)
    setEditPickupPointLabels(labels)
    setEditPickupPointOptions(
      (route.pickupPointIds || []).map((id) => ({
        value: id,
        label: labels[id] || `Pick up point #${id}`,
      })),
    )
  }

  const openEdit = async (row) => {
    if (!token) return
    setEditOpen(true)
    setEditId(row.id)
    applyRouteToEditForm(row)
    setEditLoading(true)
    const res = await fetchTransportRouteById(token, row.id)
    setEditLoading(false)
    if (res.ok && res.route) {
      applyRouteToEditForm(res.route)
    } else if (!res.ok) {
      toast.error(res.error || 'Could not load route.')
    }
  }

  const onSaveEdit = async (e) => {
    e.preventDefault()
    if (!token || editId == null) return
    const name = editRouteName.trim()
    if (!name) {
      toast.error('Enter a route name.')
      return
    }
    if (!editVehicleId) {
      toast.error('Select a vehicle number.')
      return
    }
    if (!editDriverUserId) {
      toast.error('Select a driver.')
      return
    }
    if (!editPickupPointIds.length) {
      toast.error('Select at least one pick up point.')
      return
    }

    setEditSaving(true)
    const res = await updateTransportRoute(token, editId, {
      routeName: name,
      busId: editVehicleId,
      driverUserId: editDriverUserId,
      routeType: editRouteType,
      pickupPointIds: editPickupPointIds,
    })
    setEditSaving(false)
    if (!res.ok) {
      toast.error(res.error || 'Could not update route.')
      return
    }
    toast.success('Route updated.')
    closeEdit()
    await loadList()
  }

  const onDelete = async (row) => {
    if (!token) return
    const ok = await confirm({
      title: 'Delete route?',
      message: `Remove "${row.routeName}"?`,
      confirmLabel: 'Delete',
      variant: 'danger',
    })
    if (!ok) return
    setDeletingId(row.id)
    const res = await deleteTransportRoute(token, row.id)
    setDeletingId(null)
    if (!res.ok) {
      toast.error(res.error || 'Could not delete route.')
      return
    }
    toast.info('Route deleted.')
    if (routes.length === 1 && page > 1) {
      setPage((p) => p - 1)
    } else {
      await loadList()
    }
  }

  const formDisabled = optionsLoading || !token || creating

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Routes"
          subtitle="Define a route with vehicle, driver, pick up points, and route type (pick up or drop)."
        />
        <form onSubmit={onCreate} className="space-y-5 border-t border-slate-100 px-4 py-6 sm:px-6">
          {optionsError ? (
            <div className="rounded-xl border border-amber-200/90 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
              <p>{optionsError}</p>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="mt-3"
                onClick={() => void loadOptions()}
              >
                Retry loading options
              </Button>
            </div>
          ) : null}

          <div className="grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label htmlFor="route-name">Route name</Label>
              <Input
                id="route-name"
                value={routeName}
                onChange={(e) => setRouteName(e.target.value)}
                placeholder="e.g. Morning route A, Sector 12 loop"
                className="mt-1.5"
                autoComplete="off"
                disabled={formDisabled}
              />
            </div>

            <div className="min-w-0">
              <SearchableSingleSelect
                id="route-vehicle"
                label="Vehicle number"
                options={vehicleOptions}
                value={vehicleId}
                onChange={setVehicleId}
                disabled={formDisabled}
                placeholder={optionsLoading ? 'Loading vehicles…' : 'Search vehicle / plate'}
                searchPlaceholder="Search plate or bus name…"
                emptyText="No buses found. Create buses first."
              />
            </div>

            <div className="min-w-0">
              <SearchableSingleSelect
                id="route-driver"
                label="Driver"
                options={driverOptions}
                value={driverUserId}
                onChange={setDriverUserId}
                disabled={formDisabled}
                placeholder={optionsLoading ? 'Loading drivers…' : 'Search and select driver'}
                searchPlaceholder="Search driver name…"
                emptyText="No drivers found."
              />
            </div>

            <div>
              <Label htmlFor="route-type">Route type</Label>
              <Select
                id="route-type"
                value={routeType}
                onChange={(e) => setRouteType(e.target.value)}
                className="mt-1.5"
                disabled={formDisabled}
              >
                {ROUTE_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="md:col-span-2">
              <PickupPointsRouteField
                id="route-pickup-points"
                options={mergedPickupPointOptions}
                value={pickupPointIds}
                onChange={onPickupPointIdsChange}
                routeType={routeType}
                disabled={formDisabled}
                filterLocally={false}
                optionsLoading={pickupPickerLoading}
                onSearchQueryChange={onPickupSearchQuery}
                onOpenChange={onPickupPickerOpen}
                searchPlaceholder="Type to search locations (e.g. mani)…"
                emptyText={
                  pickupPickerError ||
                  (pickupPickerLoading ? 'Loading…' : 'No pick up points found. Try another search.')
                }
                pickerError={pickupPickerError}
                onRetryPicker={() => void loadPickupPointsPicker('')}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={formDisabled}>
              {creating ? 'Saving…' : 'Add route'}
            </Button>
            <Button type="button" variant="secondary" onClick={resetForm} disabled={formDisabled}>
              Clear form
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader
          title="Saved routes"
          subtitle={total > 0 ? `${total} total` : 'No routes added yet.'}
          action={
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={listLoading || !token}
              onClick={() => void loadList()}
            >
              {listLoading ? 'Refreshing…' : 'Refresh'}
            </Button>
          }
        />
        <div className="border-t border-slate-100 px-4 py-4 sm:px-6">
          {listError ? (
            <div className="mb-4 rounded-xl border border-amber-200/90 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
              {listError}
            </div>
          ) : null}

          {listLoading && routes.length === 0 && !listError ? (
            <p className="text-sm text-slate-500">Loading routes…</p>
          ) : null}

          {!listLoading && routes.length === 0 && !listError ? (
            <p className="text-sm text-slate-500">Use the form above to add your first route.</p>
          ) : null}

          {routes.length > 0 ? (
            <>
              <div className="overflow-x-auto rounded-xl border border-slate-200/90">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Route name</th>
                      <th className="px-4 py-3">Vehicle</th>
                      <th className="px-4 py-3">Driver</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Pick up points</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {routes.map((row) => (
                      <tr key={row.id} className="text-slate-800">
                        <td className="px-4 py-3 font-medium">{row.routeName}</td>
                        <td className="px-4 py-3">{row.vehicleLabel}</td>
                        <td className="px-4 py-3">{row.driverLabel}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-800">
                            {row.routeTypeLabel}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {pickupLabelsFromRoute(row).join(', ') || '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              disabled={deletingId != null}
                              onClick={() => void openEdit(row)}
                            >
                              Edit
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              disabled={deletingId != null}
                              onClick={() => void onDelete(row)}
                            >
                              {deletingId === row.id ? 'Deleting…' : 'Delete'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ApprovalListPagination
                page={page}
                total={total}
                limit={PAGE_LIMIT}
                hasNext={hasNext}
                loading={listLoading}
                onPrev={() => setPage((p) => Math.max(1, p - 1))}
                onNext={() => setPage((p) => p + 1)}
                emptyLabel="No routes on this page"
              />
            </>
          ) : null}
        </div>
      </Card>

      {editOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !editSaving) closeEdit()
          }}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-route-title"
          >
            <h2 id="edit-route-title" className="text-lg font-bold text-slate-900">
              Edit route
            </h2>
            {editLoading ? (
              <p className="mt-4 text-sm text-slate-500">Loading route details…</p>
            ) : (
              <form onSubmit={onSaveEdit} className="mt-4 space-y-4">
                <div>
                  <Label htmlFor="edit-route-name">Route name</Label>
                  <Input
                    id="edit-route-name"
                    value={editRouteName}
                    onChange={(e) => setEditRouteName(e.target.value)}
                    className="mt-1.5"
                    disabled={editSaving}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="min-w-0">
                    <SearchableSingleSelect
                      id="edit-route-vehicle"
                      label="Vehicle number"
                      options={vehicleOptions}
                      value={editVehicleId}
                      onChange={setEditVehicleId}
                      disabled={editSaving || optionsLoading}
                      placeholder="Search vehicle / plate"
                      searchPlaceholder="Search plate or bus name…"
                      emptyText="No buses found."
                    />
                  </div>
                  <div className="min-w-0">
                    <SearchableSingleSelect
                      id="edit-route-driver"
                      label="Driver"
                      options={driverOptions}
                      value={editDriverUserId}
                      onChange={setEditDriverUserId}
                      disabled={editSaving || optionsLoading}
                      placeholder="Search and select driver"
                      searchPlaceholder="Search driver name…"
                      emptyText="No drivers found."
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="edit-route-type">Route type</Label>
                  <Select
                    id="edit-route-type"
                    value={editRouteType}
                    onChange={(e) => setEditRouteType(e.target.value)}
                    className="mt-1.5"
                    disabled={editSaving}
                  >
                    {ROUTE_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <PickupPointsRouteField
                    id="edit-route-pickup-points"
                    options={mergedEditPickupPointOptions}
                    value={editPickupPointIds}
                    onChange={onEditPickupPointIdsChange}
                    routeType={editRouteType}
                    disabled={editSaving}
                    filterLocally={false}
                    optionsLoading={editPickupPickerLoading}
                    onSearchQueryChange={onEditPickupSearchQuery}
                    onOpenChange={onEditPickupPickerOpen}
                    searchPlaceholder="Type to search locations…"
                    emptyText={
                      editPickupPickerError ||
                      (editPickupPickerLoading ? 'Loading…' : 'No pick up points found.')
                    }
                    pickerError={editPickupPickerError}
                    onRetryPicker={() => void loadPickupPointsPicker('', { forEdit: true })}
                  />
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  <Button type="submit" disabled={editSaving}>
                    {editSaving ? 'Saving…' : 'Save changes'}
                  </Button>
                  <Button type="button" variant="secondary" onClick={closeEdit} disabled={editSaving}>
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
