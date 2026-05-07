import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Label } from '../components/ui/Label'
import { email, required } from '../utils/validators'

function initialLoginForm(locationState) {
  const regEmail = locationState?.registeredEmail
  const emailVal =
    typeof regEmail === 'string' && regEmail.trim() ? regEmail.trim().toLowerCase() : ''
  return { email: emailVal, password: '' }
}

export default function LoginPage() {
  const { login, isAuthenticated, ready } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/dashboard'

  const [form, setForm] = useState(() => initialLoginForm(location.state))
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  if (ready && isAuthenticated) {
    return <Navigate to={from} replace />
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    const e1 = required(form.email, 'Email')
    const e2 = email(form.email)
    const e3 = required(form.password, 'Password')
    const next = { email: e1 || e2, password: e3 }
    setErrors(next)
    if (e1 || e2 || e3) return

    setSubmitting(true)
    try {
      const res = await login(form.email, form.password)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success('Welcome back — redirecting to your workspace.')
      navigate(from, { replace: true })
    } catch {
      toast.error('Sign in failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <h2 className="text-xl font-bold tracking-tight text-slate-900">Sign in</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        Enter your school email and password. Your role and access come from the account on the server.
      </p>
      <form className="mt-8 space-y-5" onSubmit={onSubmit} noValidate>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="username"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            error={errors.email}
          />
          {errors.email ? <p className="mt-1.5 text-xs font-medium text-red-600">{errors.email}</p> : null}
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            error={errors.password}
          />
          {errors.password ? (
            <p className="mt-1.5 text-xs font-medium text-red-600">{errors.password}</p>
          ) : null}
        </div>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
      <div className="mt-8 flex justify-center pb-1" aria-hidden="true">
        <div className="h-1 w-24 rounded-full bg-gradient-to-r from-indigo-200 via-violet-500 to-indigo-200 shadow-sm shadow-violet-500/20" />
      </div>
    </Card>
  )
}
