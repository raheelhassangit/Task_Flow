import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { parseError } from '../api/errors'
import Field from '../components/Field'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', password: '' })
  const [error, setError] = useState({ message: '', fields: {} })
  const [busy, setBusy] = useState(false)

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  async function onSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError({ message: '', fields: {} })
    try {
      await register(form)
      navigate('/', { replace: true })
    } catch (err) {
      setError(parseError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-xl bg-white p-6 shadow">
        <h1 className="text-xl font-semibold">Create your account</h1>
        {error.message && (
          <p className="rounded bg-red-50 p-2 text-sm text-red-700">{error.message}</p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name" value={form.first_name} onChange={set('first_name')} error={error.fields.first_name} />
          <Field label="Last name" value={form.last_name} onChange={set('last_name')} error={error.fields.last_name} />
        </div>
        <Field label="Email" type="email" value={form.email} onChange={set('email')} error={error.fields.email} required />
        <Field label="Password" type="password" value={form.password} onChange={set('password')} error={error.fields.password} required />
        <button
          disabled={busy}
          className="w-full rounded-md bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {busy ? 'Creating...' : 'Register'}
        </button>
        <p className="text-center text-sm text-slate-600">
          Already registered? <Link to="/login" className="text-indigo-600">Log in</Link>
        </p>
      </form>
    </div>
  )
}