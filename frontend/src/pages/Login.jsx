import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { parseError } from '../api/errors'
import Field from '../components/Field'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const from = useLocation().state?.from ?? '/'

  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState({ message: '', fields: {} })
  const [busy, setBusy] = useState(false)

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  async function onSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError({ message: '', fields: {} })
    try {
      await login(form.email, form.password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(parseError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-xl bg-white p-6 shadow">
        <h1 className="text-xl font-semibold">Log in to TaskFlow</h1>
        {error.message && (
          <p className="rounded bg-red-50 p-2 text-sm text-red-700">{error.message}</p>
        )}
        <Field label="Email" type="email" value={form.email} onChange={set('email')} error={error.fields.email} required />
        <Field label="Password" type="password" value={form.password} onChange={set('password')} error={error.fields.password} required />
        <div className="text-right">
          <Link to="/forgot-password" className="text-xs text-indigo-600">Forgot password?</Link>
        </div>
        <button
          disabled={busy}
          className="w-full rounded-md bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {busy ? 'Logging in...' : 'Log in'}
        </button>
        <p className="text-center text-sm text-slate-600">
          No account? <Link to="/register" className="text-indigo-600">Register</Link>
        </p>
      </form>
    </div>
  )
}