import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import { parseError } from '../api/errors'
import Field from '../components/Field'

export default function ResetPassword() {
  const [params] = useSearchParams()
  const uid = params.get('uid')
  const token = params.get('token')

  const [form, setForm] = useState({ password: '', confirm: '' })
  const [error, setError] = useState({ message: '', fields: {} })
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  if (!uid || !token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-sm space-y-3 rounded-xl bg-white p-6 text-center shadow">
          <p className="text-sm text-red-700">This reset link is incomplete.</p>
          <Link to="/forgot-password" className="text-sm text-indigo-600">Request a new one</Link>
        </div>
      </div>
    )
  }

  async function onSubmit(e) {
    e.preventDefault()
    setError({ message: '', fields: {} })
    if (form.password !== form.confirm) {
      setError({ message: '', fields: { confirm: 'Passwords do not match.' } })
      return
    }
    setBusy(true)
    try {
      await api.post('auth/password-reset/confirm/', { uid, token, new_password: form.password })
      setDone(true)
    } catch (err) {
      setError(parseError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm space-y-4 rounded-xl bg-white p-6 shadow">
        <h1 className="text-xl font-semibold">Choose a new password</h1>
        {done ? (
          <>
            <p className="rounded bg-green-50 p-3 text-sm text-green-800">
              Password reset. You can now log in.
            </p>
            <Link to="/login" className="block rounded-md bg-indigo-600 py-2 text-center text-sm font-medium text-white">
              Go to log in
            </Link>
          </>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            {error.message && <p className="rounded bg-red-50 p-2 text-sm text-red-700">{error.message}</p>}
            <Field label="New password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} error={error.fields.new_password} required />
            <Field label="Confirm password" type="password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} error={error.fields.confirm} required />
            <button disabled={busy} className="w-full rounded-md bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
              {busy ? 'Saving...' : 'Reset password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}