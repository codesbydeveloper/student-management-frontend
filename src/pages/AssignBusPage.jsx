import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useAuth } from '../context/AuthContext'
import { assignStudentsToBus, fetchAllBuses, fetchBusesStudentAssignments } from '../api/busesApi'
import { fetchStudentsPicker } from '../api/studentsApi'
import { SearchableMultiSelect } from '../components/SearchableMultiSelect'
import { Card, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Label } from '../components/ui/Label'
import { Select } from '../components/ui/Select'

const SUMMARY_PAGE_SIZE = 10

/**
 * Admin / principal — assign multiple students to one bus.
 * Buses: GET /api/buses/all. Students: GET /api/students/picker (multi-select).
 */
export default function AssignBusPage() {
  const { token } = useAuth()
  const [busId, setBusId] = useState('')
  const [studentIds, setStudentIds] = useState([])

  const [buses, setBuses] = useState([])
  const [busesLoading, setBusesLoading] = useState(false)
  const [busesError, setBusesError] = useState('')

  const [studentOptions, setStudentOptions] = useState([])
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [studentsError, setStudentsError] = useState('')

  const [saving, setSaving] = useState(false)

  const [summaryPage, setSummaryPage] = useState(1)
  const [summaryRows, setSummaryRows] = useState([])
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryError, setSummaryError] = useState('')
  const [summaryMeta, setSummaryMeta] = useState({
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  })

  const loadPickers = useCallback(async () => {
    if (!token) {
      setBuses([])
      setBusesError('')
      setStudentOptions([])
      setStudentsError('')
      setBusesLoading(false)
      setStudentsLoading(false)
      return
    }
    setBusesLoading(true)
    setStudentsLoading(true)
    setBusesError('')
    setStudentsError('')
    const [busRes, stRes] = await Promise.all([fetchAllBuses(token), fetchStudentsPicker(token)])
    setBusesLoading(false)
    setStudentsLoading(false)
    if (busRes.ok) {
      setBuses(busRes.buses)
    } else {
      setBuses([])
      setBusesError(busRes.error || 'Could not load buses.')
      toast.error(busRes.error)
    }
    if (stRes.ok) {
      setStudentOptions(stRes.options)
    } else {
      setStudentOptions([])
      setStudentsError(stRes.error || 'Could not load students.')
      toast.error(stRes.error)
    }
  }, [token])

  useEffect(() => {
    void loadPickers()
  }, [loadPickers])

  const loadSummary = useCallback(async () => {
    if (!token) {
      setSummaryRows([])
      setSummaryError('')
      setSummaryLoading(false)
      setSummaryMeta({ total: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false })
      return
    }
    setSummaryLoading(true)
    setSummaryError('')
    const res = await fetchBusesStudentAssignments(token, {
      page: summaryPage,
      limit: SUMMARY_PAGE_SIZE,
    })
    setSummaryLoading(false)
    if (res.ok) {
      setSummaryRows(res.rows)
      setSummaryMeta({
        total: res.total,
        totalPages: res.totalPages,
        hasNextPage: res.hasNextPage,
        hasPrevPage: res.hasPrevPage,
      })
    } else {
      setSummaryRows([])
      setSummaryError(res.error || 'Could not load assignments.')
      toast.error(res.error)
    }
  }, [token, summaryPage])

  useEffect(() => {
    void loadSummary()
  }, [loadSummary])

  useEffect(() => {
    setStudentIds((prev) => prev.filter((id) => studentOptions.some((o) => o.value === id)))
  }, [studentOptions])

  const busInList = busId !== '' && buses.some((b) => String(b.id) === busId)

  const canSave =
    Boolean(token) &&
    Boolean(busId) &&
    studentIds.length > 0 &&
    !saving &&
    !busesLoading &&
    !studentsLoading

  const onSave = async () => {
    if (!token) return
    if (!busId) {
      toast.error('Select a bus.')
      return
    }
    if (studentIds.length === 0) {
      toast.error('Select at least one student.')
      return
    }
    setSaving(true)
    try {
      const res = await assignStudentsToBus(token, {
        busId: busId,
        studentIds,
      })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success('Students assigned to bus.')
      setStudentIds([])
      void loadSummary()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Link to="/dashboard">
          <Button type="button" size="sm" variant="secondary">
            Dashboard
          </Button>
        </Link>
        <Link to="/transport-assignments">
          <Button type="button" size="sm" variant="secondary">
            Transport
          </Button>
        </Link>
        <Link to="/transport/buses">
          <Button type="button" size="sm" variant="secondary">
            Create buses
          </Button>
        </Link>
        {token ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={busesLoading || studentsLoading || summaryLoading}
            onClick={() => {
              void loadPickers()
              void loadSummary()
            }}
          >
            {busesLoading || studentsLoading || summaryLoading ? 'Refreshing…' : 'Refresh lists'}
          </Button>
        ) : null}
      </div>

      <div className="scroll-mt-20">
        <Card>
          <CardHeader
            title="Assign bus"
            subtitle="Choose one bus, then select every student who should be on that bus."
          />

        <div className="mx-auto max-w-xl space-y-6">
          {!token ? (
            <p className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
              Sign in as admin or principal to load buses and students from the server.
            </p>
          ) : null}

          <div>
            <Label htmlFor="assign-bus-select">Bus</Label>
            <Select
              id="assign-bus-select"
              className="mt-1.5"
              value={busId}
              disabled={!token || busesLoading}
              onChange={(e) => {
                setBusId(e.target.value)
                setStudentIds([])
              }}
            >
              <option value="">{busesLoading ? 'Loading buses…' : 'Select a bus'}</option>
              {buses.map((b) => (
                <option key={b.id} value={String(b.id)}>
                  {b.name} — {b.plate}
                </option>
              ))}
              {busId && !busInList && !busesLoading ? (
                <option value={busId}>Current selection ({busId})</option>
              ) : null}
            </Select>
            {token ? (
              busesError ? (
                <p className="mt-1.5 text-xs font-medium text-red-600">{busesError}</p>
              ) : !busesLoading && buses.length === 0 ? (
                <p className="mt-1.5 text-xs text-slate-500">No buses in the list.</p>
              ) : (
                <p className="mt-1.5 text-xs text-slate-500">
                  Full bus list from the server. Each option shows name and number plate.
                </p>
              )
            ) : null}
          </div>

          <div>
            <SearchableMultiSelect
              id="assign-students"
              label="Students on this bus"
              options={studentOptions}
              value={studentIds}
              onChange={setStudentIds}
              disabled={!token || !busId || studentsLoading}
              searchPlaceholder="Search students…"
              emptyText={studentsLoading ? 'Loading students…' : 'No students match your search.'}
              collapsedHint={
                !busId ? 'Select a bus first' : studentsLoading ? 'Loading students…' : 'Search and select students…'
              }
            />
            {studentsError && token ? (
              <p className="mt-1.5 text-xs font-medium text-red-600">{studentsError}</p>
            ) : token ? (
              <p className="mt-1.5 text-xs text-slate-500">
                Student list comes from the server. You can select multiple students for the chosen bus.
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-6">
            <Button type="button" disabled={!canSave} onClick={() => void onSave()}>
              {saving ? 'Saving…' : 'Save assignment'}
            </Button>
            <p className="text-xs text-slate-500">
              {canSave
                ? 'Sends bus id and selected student ids to the server.'
                : 'Select a bus and at least one student to save.'}
            </p>
          </div>
        </div>
      </Card>
      </div>

      <Card>
        <CardHeader
          title="Bus ↔ student overview"
          subtitle="From GET /api/buses/student-assignments — how many students are on each bus (10 per page)."
        />

        {!token ? (
          <p className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
            Sign in to load assignment summary from the server.
          </p>
        ) : (
          <div className="space-y-4">
            {summaryError ? (
              <p className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
                {summaryError}
              </p>
            ) : null}

            <div className="overflow-x-auto rounded-xl border border-slate-200/90">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Bus name</th>
                    <th className="px-3 py-2">Driver name</th>
                    <th className="px-3 py-2 text-right">Students assigned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {summaryLoading ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-slate-500">
                        Loading…
                      </td>
                    </tr>
                  ) : summaryRows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-slate-500">
                        No rows for this page.
                      </td>
                    </tr>
                  ) : (
                    summaryRows.map((row, idx) => (
                      <tr key={row.busId != null ? `bus-${row.busId}` : `row-${summaryPage}-${idx}`}>
                        <td className="px-3 py-2 tabular-nums text-slate-700">
                          {(summaryPage - 1) * SUMMARY_PAGE_SIZE + idx + 1}
                        </td>
                        <td className="px-3 py-2 font-medium text-slate-900">{row.busName}</td>
                        <td className="px-3 py-2 text-slate-800">{row.driverName}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-900">
                          {row.studentCount}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {summaryMeta.total > 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
                <span>
                  Page {summaryPage} of {Math.max(1, summaryMeta.totalPages || 1)} · {summaryMeta.total} total
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={!summaryMeta.hasPrevPage || summaryLoading}
                    onClick={() => setSummaryPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={!summaryMeta.hasNextPage || summaryLoading}
                    onClick={() => setSummaryPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </Card>
    </div>
  )
}
