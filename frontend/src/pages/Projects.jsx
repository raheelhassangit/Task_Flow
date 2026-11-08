import { useState } from 'react'
import { Link } from 'react-router-dom'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { parseError } from '../api/errors'
import Field from '../components/Field'
import RoleBadge from '../components/RoleBadge'

const PAGE_SIZE = 20

export default function Projects() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', description: '' })
  const [error, setError] = useState({ message: '', fields: {} })

  const { data, isLoading, isError } = useQuery({
    queryKey: ['projects', page],
    queryFn: () => api.get('projects/', { params: { page } }).then((r) => r.data),
    placeholderData: keepPreviousData,
  })

  const create = useMutation({
    mutationFn: (payload) => api.post('projects/', payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      setForm({ name: '', description: '' })
      setShowForm(false)
      setPage(1)
    },
    onError: (err) => setError(parseError(err)),
  })

  function onSubmit(e) {
    e.preventDefault()
    setError({ message: '', fields: {} })
    create.mutate(form)
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.count / PAGE_SIZE)) : 1

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Projects</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          {showForm ? 'Cancel' : 'New project'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={onSubmit} className="mt-4 space-y-3 rounded-xl bg-white p-4 shadow-sm">
          {error.message && <p className="rounded bg-red-50 p-2 text-sm text-red-700">{error.message}</p>}
          <Field label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={error.fields.name} maxLength={150} required />
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Description</span>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </label>
          <button
            disabled={create.isPending}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {create.isPending ? 'Creating...' : 'Create project'}
          </button>
        </form>
      )}

      <div className="mt-4">
        {isLoading && <p className="text-slate-500">Loading...</p>}
        {isError && <p className="text-red-600">Could not load projects.</p>}
        {data?.results.length === 0 && (
          <p className="rounded-xl bg-white p-6 text-center text-slate-500">
            No projects yet. Create your first one.
          </p>
        )}
        <ul className="grid gap-3 sm:grid-cols-2">
          {data?.results.map((p) => (
            <li key={p.id}>
              <Link to={`/projects/${p.id}`} className="block rounded-xl bg-white p-4 shadow-sm hover:shadow">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-medium">{p.name}</h2>
                  <RoleBadge role={p.my_role} />
                </div>
                {p.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500">{p.description}</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {data && data.count > PAGE_SIZE && (
        <div className="mt-6 flex items-center justify-center gap-4 text-sm">
          <button disabled={!data.previous} onClick={() => setPage(page - 1)} className="disabled:opacity-40">
            Previous
          </button>
          <span className="text-slate-500">
            Page {page} of {totalPages}
          </span>
          <button disabled={!data.next} onClick={() => setPage(page + 1)} className="disabled:opacity-40">
            Next
          </button>
        </div>
      )}
    </div>
  )
}