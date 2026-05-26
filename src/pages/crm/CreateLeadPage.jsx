import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useAuth } from '../../context/AuthContext'
import { Card, CardHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { PhoneInput } from '../../components/ui/PhoneInput'
import { isPhone10Digits, sanitizePhoneDigits } from '../../utils/phoneInput'
import { createLead, fetchMyLeads } from '../../api/leadsApi'
import { fetchClassesSummary } from '../../api/classesApi'
import { LEAD_STAGE_LABELS } from '../../data/phase6Constants'
import { ROLES } from '../../utils/constants'

const MINE_PAGE_LIMIT = 10

function fmtDate(iso) {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(iso))
  } catch {
    return '—'
  }
}

function classCell(lead) {
  if (lead.className) return lead.className
  if (lead.classId) return String(lead.classId)
  return '—'
}

/**
 * Self-serve lead intake for roles that cannot assign a teacher.
 * Admins and principals use `/leads` (full form including assignment).
 */
export default function CreateLeadPage() {
  const { token, user } = useAuth()
  const role = user?.role

  const [studentName, setStudentName] = useState('')
  const [parentName, setParentName] = useState('')
  const [phone, setPhone] = useState('')
  const [classId, setClassId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [classOpts, setClassOpts] = useState(null)
  const [classOptsError, setClassOptsError] = useState('')

  const [minePage, setMinePage] = useState(1)
  const [mineLeads, setMineLeads] = useState(null)
  const [mineTotal, setMineTotal] = useState(0)
  const [mineError, setMineError] = useState('')
  const mineAbortRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    async function loadClasses() {
      if (!token) {
        setClassOpts([])
        return
      }
      setClassOptsError('')
      const res = await fetchClassesSummary(token)
      if (cancelled) return
      if (!res.ok) {
        setClassOptsError(res.error || 'Could not load classes.')
        setClassOpts([])
        return
      }
      setClassOpts(res.options)
    }
    void loadClasses()
    return () => {
      cancelled = true
    }
  }, [token])

  const loadMine = useCallback(
    async (page) => {
      if (!token) {
        setMineLeads([])
        setMineTotal(0)
        return
      }
      const p = Math.max(1, Number(page) || 1)
      if (mineAbortRef.current) mineAbortRef.current.abort()
      const ctrl = new AbortController()
      mineAbortRef.current = ctrl
      setMineError('')
      const res = await fetchMyLeads(token, {
        page: p,
        limit: MINE_PAGE_LIMIT,
        signal: ctrl.signal,
      })
      if (ctrl.signal.aborted || res.aborted) return
      if (!res.ok) {
        setMineError(res.error || 'Could not load your leads.')
        setMineLeads([])
        setMineTotal(0)
        return
      }
      setMineLeads(res.leads)
      setMineTotal(res.total)
      setMinePage(res.page || p)
    },
    [token],
  )

  useEffect(() => {
    void loadMine(minePage)
  }, [loadMine, minePage])

  useEffect(
    () => () => {
      if (mineAbortRef.current) mineAbortRef.current.abort()
    },
    [],
  )

  const onSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return
    if (!studentName.trim() || !parentName.trim() || !phone.trim()) {
      toast.error('Student name, parent name, and phone are required.')
      return
    }
    if (!isPhone10Digits(phone)) {
      toast.error('Phone must be exactly 10 digits.')
      return
    }
    setSubmitting(true)
    try {
      const res = await createLead(token, {
        studentName: studentName.trim(),
        parentName: parentName.trim(),
        phone: sanitizePhoneDigits(phone),
        classId: classId || null,
      })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success('Lead submitted. Staff can assign a teacher when ready.')
      setStudentName('')
      setParentName('')
      setPhone('')
      setClassId('')
      setMinePage(1)
      void loadMine(1)
    } finally {
      setSubmitting(false)
    }
  }

  const backTo =
    role === ROLES.PARENT
      ? '/dashboard'
      : role === ROLES.DRIVER
        ? '/driver-transport'
        : '/dashboard'

  const totalMinePages = Math.max(1, Math.ceil(mineTotal / MINE_PAGE_LIMIT))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Link to={backTo}>
          <Button type="button" size="sm" variant="secondary">
            {role === ROLES.PARENT ? 'Dashboard' : role === ROLES.DRIVER ? 'My trip' : 'Dashboard'}
          </Button>
        </Link>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => {
            void loadMine(minePage)
          }}
        >
          Refresh history
        </Button>
      </div>

      <Card>
        <CardHeader
          title="Create lead"
          subtitle="Only admins and principals can assign a teacher. Your submission will be queued for assignment."
        />
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Student name</label>
            <Input
              className="mt-1"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              required
              disabled={submitting}
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Parent / guardian</label>
            <Input
              className="mt-1"
              value={parentName}
              onChange={(e) => setParentName(e.target.value)}
              required
              disabled={submitting}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Phone</label>
            <PhoneInput
              className="mt-1"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              disabled={submitting}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Class</label>
            <select
              className="mt-1 w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-sm disabled:opacity-60"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              disabled={submitting || classOpts === null}
            >
              <option value="">{classOpts === null ? 'Loading classes…' : 'No class'}</option>
              {(classOpts || []).map((c) => (
                <option key={c.value} value={c.value}>
                  {c.subtext ? `${c.label} — ${c.subtext}` : c.label}
                </option>
              ))}
            </select>
            {classOptsError ? <p className="mt-1 text-xs text-amber-700">{classOptsError}</p> : null}
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : 'Create lead'}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader
          title="Leads history"
          subtitle="Your submissions from this account. Read-only list."
        />
        {mineError ? (
          <p className="mb-3 rounded-xl border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-sm text-amber-950">
            {mineError}
          </p>
        ) : null}
        {mineLeads === null ? (
          <p className="text-sm text-slate-600">Loading…</p>
        ) : mineLeads.length === 0 ? (
          <p className="text-sm text-slate-600">No leads yet.</p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-slate-200/90">
              <table className="min-w-[720px] w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200/90 bg-slate-50/90 text-xs font-bold uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2.5">Student</th>
                    <th className="px-3 py-2.5">Parent / guardian</th>
                    <th className="px-3 py-2.5">Phone</th>
                    <th className="px-3 py-2.5">Class</th>
                    <th className="px-3 py-2.5">Assigned teacher</th>
                    <th className="px-3 py-2.5">Stage</th>
                    <th className="px-3 py-2.5">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {mineLeads.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-3 py-2.5 text-slate-800">{row.studentName || '—'}</td>
                      <td className="px-3 py-2.5 text-slate-800">{row.parentName || '—'}</td>
                      <td className="px-3 py-2.5 text-slate-800">{row.phone || '—'}</td>
                      <td className="px-3 py-2.5 text-slate-800">{classCell(row)}</td>
                      <td className="px-3 py-2.5 text-slate-800">{row.assignedTeacherName || '—'}</td>
                      <td className="px-3 py-2.5 text-slate-800">
                        {LEAD_STAGE_LABELS[row.stage] ?? row.stage ?? '—'}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">{fmtDate(row.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {mineTotal > MINE_PAGE_LIMIT ? (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span>
                  Page {minePage} of {totalMinePages} · {mineTotal} total
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={minePage <= 1}
                  onClick={() => setMinePage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={minePage >= totalMinePages}
                  onClick={() => setMinePage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            ) : null}
          </>
        )}
      </Card>
    </div>
  )
}
