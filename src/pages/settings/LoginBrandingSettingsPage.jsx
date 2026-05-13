import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useAuth } from '../../context/AuthContext'
import {
  fetchPublicLoginBranding,
  updateLoginBranding,
  uploadLoginAppearanceLogo,
} from '../../api/settingsApi'
import {
  DEFAULT_LOGIN_BRANDING,
  getLoginBrandingSnapshot,
  normalizeLoginBranding,
  resetLoginBranding,
  sanitizeLogoImage,
  setLoginBranding,
} from '../../utils/loginBranding'
import { Card, CardHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

/** Browser-only preview (data URL) when not signed in or upload fails. */
const MAX_LOCAL_DATA_URL_BYTES = 380 * 1024
/** POST /api/login-appearance/logo multipart */
const MAX_LOGO_UPLOAD_BYTES = 5 * 1024 * 1024

function applyToForm(b, setLogoImage, setLogoUrlInput, setTitle, setSubtitle) {
  setLogoImage(b.logoImage || '')
  setLogoUrlInput('')
  setTitle(b.title)
  setSubtitle(b.subtitle)
}

export default function LoginBrandingSettingsPage() {
  const { token } = useAuth()
  const fileRef = useRef(null)
  const [logoImage, setLogoImage] = useState('')
  const [logoUrlInput, setLogoUrlInput] = useState('')
  const [title, setTitle] = useState(DEFAULT_LOGIN_BRANDING.title)
  const [subtitle, setSubtitle] = useState(DEFAULT_LOGIN_BRANDING.subtitle)
  const [logoUploading, setLogoUploading] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const remote = await fetchPublicLoginBranding()
      if (cancelled) return
      if (remote.ok && remote.branding) {
        applyToForm(
          normalizeLoginBranding(remote.branding),
          setLogoImage,
          setLogoUrlInput,
          setTitle,
          setSubtitle,
        )
        return
      }
      applyToForm(
        getLoginBrandingSnapshot(),
        setLogoImage,
        setLogoUrlInput,
        setTitle,
        setSubtitle,
      )
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const onPickFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file.')
      return
    }

    if (token) {
      if (file.size > MAX_LOGO_UPLOAD_BYTES) {
        toast.error('Image is too large to upload (max 5 MB).')
        return
      }
      setLogoUploading(true)
      try {
        const up = await uploadLoginAppearanceLogo(token, file)
        if (!up.ok) {
          toast.error(up.error || 'Logo upload failed.')
          return
        }
        const remote = await fetchPublicLoginBranding()
        if (remote.ok && remote.branding) {
          applyToForm(
            normalizeLoginBranding(remote.branding),
            setLogoImage,
            setLogoUrlInput,
            setTitle,
            setSubtitle,
          )
        } else {
          const fallback = sanitizeLogoImage(String(up.logoUrl || '').trim())
          if (fallback) {
            setLogoImage(fallback)
            setLogoUrlInput('')
          }
        }
        toast.success('Logo uploaded. Sign-in pages will show it after refresh.')
        window.dispatchEvent(new Event('sm-login-branding-changed'))
      } finally {
        setLogoUploading(false)
      }
      return
    }

    if (file.size > MAX_LOCAL_DATA_URL_BYTES) {
      toast.error('Image is too large for offline preview. Sign in to upload up to 5 MB, or use an https URL.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result || '')
      const cleaned = sanitizeLogoImage(dataUrl)
      if (!cleaned) {
        toast.error('That image is too large to store in the browser.')
        return
      }
      setLogoImage(cleaned)
      setLogoUrlInput('')
      toast.success('Logo loaded for preview only. Sign in to upload to the server, then Save.')
    }
    reader.onerror = () => toast.error('Could not read that file.')
    reader.readAsDataURL(file)
  }

  const onApplyUrl = () => {
    const cleaned = sanitizeLogoImage(logoUrlInput.trim())
    if (!cleaned) {
      toast.error('Use a full https:// link to an image (PNG, JPG, WebP, SVG, or GIF).')
      return
    }
    setLogoImage(cleaned)
    toast.success('Logo URL set. Click Save to apply.')
  }

  const onRemoveImage = () => {
    setLogoImage('')
    setLogoUrlInput('')
    if (fileRef.current) fileRef.current.value = ''
  }

  const onSave = async () => {
    const payload = normalizeLoginBranding({
      logoLetter: DEFAULT_LOGIN_BRANDING.logoLetter,
      title,
      subtitle,
      logoImage,
    })
    if (token) {
      const res = await updateLoginBranding(token, payload)
      if (res.ok) {
        if (res.skippedLogoUrlForServer) {
          toast.success(
            'Saved title and subtitle on the server. Use an https image URL (or clear the logo) to sync the logo for everyone — file uploads stay in this browser only.',
          )
        } else {
          toast.success('Saved to server. Login page will update for everyone.')
        }
        window.dispatchEvent(new Event('sm-login-branding-changed'))
        return
      }
      toast.error(`${res.error || 'Server save failed.'} Saving in this browser only.`)
    }
    setLoginBranding(payload)
    window.dispatchEvent(new Event('sm-login-branding-changed'))
    toast.success('Saved in this browser.')
  }

  const onReset = () => {
    resetLoginBranding()
    applyToForm(
      getLoginBrandingSnapshot(),
      setLogoImage,
      setLogoUrlInput,
      setTitle,
      setSubtitle,
    )
    if (fileRef.current) fileRef.current.value = ''
    window.dispatchEvent(new Event('sm-login-branding-changed'))
    toast.info('Restored defaults (this browser).')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Link to="/dashboard">
          <Button type="button" size="sm" variant="secondary">
            Dashboard
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader
          title="Login page appearance"
          subtitle="Choosing a file uploads it to POST /api/login-appearance/logo (Bearer) and refreshes the preview from the server. Title and subtitle still use Save. Without a session, file choice is preview-only in this browser."
        />
        <div className="space-y-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Preview</p>
            <div className="mt-2 flex min-h-[5.5rem] items-center justify-center rounded-2xl border border-slate-200/90 bg-slate-950 px-4 py-6">
              {logoImage ? (
                <img
                  src={logoImage}
                  alt=""
                  className="max-h-28 max-w-full object-contain"
                  decoding="async"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-400 via-indigo-500 to-violet-600 text-xl font-bold text-white shadow-lg ring-2 ring-white/15">
                  {DEFAULT_LOGIN_BRANDING.logoLetter}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Logo image</p>
            <input
              ref={fileRef}
              type="file"
              disabled={logoUploading}
              accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/svg+xml"
              className="max-w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-indigo-700 disabled:opacity-50"
              onChange={(ev) => void onPickFile(ev)}
            />
            {logoUploading ? (
              <p className="text-xs text-slate-500">Uploading logo…</p>
            ) : null}
            <p className="text-xs text-slate-500">
              Or use an <strong className="font-semibold text-slate-700">https</strong> image URL.
            </p>
            <div className="flex flex-wrap gap-2 sm:max-w-xl">
              <Input
                className="min-w-[12rem] flex-1"
                type="url"
                inputMode="url"
                placeholder="https://yourschool.edu/logo.png"
                value={logoUrlInput}
                onChange={(e) => setLogoUrlInput(e.target.value)}
              />
              <Button type="button" variant="secondary" size="sm" onClick={onApplyUrl}>
                Use URL
              </Button>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={onRemoveImage} disabled={!logoImage}>
              Remove image
            </Button>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Title (below logo)</label>
            <Input className="mt-1" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Subtitle (second line)
            </label>
            <textarea
              className="mt-1 min-h-[5rem] w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              maxLength={500}
              rows={3}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void onSave()}>
              Save
            </Button>
            <Button type="button" variant="secondary" onClick={onReset}>
              Reset to defaults
            </Button>
            <Link to="/login" target="_blank" rel="noopener noreferrer">
              <Button type="button" variant="secondary">
                Open login in new tab
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  )
}
