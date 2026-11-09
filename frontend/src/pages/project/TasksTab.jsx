import { useState } from 'react'
import { Link } from 'react-router-dom'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { parseError } from '../../api/errors'
import { useDebounce } from '../../hooks/useDebounce'
import { PriorityBadge, StatusBadge } from '../../components/Badges'
import { inputClass } from '../../components/styles'

const PAGE_SIZE = 20
const EMPTY_FORM = { title: '', description: '', priority: 'medium', due_date: '', assigned_to: '' }
const SORTS = [
  ['-created_at', 'Newest'],
  ['due_date,id', 'Due date'],
  ['-priority_rank,id', 'Priority'],
]

const personName = (u) => (u ? u.first_name || u.email : 'Unassigned')

export default function TasksTab({ projectId }) {
  const qc = useQueryClient()
  const [filters, setFilters] = useState({ status: '', priority: '', search: '', ordering: '-created_at' })
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState({ message: '', fields: {} })

  const search = useDebounce(filters.search)
  const today = new Date().toLocaleDateString('en-CA') // local YYYY-MM-DD

  const params = { project: projectId, page, page_size: PAGE_SIZE, ordering: filters.ordering }
  if (filters.status) params.status = filters.status
  if (filters.priority) params.priority = filters.priority
  if (search) params.search = search

  const { data, isLoading, isError } = useQuery({
    queryKey: ['tasks', projectId, params],
    queryFn: () => api.get('tasks/', { params }).then((r) => r.data),
    placeholderData: keepPreviousData,
  })

  // same key as the Members tab, so this is shared from cache
  const { data: members = [] } = useQuery({
    queryKey: ['members', projectId],
    queryFn: () => api.get(`projects/${projectId}/members/`).then((r) => r.data),
  })

  const create = useMutation({
    mutationFn: (payload) => api.post('tasks/', payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['summary', projectId] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      setForm(EMPTY_FORM)
      setShowForm(false)
      setPage(1)
    },
    onError: (err) => setError(parseError(err)),
  })

  function setFilter(key, value) {
    setFilters({ ...filters, [key]: value })
    setPage(1) // a new filter means page 1 of the new result set
  }

  function onSubmit(e) {
    e.preventDefault()
    setError({ message: '', fields: {} })
    create.mutate({
      project: Number(projectId),
      title: form.title,
      description: form.description,
      priority: form.priority,
      due_date: form.due_date || null,
      assigned_to: form.assigned_to ? Number(form.assigned_to) : null,
    })
  }

  const setF = (key) => (e) => setForm({ ...form, [key]: e.target.value })
  const fe = error.fields
  const totalPages = data ? Math.max(1, Math.ceil(data.count / PAGE_SIZE)) : 1

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={filters.search}
          onChange={(e) => setFilter('search', e.target.value)}
          placeholder="Search tasks..."
          className={`${inputClass} w-48`}
        />
        <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)} className={inputClass}>
          <option value="">All statuses</option>
          <option value="todo">To do</option>
          <option value="in_progress">In progress</option>
          <option value="done">Done</option>
        </select>
        <select value={filters.priority} onChange={(e) => setFilter('priority', e.target.value)} className={inputClass}>
          <option value="">All priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select value={filters.ordering} onChange={(e) => setFilter('ordering', e.target.value)} className={inputClass}>
          {SORTS.map(([v, l]) => (
            <option key={v} value={v}>Sort: {l}</option>
          ))}
        </select>
        <button
          onClick={() => setShowForm(!showForm)}
          className="ml-auto rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          {showForm ? 'Cancel' : 'New task'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={onSubmit} className="mt-4 space-y-3 rounded-xl bg-white p-4 shadow-sm">
          {error.message && <p className="rounded bg-red-50 p-2 text-sm text-red-700">{error.message}</p>}
          <div>
            <input value={form.title} onChange={setF('title')} placeholder="Task title" className={`${inputClass} w-full`} required />
            {fe.title && <p className="mt-1 text-xs text-red-600">{fe.title}</p>}
          </div>
          <textarea value={form.description} onChange={setF('description')} placeholder="Description (optional)" rows={2} className={`${inputClass} w-full`} />
          <div className="grid gap-3 sm:grid-cols-3">
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
              <input type="date" min={today} value={form.due_date} onChange={setF('due_date')} className={`${inputClass} mt-1 w-full`} />
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
          <button disabled={create.isPending} className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">
            {create.isPending ? 'Creating...' : 'Create task'}
          </button>
        </form>
      )}

      <div className="mt-4">
        {isLoading && <p className="text-slate-500">Loading...</p>}
        {isError && <p className="text-red-600">Could not load tasks.</p>}
        {data?.results.length === 0 && (
          <p className="rounded-xl bg-white p-6 text-center text-slate-500">No tasks match.</p>
        )}
        <ul className="space-y-2">
          {data?.results.map((t) => {
            const overdue = t.due_date && t.due_date < today && t.status !== 'done'
            return (
              <li key={t.id}>
                <Link to={`/tasks/${t.id}`} className="flex flex-wrap items-center gap-3 rounded-xl bg-white p-3 shadow-sm hover:shadow">
                  <span className={`min-w-0 flex-1 font-medium ${t.status === 'done' ? 'text-slate-400 line-through' : ''}`}>
                    {t.title}
                  </span>
                  <StatusBadge value={t.status} />
                  <PriorityBadge value={t.priority} />
                  <span className="w-28 truncate text-xs text-slate-500">{personName(t.assigned_to)}</span>
                  <span className={`w-24 text-xs ${overdue ? 'font-medium text-red-600' : 'text-slate-500'}`}>
                    {t.due_date ? `${overdue ? 'Overdue ' : ''}${t.due_date}` : 'No due date'}
                  </span>
                  <span className="text-xs text-slate-400">💬 {t.comment_count}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>

      {data && data.count > PAGE_SIZE && (
        <div className="mt-6 flex items-center justify-center gap-4 text-sm">
          <button disabled={!data.previous} onClick={() => setPage(page - 1)} className="disabled:opacity-40">Previous</button>
          <span className="text-slate-500">Page {page} of {totalPages}</span>
          <button disabled={!data.next} onClick={() => setPage(page + 1)} className="disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  )
}