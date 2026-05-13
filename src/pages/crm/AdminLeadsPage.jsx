import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useAuth } from '../../context/AuthContext'
import { Card, CardHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { LEAD_STAGE_LABELS } from '../../data/phase6Constants'
import { createLead, fetchLeads } from '../../api/leadsApi'
import { fetchClassesSummary } from '../../api/classesApi'
import { fetchTeachersPicker } from '../../api/teachersApi'

const PAGE_LIMIT = 20

export default function AdminLeadsPage() {
  const { token } = useAuth()

  const [leads, setLeads] = useState(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [listError, setListError] = useState('')
  const [q, setQ] = useState('')

  const [studentName, setStudentName] = useState('')
  const [parentName, setParentName] = useState('')
  const [phone, setPhone] = useState('')
  const [assignId, setAssignId] = useState('')
  const [classId, setClassId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  /** Teacher options from `/api/teachers/picker`. null while loading. */
  const [teacherOpts, setTeacherOpts] = useState(null)
  const [teacherOptsError, setTeacherOptsError] = useState('')

  /** Class options from `/api/classes/summary`. null while loading. */
  const [classOpts, setClassOpts] = useState(null)
  const [classOptsError, setClassOptsError] = useState('')

  const abortRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    async function loadTeachers() {
      if (!token) {
        setTeacherOpts([])
        return
      }
      setTeacherOptsError('')
      const res = await fetchTeachersPicker(token)
      if (cancelled) return
      if (!res.ok) {
        setTeacherOptsError(res.error || 'Could not load teachers.')
        setTeacherOpts([])
        return
      }
      setTeacherOpts(res.options)
    }
    void loadTeachers()
    return () => {
      cancelled = true
    }
  }, [token])

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

  const load = useCallback(
    async (nextPage, query) => {
      if (!token) {
        setLeads([])
        return
      }
      if (abortRef.current) abortRef.current.abort()
      const ctrl = new AbortController()
      abortRef.current = ctrl
      setListError('')
      const res = await fetchLeads(token, {
        q: query,
        page: nextPage,
        limit: PAGE_LIMIT,
        signal: ctrl.signal,
      })
      if (abortRef.current !== ctrl) return
      if (res.aborted) return
      if (!res.ok) {
        setListError(res.error || 'Could not load leads.')
        setLeads([])
        setTotal(0)
        toast.error(res.error)
        return
      }
      setLeads(res.leads)
      setTotal(res.total)
      setPage(res.page || nextPage)
    },
    [token],
  )

  /** Debounce the search input so we hit the server at most once per ~350ms while typing. */
  useEffect(() => {
    setLeads(null)
    const handle = setTimeout(() => {
      void load(1, q)
    }, 350)
    return () => clearTimeout(handle)
  }, [q, load])

  useEffect(
    () => () => {
      if (abortRef.current) abortRef.current.abort()
    },
    [],
  )

  const onCreate = async (e) => {
    e.preventDefault()
    if (submitting) return
    if (!studentName.trim() || !parentName.trim() || !phone.trim()) {
      toast.error('Student name, parent name, and phone are required.')
      return
    }
    setSubmitting(true)
    try {
      const res = await createLead(token, {
        studentName: studentName.trim(),
        parentName: parentName.trim(),
        phone: phone.trim(),
        assignedTeacherId: assignId || null,
        classId: classId || null,
      })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success('Lead created.')
      setStudentName('')
      setParentName('')
      setPhone('')
      setAssignId('')
      setClassId('')
      setQ('')
      await load(1, '')
    } finally {
      setSubmitting(false)
    }
  }

  const totalPages = total > 0 ? Math.max(1, Math.ceil(total / PAGE_LIMIT)) : 1
  const hasPrev = page > 1
  const hasNext = page < totalPages

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Link to="/dashboard">
          <Button type="button" size="sm" variant="secondary">
            Dashboard
          </Button>
        </Link>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => {
            setLeads(null)
            void load(page, q)
          }}
        >
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader
          title="Create lead"
          subtitle="Assign a teacher now or open the lead later from the detail screen."
        />
        <form onSubmit={onCreate} className="grid gap-4 sm:grid-cols-2">
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
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Phone</label>
            <Input
              className="mt-1"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              disabled={submitting}
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Assign teacher</label>
            <select
              className="mt-1 w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-sm disabled:opacity-60"
              value={assignId}
              onChange={(e) => setAssignId(e.target.value)}
              disabled={submitting || teacherOpts === null}
            >
              <option value="">
                {teacherOpts === null ? 'Loading teachers…' : 'Unassigned'}
              </option>
              {(teacherOpts || []).map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            {teacherOptsError ? (
              <p className="mt-1 text-xs text-amber-700">{teacherOptsError}</p>
            ) : null}
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Class</label>
            <select
              className="mt-1 w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-sm disabled:opacity-60"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              disabled={submitting || classOpts === null}
            >
              <option value="">
                {classOpts === null ? 'Loading classes…' : 'No class'}
              </option>
              {(classOpts || []).map((c) => (
                <option key={c.value} value={c.value}>
                  {c.subtext ? `${c.label} — ${c.subtext}` : c.label}
                </option>
              ))}
            </select>
            {classOptsError ? (
              <p className="mt-1 text-xs text-amber-700">{classOptsError}</p>
            ) : null}
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
          title="Lead dashboard"
          subtitle="Search and open a lead to change stage, notes, and follow-ups."
        />
        <div className="mb-4">
          <Input
            placeholder="Search by student, parent, phone, teacher, stage…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {leads === null ? (
          <p className="rounded-xl border border-slate-200/90 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
            Loading leads…
          </p>
        ) : null}

        {listError ? (
          <p className="mb-3 rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
            {listError}
          </p>
        ) : null}

        {leads !== null && leads.length === 0 && !listError ? (
          <p className="text-sm text-slate-600">
            {q ? 'No leads match your search.' : 'No leads yet.'}
          </p>
        ) : null}

        {Array.isArray(leads) && leads.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-slate-200/80">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2">Student</th>
                  <th className="px-3 py-2">Parent</th>
                  <th className="px-3 py-2">Phone</th>
                  <th className="px-3 py-2">Teacher</th>
                  <th className="px-3 py-2">Stage</th>
                  <th className="px-3 py-2">Created by</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leads.map((l) => (
                  <tr key={l.id} className="align-top transition hover:bg-slate-50/60">
                    <td className="px-3 py-2 font-medium text-slate-900">{l.studentName}</td>
                    <td className="px-3 py-2 text-slate-700">{l.parentName}</td>
                    <td className="px-3 py-2 text-slate-600">{l.phone}</td>
                    <td className="px-3 py-2 text-xs text-indigo-700">
                      {l.assignedTeacherName}
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-flex shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                        {LEAD_STAGE_LABELS[l.stage] || l.stage}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-700">{l.createdByName || '—'}</td>
                    <td className="px-3 py-2 text-right">
                      <Link to={`/leads/${l.id}`}>
                        <Button type="button" size="sm" variant="secondary">
                          Open
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {total > PAGE_LIMIT ? (
          <div className="mt-4 flex items-center justify-between gap-2 text-xs text-slate-500">
            <span>
              Page {page} of {totalPages} · {total} total
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={!hasPrev || leads === null}
                onClick={() => {
                  setLeads(null)
                  void load(page - 1, q)
                }}
              >
                Previous
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={!hasNext || leads === null}
                onClick={() => {
                  setLeads(null)
                  void load(page + 1, q)
                }}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  )
}
