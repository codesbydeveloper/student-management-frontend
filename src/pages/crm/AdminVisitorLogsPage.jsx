import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useAuth } from '../../context/AuthContext'
import { useConfirm } from '../../context/ConfirmContext'
import { Card, CardHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import {
  createVisitor,
  deleteVisitor as apiDeleteVisitor,
  fetchVisitorAudit,
  fetchVisitors,
} from '../../api/visitorsApi'

const PAGE_LIMIT = 20

function fmt(iso) {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
  } catch {
    return '—'
  }
}

export default function AdminVisitorLogsPage() {
  const { token } = useAuth()
  const confirm = useConfirm()

  const [visitors, setVisitors] = useState(null)
  const [audit, setAudit] = useState(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [listError, setListError] = useState('')
  const [auditError, setAuditError] = useState('')

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [purpose, setPurpose] = useState('')
  const [visitAt, setVisitAt] = useState('')
  const [submitting, setSubmitting] = useState(false)

  /** Per-row delete reasons + busy state, keyed by visitor id. */
  const [deleteReason, setDeleteReason] = useState({})
  const [deletingId, setDeletingId] = useState(null)

  const loadVisitors = useCallback(
    async (nextPage) => {
      if (!token) {
        setVisitors([])
        return
      }
      setListError('')
      const res = await fetchVisitors(token, { page: nextPage, limit: PAGE_LIMIT })
      if (!res.ok) {
        setListError(res.error || 'Could not load visitors.')
        setVisitors([])
        setTotal(0)
        toast.error(res.error)
        return
      }
      setVisitors(res.visitors)
      setTotal(res.total)
      setPage(res.page || nextPage)
    },
    [token],
  )

  const loadAudit = useCallback(async () => {
    if (!token) {
      setAudit([])
      return
    }
    setAuditError('')
    const res = await fetchVisitorAudit(token)
    if (!res.ok) {
      setAuditError(res.error || 'Could not load audit trail.')
      setAudit([])
      return
    }
    setAudit(res.audit)
  }, [token])

  useEffect(() => {
    setVisitors(null)
    void loadVisitors(1)
  }, [loadVisitors])

  useEffect(() => {
    setAudit(null)
    void loadAudit()
  }, [loadAudit])

  const onAdd = async (e) => {
    e.preventDefault()
    if (submitting) return
    if (!name.trim() || !phone.trim() || !purpose.trim() || !visitAt) {
      toast.error('Name, phone, purpose, and visit date/time are required.')
      return
    }
    setSubmitting(true)
    try {
      const res = await createVisitor(token, {
        name: name.trim(),
        phone: phone.trim(),
        purpose: purpose.trim(),
        visitAt,
      })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success('Visitor logged.')
      setName('')
      setPhone('')
      setPurpose('')
      setVisitAt('')
      await loadVisitors(1)
    } finally {
      setSubmitting(false)
    }
  }

  const onDelete = async (row) => {
    if (deletingId) return
    const reason = (deleteReason[row.id] || '').trim()
    if (!reason) {
      toast.error('Type a reason before deleting — it is saved to the audit trail.')
      return
    }
    const ok = await confirm({
      title: 'Remove visitor entry?',
      message: `Delete log for “${row.name}”? This will be recorded in the audit trail with the reason you typed.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
    })
    if (!ok) return
    setDeletingId(row.id)
    try {
      const res = await apiDeleteVisitor(token, row.id, { reason })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success('Entry removed.')
      setDeleteReason((m) => {
        const n = { ...m }
        delete n[row.id]
        return n
      })
      await Promise.all([loadVisitors(page), loadAudit()])
    } finally {
      setDeletingId(null)
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
            setVisitors(null)
            setAudit(null)
            void loadVisitors(page)
            void loadAudit()
          }}
        >
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader
          title="Visitor log"
          
        />
        <form onSubmit={onAdd} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Visitor name</label>
            <Input
              className="mt-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
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
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Visit date & time</label>
            <Input
              className="mt-1"
              type="datetime-local"
              value={visitAt}
              onChange={(e) => setVisitAt(e.target.value)}
              required
              disabled={submitting}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Purpose</label>
            <textarea
              className="mt-1 w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60"
              rows={2}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              required
              disabled={submitting}
            />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : 'Add visitor'}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader title="Visitor history" subtitle="Most recent first." />
        {visitors === null ? (
          <p className="rounded-xl border border-slate-200/90 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
            Loading visitors…
          </p>
        ) : null}
        {listError ? (
          <p className="mb-3 rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
            {listError}
          </p>
        ) : null}
        {visitors !== null && visitors.length === 0 && !listError ? (
          <p className="text-sm text-slate-600">No entries yet.</p>
        ) : null}
        {Array.isArray(visitors) && visitors.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-slate-200/80">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Phone</th>
                  <th className="px-3 py-2">Purpose</th>
                  <th className="px-3 py-2">Visit</th>
                  <th className="px-3 py-2">Created by</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visitors.map((v) => {
                  const isDeleting = deletingId === v.id
                  return (
                    <tr key={v.id} className="align-top">
                      <td className="px-3 py-2 font-medium text-slate-900">{v.name}</td>
                      <td className="px-3 py-2 text-slate-700">{v.phone}</td>
                      <td className="px-3 py-2 text-slate-600">{v.purpose}</td>
                      <td className="px-3 py-2 text-slate-600">{fmt(v.visitAt)}</td>
                      <td className="px-3 py-2 text-xs text-slate-500">{v.createdByName}</td>
                      <td className="px-3 py-2">
                        <div className="flex min-w-[16rem] flex-col gap-1.5">
                          <Input
                            type="text"
                            placeholder="Reason (saved to audit)"
                            value={deleteReason[v.id] || ''}
                            onChange={(e) =>
                              setDeleteReason((m) => ({ ...m, [v.id]: e.target.value }))
                            }
                            disabled={isDeleting}
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="danger"
                            onClick={() => onDelete(v)}
                            disabled={isDeleting}
                          >
                            {isDeleting ? 'Deleting…' : 'Delete'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
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
                disabled={!hasPrev || visitors === null}
                onClick={() => {
                  setVisitors(null)
                  void loadVisitors(page - 1)
                }}
              >
                Previous
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={!hasNext || visitors === null}
                onClick={() => {
                  setVisitors(null)
                  void loadVisitors(page + 1)
                }}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </Card>

      <Card>
        <CardHeader title="Delete audit" subtitle="Who removed which visitor record, and why." />
        {audit === null ? (
          <p className="rounded-xl border border-slate-200/90 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
            Loading audit…
          </p>
        ) : null}
        {auditError ? (
          <p className="mb-3 rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
            {auditError}
          </p>
        ) : null}
        {audit !== null && audit.length === 0 && !auditError ? (
          <p className="text-sm text-slate-600">No deletions yet.</p>
        ) : null}
        {Array.isArray(audit) && audit.length > 0 ? (
          <ul className="space-y-2 text-sm">
            {audit.map((a) => (
              <li key={a.id} className="rounded-lg border border-slate-200/80 bg-slate-50/80 px-3 py-2">
                <div className="flex flex-wrap items-center gap-x-2">
                  <span className="font-medium text-slate-800">{a.visitorNameSnapshot}</span>
                  <span className="text-slate-500">· removed by {a.deletedByName}</span>
                  <span className="text-slate-400">· {fmt(a.deletedAt)}</span>
                </div>
                {a.reason ? (
                  <p className="mt-0.5 text-xs text-slate-600">
                    <span className="font-semibold text-slate-500">Reason: </span>
                    {a.reason}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </Card>
    </div>
  )
}
