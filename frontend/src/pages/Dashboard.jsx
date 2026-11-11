import { useState } from 'react'
import { Link } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import Stat from '../components/Stat'
import TaskRow from '../components/TaskRow'

const PAGE_SIZE = 10
const CHIPS = [
  ['overdue', 'Overdue', { overdue: true }],
  ['todo', 'To do', { status: 'todo' }],
  ['in_progress', 'In progress', { status: 'in_progress' }],
  ['done', 'Done', { status: 'done' }],
]

function MyTasks() {
  const [chip, setChip] = useState('todo')
  const [page, setPage] = useState(1)
  const today = new Date().toLocaleDateString('en-CA')

  const filter = CHIPS.find(([k]) => k === chip)[2]
  const params = {
    ...filter,
    page,
    page_size: PAGE_SIZE,
    ordering: chip === 'done' ? '-created_at' : 'due_date,id',
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['tasks', 'my', params],
    queryFn: () => api.get('tasks/my/', { params }).then((r) => r.data),
    placeholderData: keepPreviousData,
  })

  const totalPages = data ? Math.max(1, Math.ceil(data.count / PAGE_SIZE)) : 1

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-medium">My tasks</h2>
        <div className="flex gap-1">
          {CHIPS.map(([key, label]) => (
            <button
              key={key}
              onClick={() => {
                setChip(key)
                setPage(1)
              }}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                chip === key ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 shadow-sm hover:bg-slate-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3">
        {isLoading && <p className="text-slate-500">Loading...</p>}
        {isError && <p className="text-red-600">Could not load your tasks.</p>}
        {data?.results.length === 0 && (
          <p className="rounded-xl bg-white p-6 text-center text-sm text-slate-500">Nothing here. 🎉</p>
        )}
        <ul className="space-y-2">
          {data?.results.map((t) => (
            <li key={t.id}>
              <TaskRow task={t} today={today} />
            </li>
          ))}
        </ul>
      </div>

      {data && data.count > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-center gap-4 text-sm">
          <button disabled={!data.previous} onClick={() => setPage(page - 1)} className="disabled:opacity-40">Previous</button>
          <span className="text-slate-500">Page {page} of {totalPages}</span>
          <button disabled={!data.next} onClick={() => setPage(page + 1)} className="disabled:opacity-40">Next</button>
        </div>
      )}
    </section>
  )
}

export default function Dashboard() {
  const { user } = useAuth()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('dashboard/').then((r) => r.data),
  })

  if (isLoading) return <p className="text-slate-500">Loading...</p>
  if (isError) return <p className="text-red-600">Could not load the dashboard.</p>

  const { overall, mine, projects } = data

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold">Hello, {user.first_name || user.email}</h1>

      <section>
        <h2 className="mb-3 text-sm font-medium text-slate-500">Assigned to me</h2>
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Open" value={mine.open} />
          <Stat label="Overdue" value={mine.overdue} tone={mine.overdue ? 'text-red-600' : 'text-slate-900'} />
          <Stat label="Due in 7 days" value={mine.due_this_week} tone="text-amber-600" />
        </div>
      </section>

      <MyTasks />

      <section>
        <h2 className="mb-3 text-sm font-medium text-slate-500">All my projects</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Stat label="Total" value={overall.total} />
          <Stat label="To do" value={overall.todo} />
          <Stat label="In progress" value={overall.in_progress} tone="text-blue-700" />
          <Stat label="Done" value={overall.done} tone="text-green-700" />
          <Stat label="Overdue" value={overall.overdue} tone={overall.overdue ? 'text-red-600' : 'text-slate-900'} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium">Project progress</h2>
        {projects.length === 0 ? (
          <p className="rounded-xl bg-white p-6 text-center text-sm text-slate-500">
            No projects yet. <Link to="/projects" className="text-indigo-600">Create your first one.</Link>
          </p>
        ) : (
          <ul className="space-y-2">
            {projects.map((p) => (
              <li key={p.id}>
                <Link to={`/projects/${p.id}`} className="block rounded-xl bg-white p-3 shadow-sm hover:shadow">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{p.name}</span>
                    <span className="text-xs text-slate-500">
                      {p.done}/{p.total} done
                      {p.overdue > 0 && <span className="ml-2 font-medium text-red-600">{p.overdue} overdue</span>}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full bg-green-500" style={{ width: `${p.completion_rate}%` }} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}