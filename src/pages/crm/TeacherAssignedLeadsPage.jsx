import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Card, CardHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import {
  LEAD_STAGES,
  LEAD_STAGE_LABELS,
} from '../../data/phase6Constants'
import { fetchTeacherLeads } from '../../api/leadsApi'

const PAGE_LIMIT = 20

export default function TeacherAssignedLeadsPage() {
  const { token } = useAuth()

  const [q, setQ] = useState('')
  const [stage, setStage] = useState('')
  const [page, setPage] = useState(1)

  /** null while loading; [] when loaded with zero matches */
  const [leads, setLeads] = useState(null)
  const [total, setTotal] = useState(0)
  const [listError, setListError] = useState('')

  const abortRef = useRef(null)

  const load = useCallback(
    async (nextPage, nextQ, nextStage) => {
      if (!token) {
        setLeads([])
        setTotal(0)
        return
      }
      const usePage = Math.max(1, Number(nextPage) || 1)
      const useQ = String(nextQ ?? '').trim()
      const useStage = String(nextStage ?? '').trim()
      if (abortRef.current) abortRef.current.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setListError('')
      const res = await fetchTeacherLeads(token, {
        q: useQ,
        stage: useStage,
        page: usePage,
        limit: PAGE_LIMIT,
        signal: controller.signal,
      })
      if (controller.signal.aborted || res.aborted) return
      if (!res.ok) {
        setListError(res.error || 'Could not load leads.')
        setLeads([])
        setTotal(0)
        return
      }
      setLeads(res.leads)
      setTotal(res.total)
      setPage(res.page || usePage)
    },
    [token],
  )

  useEffect(() => {
    setLeads(null)
    const handle = setTimeout(() => {
      void load(1, q, stage)
      setPage(1)
    }, 250)
    return () => clearTimeout(handle)
  }, [q, stage, load])

  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort()
    }
  }, [])

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_LIMIT)), [total])
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
            void load(page, q, stage)
          }}
        >
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader
          title="Assigned leads"
          subtitle="Leads your admin assigned to you. Update stages, add notes, and log follow-ups — you cannot delete leads or see unassigned leads here."
        />

        <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_220px]">
          <Input
            placeholder="Search by student, parent, phone, teacher, stage…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className="rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-sm"
            value={stage}
            onChange={(e) => setStage(e.target.value)}
          >
            <option value="">All stages</option>
            {LEAD_STAGES.map((s) => (
              <option key={s} value={s}>
                {LEAD_STAGE_LABELS[s] ?? s}
              </option>
            ))}
          </select>
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
            {q || stage ? 'No leads match your filters.' : 'No leads assigned to you yet.'}
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
                        {LEAD_STAGE_LABELS[l.stage] ?? l.stage}
                      </span>
                    </td>
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
                  void load(page - 1, q, stage)
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
                  void load(page + 1, q, stage)
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
