import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { parseError } from '../api/errors'
import Field from '../components/Field'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState({ message: '', fields: {} })
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError({ message: '', fields: {} })
    try {
      await api.post('auth/password-reset/', { email })
      setSent(true)
    } catch (err) {
      setError(parseError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm space-y-4 rounded-xl bg-white p-6 shadow">
        <h1 className="text-xl font-semibold">Reset your password</h1>
        {sent ? (
          <>
            <p className="rounded bg-green-50 p-3 text-sm text-green-800">
              If that email is registered, a reset link has been sent. It is valid for 1 hour.
            </p>
            <Link to="/login" className="block text-center text-sm text-indigo-600">Back to log in</Link>
          </>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            {error.message && <p className="rounded bg-red-50 p-2 text-sm text-red-700">{error.message}</p>}
            <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={error.fields.email} required />
            <button disabled={busy} className="w-full rounded-md bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
              {busy ? 'Sending...' : 'Send reset link'}
            </button>
            <Link to="/login" className="block text-center text-sm text-slate-600">Back to log in</Link>
          </form>
        )}
      </div>
    </div>
  )
}