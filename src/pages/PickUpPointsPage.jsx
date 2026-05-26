import { useCallback, useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { useAuth } from '../context/AuthContext'
import { useConfirm } from '../context/ConfirmContext'
import { fetchStudentsBusOverview } from '../api/studentsApi'
import {
  createPickupPoint,
  deletePickupPoint,
  fetchPickupPointById,
  fetchPickupPointsList,
  updatePickupPoint,
} from '../api/pickupPointsApi'
import { PickupPointLocationFields } from '../components/transport/PickupPointLocationFields'
import { SearchableSingleSelect } from '../components/SearchableSingleSelect'
import { buildPickupGeocodeQuery, geocodeAddress } from '../utils/nominatimGeocode'
import { ApprovalListPagination } from '../components/notifications/ApprovalListPagination'
import { Card, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Label } from '../components/ui/Label'

const PAGE_LIMIT = 10

function formatTimeForDisplay(value) {
  if (!value) return '—'
  const [h, m] = value.split(':')
  const hour = Number(h)
  if (Number.isNaN(hour)) return value
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const h12 = hour % 12 || 12
  return `${h12}:${m || '00'} ${ampm}`
}

export default function PickUpPointsPage() {
  const { token } = useAuth()
  const confirm = useConfirm()

  const [pointName, setPointName] = useState('')
  const [location, setLocation] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [latitude, setLatitude] = useState(null)
  const [longitude, setLongitude] = useState(null)
  const [mapSearchLoading, setMapSearchLoading] = useState(false)
  const [pickUpTime, setPickUpTime] = useState('')
  const [dropTime, setDropTime] = useState('')
  const [studentId, setStudentId] = useState('')
  const [creating, setCreating] = useState(false)

  const [studentOptions, setStudentOptions] = useState([])
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [studentsError, setStudentsError] = useState(null)

  const [page, setPage] = useState(1)
  const [points, setPoints] = useState([])
  const [total, setTotal] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [listLoading, setListLoading] = useState(false)
  const [listError, setListError] = useState(null)

  const [editOpen, setEditOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [editPointName, setEditPointName] = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [editCity, setEditCity] = useState('')
  const [editState, setEditState] = useState('')
  const [editLatitude, setEditLatitude] = useState(null)
  const [editLongitude, setEditLongitude] = useState(null)
  const [editMapSearchLoading, setEditMapSearchLoading] = useState(false)
  const [editPickUpTime, setEditPickUpTime] = useState('')
  const [editDropTime, setEditDropTime] = useState('')
  const [editStudentLabel, setEditStudentLabel] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [editSaving, setEditSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const loadStudents = useCallback(async () => {
    if (!token) {
      setStudentOptions([])
      return
    }
    setStudentsLoading(true)
    setStudentsError(null)
    const res = await fetchStudentsBusOverview(token)
    setStudentsLoading(false)
    if (!res.ok) {
      setStudentOptions([])
      setStudentsError(res.error || 'Could not load students.')
      return
    }
    setStudentOptions(res.options)
  }, [token])

  const loadList = useCallback(async () => {
    if (!token) {
      setPoints([])
      setTotal(0)
      setHasNext(false)
      return
    }
    setListLoading(true)
    setListError(null)
    const res = await fetchPickupPointsList(token, { page, limit: PAGE_LIMIT })
    setListLoading(false)
    if (!res.ok) {
      setPoints([])
      setTotal(0)
      setHasNext(false)
      setListError(res.error || 'Could not load pick up points.')
      return
    }
    setPoints(res.points)
    setTotal(res.total)
    setHasNext(res.hasNextPage)
    setPage(res.page)
  }, [token, page])

  useEffect(() => {
    void loadStudents()
  }, [loadStudents])

  useEffect(() => {
    void loadList()
  }, [loadList])

  const resetForm = () => {
    setPointName('')
    setLocation('')
    setCity('')
    setState('')
    setLatitude(null)
    setLongitude(null)
    setPickUpTime('')
    setDropTime('')
    setStudentId('')
  }

  const findOnMap = async (fields, { forEdit = false } = {}) => {
    const q = buildPickupGeocodeQuery(fields)
    if (!q) {
      toast.error('Enter address, city/state, or pick up point name to search.')
      return
    }
    if (forEdit) setEditMapSearchLoading(true)
    else setMapSearchLoading(true)
    const res = await geocodeAddress(q)
    if (forEdit) setEditMapSearchLoading(false)
    else setMapSearchLoading(false)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    if (forEdit) {
      setEditLatitude(res.lat)
      setEditLongitude(res.lng)
    } else {
      setLatitude(res.lat)
      setLongitude(res.lng)
    }
    toast.success('Location placed on map.')
  }

  const coordsValid = (lat, lng) => Number.isFinite(lat) && Number.isFinite(lng)

  const onCreate = async (e) => {
    e.preventDefault()
    if (!token) {
      toast.error('Sign in to add a pick up point.')
      return
    }
    const pickUpPointName = pointName.trim()
    if (!pickUpPointName) {
      toast.error('Enter a pick up point name.')
      return
    }
    if (!pickUpTime) {
      toast.error('Select a pick-up time.')
      return
    }
    if (!dropTime) {
      toast.error('Select a drop time.')
      return
    }
    if (!studentId) {
      toast.error('Select a student.')
      return
    }
    if (!coordsValid(latitude, longitude)) {
      toast.error('Place the stop on the map (click the map or use Find on map).')
      return
    }

    setCreating(true)
    const res = await createPickupPoint(token, {
      location: pickUpPointName,
      latitude,
      longitude,
      pickupTime: pickUpTime,
      dropTime,
      studentId,
    })
    setCreating(false)
    if (!res.ok) {
      toast.error(res.error || 'Could not create pick up point.')
      return
    }
    toast.success('Pick up point created.')
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
    setEditPointName('')
    setEditLocation('')
    setEditCity('')
    setEditState('')
    setEditLatitude(null)
    setEditLongitude(null)
    setEditPickUpTime('')
    setEditDropTime('')
    setEditStudentLabel('')
    setEditLoading(false)
  }

  const pickUpPointDisplayName = (row) => {
    if (row.name && row.name !== '—') return row.name
    if (row.location && row.location !== '—') return row.location
    return ''
  }

  const openEdit = async (row) => {
    if (!token) return
    setEditOpen(true)
    setEditId(row.id)
    setEditPointName(pickUpPointDisplayName(row))
    setEditLocation(row.location === '—' ? '' : row.location)
    setEditCity(row.city || '')
    setEditState(row.state || '')
    setEditPickUpTime(row.pickupTime)
    setEditDropTime(row.dropTime)
    setEditStudentLabel(row.studentLabel)
    setEditLatitude(row.latitude ?? null)
    setEditLongitude(row.longitude ?? null)
    setEditLoading(true)
    const res = await fetchPickupPointById(token, row.id)
    setEditLoading(false)
    if (res.ok && res.point) {
      setEditPointName(pickUpPointDisplayName(res.point))
      setEditLocation(res.point.location === '—' ? '' : res.point.location)
      setEditCity(res.point.city || '')
      setEditState(res.point.state || '')
      setEditPickUpTime(res.point.pickupTime)
      setEditDropTime(res.point.dropTime)
      setEditStudentLabel(res.point.studentLabel)
      setEditLatitude(res.point.latitude ?? null)
      setEditLongitude(res.point.longitude ?? null)
    } else if (!res.ok) {
      toast.error(res.error || 'Could not load pick up point.')
    }
  }

  const onSaveEdit = async (e) => {
    e.preventDefault()
    if (!token || editId == null) return
    const pickUpPointName = editPointName.trim()
    if (!pickUpPointName) {
      toast.error('Enter a pick up point name.')
      return
    }
    if (!editPickUpTime || !editDropTime) {
      toast.error('Pick-up and drop times are required.')
      return
    }
    if (!coordsValid(editLatitude, editLongitude)) {
      toast.error('Place the stop on the map (click the map or use Find on map).')
      return
    }
    setEditSaving(true)
    const res = await updatePickupPoint(token, editId, {
      location: pickUpPointName,
      latitude: editLatitude,
      longitude: editLongitude,
      pickupTime: editPickUpTime,
      dropTime: editDropTime,
    })
    setEditSaving(false)
    if (!res.ok) {
      toast.error(res.error || 'Could not update pick up point.')
      return
    }
    toast.success('Pick up point updated.')
    closeEdit()
    await loadList()
  }

  const onDelete = async (row) => {
    if (!token) return
    const ok = await confirm({
      title: 'Delete pick up point?',
      message: `Remove "${row.name !== '—' ? row.name : row.location}" for ${row.studentLabel}?`,
      confirmLabel: 'Delete',
      variant: 'danger',
    })
    if (!ok) return
    setDeletingId(row.id)
    const res = await deletePickupPoint(token, row.id)
    setDeletingId(null)
    if (!res.ok) {
      toast.error(res.error || 'Could not delete pick up point.')
      return
    }
    toast.info('Pick up point deleted.')
    if (points.length === 1 && page > 1) {
      setPage((p) => p - 1)
    } else {
      await loadList()
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Pick up points"
          subtitle="Set address, city, and state on the map, then pick up point name and coordinates. Add pick-up/drop times and a student."
        />
        <form onSubmit={onCreate} className="space-y-5 border-t border-slate-100 px-4 py-6 sm:px-6">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <PickupPointLocationFields
                idPrefix="pickup"
                pointName={pointName}
                onPointNameChange={setPointName}
                location={location}
                onLocationChange={setLocation}
                city={city}
                onCityChange={setCity}
                state={state}
                onStateChange={setState}
                latitude={latitude}
                longitude={longitude}
                onCoordsChange={({ latitude: lat, longitude: lng }) => {
                  setLatitude(lat)
                  setLongitude(lng)
                }}
                mapSearchLoading={mapSearchLoading}
                disabled={creating}
                onFindOnMap={() =>
                  void findOnMap({ name: pointName, location, city, state })
                }
              />
            </div>

            <div>
              <Label htmlFor="pickup-time">Pick up time</Label>
              <Input
                id="pickup-time"
                type="time"
                value={pickUpTime}
                onChange={(e) => setPickUpTime(e.target.value)}
                className="mt-1.5"
                disabled={creating}
              />
            </div>

            <div>
              <Label htmlFor="drop-time">Drop time</Label>
              <Input
                id="drop-time"
                type="time"
                value={dropTime}
                onChange={(e) => setDropTime(e.target.value)}
                className="mt-1.5"
                disabled={creating}
              />
            </div>

            <div className="md:col-span-2">
              <SearchableSingleSelect
                id="pickup-student"
                label="Student"
                options={studentOptions}
                value={studentId}
                onChange={setStudentId}
                disabled={studentsLoading || !token || creating}
                placeholder={studentsLoading ? 'Loading students…' : 'Search and select a student'}
                searchPlaceholder="Search by name…"
                emptyText={studentsError || 'No students found.'}
              />
              {studentsError ? (
                <p className="mt-2 text-sm text-amber-800">
                  {studentsError}{' '}
                  <button
                    type="button"
                    className="font-semibold underline"
                    onClick={() => void loadStudents()}
                  >
                    Retry
                  </button>
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={creating}>
              {creating ? 'Saving…' : 'Add pick up point'}
            </Button>
            <Button type="button" variant="secondary" onClick={resetForm} disabled={creating}>
              Clear form
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader
          title="All pick up points"
          subtitle={total > 0 ? `${total} total` : 'No pick up points yet.'}
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

          {listLoading && points.length === 0 && !listError ? (
            <p className="text-sm text-slate-500">Loading pick up points…</p>
          ) : null}

          {!listLoading && points.length === 0 && !listError ? (
            <p className="text-sm text-slate-500">Use the form above to add your first pick up point.</p>
          ) : null}

          {points.length > 0 ? (
            <>
              <div className="overflow-x-auto rounded-xl border border-slate-200/90">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    <tr>
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Location</th>
                      <th className="px-4 py-3">Pick up</th>
                      <th className="px-4 py-3">Drop</th>
                      <th className="px-4 py-3">Student</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {points.map((row, idx) => (
                      <tr key={row.id} className="text-slate-800">
                        <td className="px-4 py-3 tabular-nums text-slate-600">
                          {(page - 1) * PAGE_LIMIT + idx + 1}
                        </td>
                        <td className="px-4 py-3 font-medium">{row.name}</td>
                        <td className="px-4 py-3 text-slate-600">{row.location}</td>
                        <td className="px-4 py-3">{formatTimeForDisplay(row.pickupTime)}</td>
                        <td className="px-4 py-3">{formatTimeForDisplay(row.dropTime)}</td>
                        <td className="px-4 py-3">{row.studentLabel}</td>
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
                emptyLabel="No pick up points on this page"
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
            aria-labelledby="edit-pickup-title"
          >
            <h2 id="edit-pickup-title" className="text-lg font-bold text-slate-900">
              Edit pick up point
            </h2>
            {editLoading ? (
              <p className="mt-4 text-sm text-slate-500">Loading details…</p>
            ) : (
              <form onSubmit={onSaveEdit} className="mt-4 space-y-4">
                <PickupPointLocationFields
                  idPrefix="edit-pickup"
                  pointName={editPointName}
                  onPointNameChange={setEditPointName}
                  location={editLocation}
                  onLocationChange={setEditLocation}
                  city={editCity}
                  onCityChange={setEditCity}
                  state={editState}
                  onStateChange={setEditState}
                  latitude={editLatitude}
                  longitude={editLongitude}
                  onCoordsChange={({ latitude: lat, longitude: lng }) => {
                    setEditLatitude(lat)
                    setEditLongitude(lng)
                  }}
                  mapSearchLoading={editMapSearchLoading}
                  disabled={editSaving}
                  onFindOnMap={() =>
                    void findOnMap(
                      {
                        name: editPointName,
                        location: editLocation,
                        city: editCity,
                        state: editState,
                      },
                      { forEdit: true },
                    )
                  }
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="edit-pickup-time">Pick up time</Label>
                    <Input
                      id="edit-pickup-time"
                      type="time"
                      value={editPickUpTime}
                      onChange={(e) => setEditPickUpTime(e.target.value)}
                      className="mt-1.5"
                      disabled={editSaving}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-drop-time">Drop time</Label>
                    <Input
                      id="edit-drop-time"
                      type="time"
                      value={editDropTime}
                      onChange={(e) => setEditDropTime(e.target.value)}
                      className="mt-1.5"
                      disabled={editSaving}
                    />
                  </div>
                </div>
                <div>
                  <Label>Student</Label>
                  <p className="mt-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    {editStudentLabel || '—'}
                  </p>
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
