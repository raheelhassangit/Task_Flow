import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { parseError } from '../../api/errors'
import { useAuth } from '../../auth/AuthContext'
import RoleBadge from '../../components/RoleBadge'
import { inputClass } from '../../components/styles'

export default function MembersTab({ projectId, myRole }) {
  const { user } = useAuth()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', role: 'member' })
  const [error, setError] = useState('')

  const isOwner = myRole === 'owner'
  const canAdd = isOwner || myRole === 'admin'

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['members', projectId],
    queryFn: () => api.get(`projects/${projectId}/members/`).then((r) => r.data),
  })

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['members', projectId] })
    qc.invalidateQueries({ queryKey: ['summary', projectId] })
  }
  const showError = (err) => {
    const { message, fields } = parseError(err)
    setError(message || Object.values(fields).join(' '))
  }

  const add = useMutation({
    mutationFn: (payload) => api.post(`projects/${projectId}/members/`, payload),
    onSuccess: () => {
      refresh()
      setForm({ email: '', role: 'member' })
      setError('')
    },
    onError: showError,
  })

  const changeRole = useMutation({
    mutationFn: ({ userId, role }) => api.patch(`projects/${projectId}/members/${userId}/`, { role }),
    onSuccess: () => {
      refresh()
      setError('')
    },
    onError: showError,
  })

  const remove = useMutation({
    mutationFn: (userId) => api.delete(`projects/${projectId}/members/${userId}/`),
    onSuccess: (_, userId) => {
      if (userId === user.id) {
        // we removed ourselves: this project is now invisible to us
        qc.invalidateQueries({ queryKey: ['projects'] })
        navigate('/projects', { replace: true })
      } else {
        refresh()
        setError('')
      }
    },
    onError: showError,
  })

  const canRemove = (m) =>
    m.role !== 'owner' &&
    (m.user === user.id || isOwner || (myRole === 'admin' && m.role === 'member'))

  return (
    <div>
      {canAdd && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setError('')
            add.mutate(form)
          }}
          className="mb-4 flex flex-wrap gap-2 rounded-xl bg-white p-3 shadow-sm"
        >
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="Email of a registered user"
            className={`${inputClass} min-w-56 flex-1`}
            required
          />
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={inputClass}>
            <option value="member">Member</option>
            {isOwner && <option value="admin">Admin</option>}
          </select>
          <button disabled={add.isPending} className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
            {add.isPending ? 'Adding...' : 'Add member'}
          </button>
        </form>
      )}

      {error && <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      {isLoading && <p className="text-slate-500">Loading...</p>}

      <ul className="divide-y rounded-xl bg-white shadow-sm">
        {members.map((m) => (
          <li key={m.user} className="flex items-center gap-3 p-3">
            <span className="min-w-0 flex-1 truncate text-sm">
              {m.email} {m.user === user.id && <span className="text-slate-400">(you)</span>}
            </span>
            {isOwner && m.role !== 'owner' ? (
              <select
                value={m.role}
                onChange={(e) => changeRole.mutate({ userId: m.user, role: e.target.value })}
                className={`${inputClass} py-1`}
              >
                <option value="member">member</option>
                <option value="admin">admin</option>
              </select>
            ) : (
              <RoleBadge role={m.role} />
            )}
            {canRemove(m) && (
              <button
                onClick={() => {
                  const msg = m.user === user.id ? 'Leave this project?' : `Remove ${m.email}?`
                  if (confirm(msg)) remove.mutate(m.user)
                }}
                className="text-sm text-red-600 hover:underline"
              >
                {m.user === user.id ? 'Leave' : 'Remove'}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}