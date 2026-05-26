import { useCallback, useEffect, useState } from 'react'
import { fetchNotificationBannerAssets } from '../../api/notificationsApi'
import { Modal } from '../Modal'
import { Button } from '../ui/Button'

/**
 * Browse previously uploaded notice banners (GET /api/notifications/banner-assets).
 */
export function BannerAssetPicker({ token, open, onClose, selectedId, onSelect }) {
  const [assets, setAssets] = useState([])
  const [page, setPage] = useState(1)
  const [hasNext, setHasNext] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadPage = useCallback(
    async (pageNum, append) => {
      if (!token) {
        setError('Sign in to browse uploaded banners.')
        setAssets([])
        return
      }
      setLoading(true)
      setError('')
      const res = await fetchNotificationBannerAssets(token, { page: pageNum, limit: 24 })
      setLoading(false)
      if (!res.ok) {
        setError(res.error || 'Could not load banner library.')
        if (!append) setAssets([])
        return
      }
      setHasNext(res.hasNext)
      setPage(res.page)
      setAssets((prev) => (append ? [...prev, ...res.assets] : res.assets))
    },
    [token],
  )

  useEffect(() => {
    if (!open) return
    setAssets([])
    setPage(1)
    void loadPage(1, false)
  }, [open, loadPage])

  return (
    <Modal
      open={open}
      title="Choose banner image"
      size="xl"
      onClose={onClose}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          {hasNext ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={loading}
              onClick={() => void loadPage(page + 1, true)}
            >
              {loading ? 'Loading…' : 'Load more'}
            </Button>
          ) : null}
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <p className="mb-4 text-sm text-slate-600">
        Pick a banner you uploaded before. Images must be at most 380 KB when uploading a new file.
      </p>
      {error ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">{error}</p>
      ) : null}
      {loading && assets.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">Loading banners…</p>
      ) : null}
      {!loading && !error && assets.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">No uploaded banners yet. Upload one below instead.</p>
      ) : null}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {assets.map((asset) => {
          const selected = selectedId === asset.id
          return (
            <li key={asset.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(asset)
                  onClose()
                }}
                className={`group flex w-full flex-col overflow-hidden rounded-lg border-2 bg-white text-left transition hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${
                  selected ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-slate-200 hover:border-indigo-300'
                }`}
              >
                <div className="aspect-[16/10] w-full bg-slate-100">
                  <img
                    src={asset.thumbnailUrl}
                    alt={asset.fileName || 'Banner'}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                {asset.fileName ? (
                  <span className="truncate px-2 py-1.5 text-xs text-slate-600" title={asset.fileName}>
                    {asset.fileName}
                  </span>
                ) : null}
              </button>
            </li>
          )
        })}
      </ul>
    </Modal>
  )
}
