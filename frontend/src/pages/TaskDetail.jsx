import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { parseError } from '../api/errors'
import { useAuth } from '../auth/AuthContext'
import { PriorityBadge, StatusBadge } from '../components/Badges'
import Comments from '../components/Comments'
import { inputClass } from '../components/styles'

const EMPTY_ERROR = { message: '', fields: {} }
const person = (u) => (u ? u.first_name || u.email : 'Unassigned')

export default function TaskDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(null)
  const [error, setError] = useState(EMPTY_ERROR)

  const { data: task, isLoading, error: loadError } = useQuery({
    queryKey: ['task', id],
    queryFn: () => api.get(`tasks/${id}/`).then((r) => r.data),
  })

  const projectId = task ? String(task.project.id) : null

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api.get(`projects/${projectId}/`).then((r) => r.data),
    enabled: !!projectId,
  })

  const { data: members = [] } = useQuery({
    queryKey: ['members', projectId],
    queryFn: () => api.get(`projects/${projectId}/members/`).then((r) => r.data),
    enabled: !!projectId && editing,
  })

  const refreshLists = () => {
    qc.invalidateQueries({ queryKey: ['tasks'] })
    qc.invalidateQueries({ queryKey: ['summary', projectId] })
    qc.invalidateQueries({ queryKey: ['dashboard'] })
  }

  const update = useMutation({
    mutationFn: (payload) => api.patch(`tasks/${id}/`, payload).then((r) => r.data),
    onSuccess: (data) => {
      qc.setQueryData(['task', id], data)
      refreshLists()
      setEditing(false)
      setError(EMPTY_ERROR)
    },
    onError: (err) => setError(parseError(err)),
  })

  const complete = useMutation({
    mutationFn: () => api.post(`tasks/${id}/complete/`).then((r) => r.data),
    onSuccess: (data) => {
      qc.setQueryData(['task', id], data)
      refreshLists()
      setError(EMPTY_ERROR)
    },
    onError: (err) => setError(parseError(err)),
  })

  const remove = useMutation({
    mutationFn: () => api.delete(`tasks/${id}/`),
    onSuccess: () => {
      refreshLists()
      navigate(`/projects/${projectId}`, { replace: true })
    },
    onError: (err) => setError(parseError(err)),
  })

  if (isLoading) return <p className="text-slate-500">Loading...</p>
  if (loadError?.response?.status === 404)
    return (
      <p>
        Task not found. <Link to="/projects" className="text-indigo-600">Back to projects</Link>
      </p>
    )
  if (loadError) return <p className="text-red-600">Could not load task.</p>

  const role = project?.my_role
  const canDelete = role === 'owner' || role === 'admin' || task.created_by?.id === user.id
  const today = new Date().toLocaleDateString('en-CA')
  const overdue = task.due_date && task.due_date < today && task.status !== 'done'

  function startEdit() {
    setForm({
      title: task.title,
      description: task.description ?? '',
      status: task.status,
      priority: task.priority,
      due_date: task.due_date ?? '',
      assigned_to: task.assigned_to?.id ?? '',
    })
    setError(EMPTY_ERROR)
    setEditing(true)
  }

  function onSubmit(e) {
    e.preventDefault()
    setError(EMPTY_ERROR)
    update.mutate({
      title: form.title,
      description: form.description,
      status: form.status,
      priority: form.priority,
      due_date: form.due_date || null,
      assigned_to: form.assigned_to ? Number(form.assigned_to) : null,
    })
  }

  const setF = (key) => (e) => setForm({ ...form, [key]: e.target.value })
  const fe = error.fields

  return (
    <div className="space-y-6">
      <Link to={`/projects/${task.project.id}`} className="text-sm text-slate-500">
        ← {task.project.name}
      </Link>

      {error.message && !editing && (
        <p className="rounded bg-red-50 p-2 text-sm text-red-700">{error.message}</p>
      )}

      {!editing ? (
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h1 className={`text-xl font-semibold ${task.status === 'done' ? 'text-slate-400 line-through' : ''}`}>
              {task.title}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              {task.status !== 'done' && (
                <button
                  onClick={() => complete.mutate()}
                  disabled={complete.isPending}
                  className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  Mark complete
                </button>
              )}
              <button onClick={startEdit} className="rounded-md border px-3 py-1.5 text-sm hover:bg-slate-50">
                Edit
              </button>
              {canDelete && (
                <button
                  onClick={() => {
                    if (confirm(`Delete "${task.title}"?`)) remove.mutate()
                  }}
                  disabled={remove.isPending}
                  className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  Delete
                </button>
              )}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusBadge value={task.status} />
            <PriorityBadge value={task.priority} />
            <select
              value={task.status}
              onChange={(e) => update.mutate({ status: e.target.value })}
              disabled={update.isPending}
              className={`${inputClass} py-1 text-xs`}
              aria-label="Change status"
            >
              <option value="todo">To do</option>
              <option value="in_progress">In progress</option>
              <option value="done">Done</option>
            </select>
          </div>

          {task.description && (
            <p className="mt-4 whitespace-pre-wrap text-sm text-slate-700">{task.description}</p>
          )}

          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-slate-500">Assigned to</dt>
              <dd>{person(task.assigned_to)}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Due date</dt>
              <dd className={overdue ? 'font-medium text-red-600' : ''}>
                {task.due_date ? `${overdue ? 'Overdue · ' : ''}${task.due_date}` : 'No due date'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Created by</dt>
              <dd>{task.created_by ? person(task.created_by) : 'Deleted user'}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Created</dt>
              <dd>{new Date(task.created_at).toLocaleString()}</dd>
            </div>
          </dl>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-3 rounded-xl bg-white p-5 shadow-sm">
          {error.message && <p className="rounded bg-red-50 p-2 text-sm text-red-700">{error.message}</p>}
          <div>
            <input value={form.title} onChange={setF('title')} className={`${inputClass} w-full`} required />
            {fe.title && <p className="mt-1 text-xs text-red-600">{fe.title}</p>}
          </div>
          <textarea value={form.description} onChange={setF('description')} rows={4} className={`${inputClass} w-full`} />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-slate-500">
              Status
              <select value={form.status} onChange={setF('status')} className={`${inputClass} mt-1 w-full`}>
                <option value="todo">To do</option>
                <option value="in_progress">In progress</option>
                <option value="done">Done</option>
              </select>
            </label>
            <label className="text-xs text-slate-500">
              Priority
              <select value={form.priority} onChange={setF('priority')} className={`${inputClass} mt-1 w-full`}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High (needs due date)</option>
              </select>
            </label>
            <label className="text-xs text-slate-500">
              Due date
              <input type="date" value={form.due_date} onChange={setF('due_date')} className={`${inputClass} mt-1 w-full`} />
              {fe.due_date && <span className="mt-1 block text-red-600">{fe.due_date}</span>}
            </label>
            <label className="text-xs text-slate-500">
              Assign to
              <select value={form.assigned_to} onChange={setF('assigned_to')} className={`${inputClass} mt-1 w-full`}>
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.user} value={m.user}>{m.email}</option>
                ))}
              </select>
              {fe.assigned_to && <span className="mt-1 block text-red-600">{fe.assigned_to}</span>}
            </label>
          </div>
          <div className="flex gap-2">
            <button disabled={update.isPending} className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">
              {update.isPending ? 'Saving...' : 'Save'}
            </button>
            <button type="button" onClick={() => setEditing(false)} className="rounded-md border px-3 py-1.5 text-sm">
              Cancel
            </button>
          </div>
        </form>
      )}

      <Comments taskId={id} myRole={role} />
    </div>
  )
}