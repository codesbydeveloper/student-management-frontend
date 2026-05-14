import { useCallback, useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { Card, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Label } from '../components/ui/Label'
import { useAuth } from '../context/AuthContext'
import { ROLES } from '../utils/constants'
import {
  deleteNoticeCategory,
  fetchNoticeCategories,
  patchNoticeCategory,
  postNoticeCategory,
} from '../api/notificationsApi'

const PAGE_LIMIT = 10

export default function CreateCategoryPage() {
  const { user, token } = useAuth()
  const [categoryName, setCategoryName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [page, setPage] = useState(1)
  const [categories, setCategories] = useState([])
  const [total, setTotal] = useState(0)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [listLoading, setListLoading] = useState(false)
  const [listError, setListError] = useState(null)

  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [mutatingId, setMutatingId] = useState(null)

  const loadCategories = useCallback(async () => {
    if (!token) {
      setCategories([])
      setTotal(0)
      setHasNextPage(false)
      setListError(null)
      return
    }
    setListLoading(true)
    setListError(null)
    try {
      const res = await fetchNoticeCategories(token, { page, limit: PAGE_LIMIT })
      if (!res.ok) {
        setCategories([])
        setTotal(0)
        setHasNextPage(false)
        setListError(res.error || 'Could not load categories.')
        if (!res.useClient) {
          toast.error(res.error || 'Could not load categories.')
        }
        return
      }
      setCategories(res.categories)
      setTotal(res.total)
      setHasNextPage(Boolean(res.hasNext))
    } finally {
      setListLoading(false)
    }
  }, [token, page])

  useEffect(() => {
    void loadCategories()
  }, [loadCategories])

  useEffect(() => {
    setEditingId(null)
    setEditValue('')
  }, [page])

  const totalPages = Math.max(1, Math.ceil((total || 0) / PAGE_LIMIT))
  const canPrev = page > 1
  const canNext = hasNextPage || page < totalPages

  const onSubmit = async (e) => {
    e.preventDefault()
    const name = categoryName.trim()
    if (!name) {
      toast.error('Enter a category name.')
      return
    }
    if (!token) {
      toast.error('Sign in again to create a category.')
      return
    }
    if (user?.role !== ROLES.ADMIN && user?.role !== ROLES.PRINCIPAL) {
      toast.error('Only admin or principal can create notice categories.')
      return
    }

    setSubmitting(true)
    try {
      const res = await postNoticeCategory(token, name, user.role)
      if (res.ok) {
        const msg =
          (res.data && typeof res.data === 'object' && typeof res.data.message === 'string' && res.data.message) ||
          'Category created.'
        toast.success(msg)
        setCategoryName('')
        await loadCategories()
        return
      }
      toast.error(res.error || 'Could not create category.')
    } finally {
      setSubmitting(false)
    }
  }

  const startEdit = (row) => {
    setEditingId(row.id)
    setEditValue(row.displayName)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditValue('')
  }

  const saveEdit = async (rowId) => {
    const next = editValue.trim()
    if (!next) {
      toast.error('Enter a category name.')
      return
    }
    if (!token || !user?.role) return
    setMutatingId(rowId)
    try {
      const res = await patchNoticeCategory(token, rowId, next)
      if (res.ok) {
        toast.success('Category updated.')
        cancelEdit()
        await loadCategories()
        return
      }
      toast.error(res.error || 'Could not update category.')
    } finally {
      setMutatingId(null)
    }
  }

  const onDelete = async (row) => {
    if (!token) return
    if (!window.confirm(`Delete category “${row.displayName}”?`)) return
    setMutatingId(row.id)
    try {
      const res = await deleteNoticeCategory(token, row.id)
      if (res.ok) {
        toast.success('Category deleted.')
        if (editingId === row.id) cancelEdit()
        await loadCategories()
        return
      }
      toast.error(res.error || 'Could not delete category.')
    } finally {
      setMutatingId(null)
    }
  }

  const scopeHint =
    user?.role === ROLES.ADMIN
      ? 'POST uses `{ name }` (administrative). PATCH uses `{ name }`. DELETE removes by id.'
      : user?.role === ROLES.PRINCIPAL
        ? 'POST uses `{ categoryName }` (academic). PATCH uses `{ name }` per API. DELETE removes by id.'
        : ''

  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_LIMIT + 1
  const rangeEnd = total === 0 ? 0 : Math.min(page * PAGE_LIMIT, total)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Create Category"
          subtitle={
            scopeHint
              ? `${scopeHint} Base URL: set VITE_API_URL to match your API.`
              : 'Set VITE_API_URL to match your API host.'
          }
        />
        <form className="border-t border-slate-100 px-4 py-6 sm:px-6" onSubmit={onSubmit} noValidate>
          <div className="max-w-md">
            <Label htmlFor="category-name">Category name</Label>
            <Input
              id="category-name"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="e.g. Fees, Holidays, Exams"
              className="mt-1.5"
              autoComplete="off"
              disabled={submitting}
            />
          </div>
          <div className="mt-6">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create category'}
            </Button>
          </div>
        </form>

        <div className="border-t border-slate-100 px-4 py-6 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">All categories</h3>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={listLoading || !token}
              onClick={() => void loadCategories()}
            >
              {listLoading ? 'Refreshing…' : 'Refresh'}
            </Button>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            GET <span className="font-mono">/api/notifications/notice-categories</span> — page {page}, {PAGE_LIMIT}{' '}
            per page.
          </p>

          {listError ? (
            <div className="mt-4 rounded-xl border border-amber-200/90 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
              {listError}
            </div>
          ) : null}

          {listLoading && categories.length === 0 && !listError ? (
            <p className="mt-6 text-sm text-slate-500">Loading categories…</p>
          ) : null}

          {!listLoading && categories.length === 0 && !listError ? (
            <p className="mt-6 text-sm text-slate-600">No categories on this page.</p>
          ) : null}

          {categories.length > 0 ? (
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white">
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider">Category name</th>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider">ID</th>
                      <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {categories.map((row, idx) => {
                      const busy = mutatingId === row.id
                      const editing = editingId === row.id
                      const otherEditing = editingId != null && editingId !== row.id
                      return (
                        <tr key={row.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                          <td className="max-w-xs px-4 py-3 align-middle text-slate-900">
                            {editing ? (
                              <Input
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="font-medium"
                                disabled={busy}
                                autoFocus
                              />
                            ) : (
                              <span className="font-medium">{row.displayName}</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 align-middle font-mono text-xs text-slate-500">
                            {row.id}
                          </td>
                          <td className="px-4 py-3 align-middle">
                            <div className="flex flex-wrap justify-end gap-2">
                              {editing ? (
                                <>
                                  <Button
                                    type="button"
                                    size="sm"
                                    disabled={busy}
                                    onClick={() => void saveEdit(row.id)}
                                  >
                                    {busy ? 'Saving…' : 'Save'}
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="secondary"
                                    disabled={busy}
                                    onClick={cancelEdit}
                                  >
                                    Cancel
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="secondary"
                                    disabled={busy || listLoading || otherEditing}
                                    onClick={() => startEdit(row)}
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="danger"
                                    disabled={busy || listLoading || otherEditing}
                                    onClick={() => void onDelete(row)}
                                  >
                                    {busy ? 'Deleting…' : 'Delete'}
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {total > 0 || categories.length > 0 ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-sm text-slate-600">
              <span>
                {total > 0 ? (
                  <>
                    Showing {rangeStart}–{rangeEnd} of {total}
                  </>
                ) : (
                  <>Showing {categories.length} on this page</>
                )}
              </span>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={!canPrev || listLoading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <span className="flex items-center px-2 text-xs text-slate-500">
                  Page {page} of {totalPages}
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={!canNext || listLoading}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  )
}
