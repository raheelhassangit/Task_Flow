import { useState } from 'react'
import { api, tokens } from '../api/client'
import { parseError } from '../api/errors'
import { useAuth } from '../auth/AuthContext'
import Field from '../components/Field'

const NO_ERROR = { message: '', fields: {} }

function ProfileForm() {
  const { user, updateUser } = useAuth()
  const [form, setForm] = useState({ first_name: user.first_name, last_name: user.last_name })
  const [error, setError] = useState(NO_ERROR)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setSaved(false)
    setError(NO_ERROR)
    try {
      const { data } = await api.patch('auth/me/', form)
      updateUser(data) // the navbar name updates too
      setSaved(true)
    } catch (err) {
      setError(parseError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl bg-white p-5 shadow-sm">
      <h2 className="text-lg font-medium">Profile</h2>
      {error.message && <p className="rounded bg-red-50 p-2 text-sm text-red-700">{error.message}</p>}
      {saved && <p className="rounded bg-green-50 p-2 text-sm text-green-800">Saved.</p>}
      <Field label="Email" value={user.email} disabled readOnly />
      <div className="grid grid-cols-2 gap-3">
        <Field label="First name" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} error={error.fields.first_name} />
        <Field label="Last name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} error={error.fields.last_name} />
      </div>
      <p className="text-xs text-slate-500">Joined {new Date(user.date_joined).toLocaleDateString()}</p>
      <button disabled={busy} className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">
        {busy ? 'Saving...' : 'Save changes'}
      </button>
    </form>
  )
}

function PasswordForm() {
  const { user } = useAuth()
  const [form, setForm] = useState({ old: '', next: '', confirm: '' })
  const [error, setError] = useState(NO_ERROR)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setDone(false)
    setError(NO_ERROR)
    if (form.next !== form.confirm) {
      setError({ message: '', fields: { confirm: 'Passwords do not match.' } })
      return
    }
    setBusy(true)
    try {
      await api.post('auth/change-password/', { old_password: form.old, new_password: form.next })
      // The server just blacklisted every refresh token, including ours.
      // Log in again quietly so this browser keeps a working session.
      const { data } = await api.post('auth/login/', { email: user.email, password: form.next })
      tokens.set(data.access, data.refresh)
      setForm({ old: '', next: '', confirm: '' })
      setDone(true)
    } catch (err) {
      setError(parseError(err))
    } finally {
      setBusy(false)
    }
  }

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl bg-white p-5 shadow-sm">
      <h2 className="text-lg font-medium">Change password</h2>
      {error.message && <p className="rounded bg-red-50 p-2 text-sm text-red-700">{error.message}</p>}
      {done && (
        <p className="rounded bg-green-50 p-2 text-sm text-green-800">
          Password changed. Your other devices have been logged out.
        </p>
      )}
      <Field label="Current password" type="password" value={form.old} onChange={set('old')} error={error.fields.old_password} required />
      <Field label="New password" type="password" value={form.next} onChange={set('next')} error={error.fields.new_password} required />
      <Field label="Confirm new password" type="password" value={form.confirm} onChange={set('confirm')} error={error.fields.confirm} required />
      <button disabled={busy} className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">
        {busy ? 'Changing...' : 'Change password'}
      </button>
    </form>
  )
}

export default function Profile() {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-xl font-semibold">Your account</h1>
      <ProfileForm />
      <PasswordForm />
    </div>
  )
}