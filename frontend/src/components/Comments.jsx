import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { parseError } from '../api/errors'
import { useAuth } from '../auth/AuthContext'
import { inputClass } from './styles'

const authorName = (a) => (a ? a.first_name || a.email : 'Deleted user')

export default function Comments({ taskId, myRole }) {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [body, setBody] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editBody, setEditBody] = useState('')
  const [error, setError] = useState('')

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['comments', taskId],
    queryFn: () => api.get(`tasks/${taskId}/comments/`).then((r) => r.data),
  })

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['comments', taskId] })
    qc.invalidateQueries({ queryKey: ['task', taskId] }) // comment_count lives on the task
    qc.invalidateQueries({ queryKey: ['tasks'] })
    setError('')
  }
  const showError = (err) => {
    const { message, fields } = parseError(err)
    setError(message || Object.values(fields).join(' '))
  }

  const add = useMutation({
    mutationFn: (text) => api.post(`tasks/${taskId}/comments/`, { body: text }),
    onSuccess: () => {
      refresh()
      setBody('')
    },
    onError: showError,
  })

  const edit = useMutation({
    mutationFn: ({ id, text }) => api.patch(`comments/${id}/`, { body: text }),
    onSuccess: () => {
      refresh()
      setEditingId(null)
    },
    onError: showError,
  })

  const remove = useMutation({
    mutationFn: (id) => api.delete(`comments/${id}/`),
    onSuccess: refresh,
    onError: showError,
  })

  const canDelete = (c) => c.author?.id === user.id || myRole === 'owner' || myRole === 'admin'
  const wasEdited = (c) => new Date(c.updated_at) - new Date(c.created_at) > 1000

  return (
    <section>
      <h2 className="mb-3 text-lg font-medium">Comments ({comments.length})</h2>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          setError('')
          add.mutate(body)
        }}
        className="mb-4 space-y-2"
      >
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a comment..."
          rows={3}
          className={`${inputClass} w-full`}
          required
        />
        <button disabled={add.isPending || !body.trim()} className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">
          {add.isPending ? 'Posting...' : 'Post comment'}
        </button>
      </form>

      {error && <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      {isLoading && <p className="text-slate-500">Loading...</p>}
      {!isLoading && comments.length === 0 && <p className="text-sm text-slate-500">No comments yet.</p>}

      <ul className="space-y-3">
        {comments.map((c) => (
          <li key={c.id} className="rounded-xl bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
              <span>
                <span className="font-medium text-slate-700">{authorName(c.author)}</span> ·{' '}
                {new Date(c.created_at).toLocaleString()}
                {wasEdited(c) && ' (edited)'}
              </span>
              <span className="flex gap-3">
                {c.author?.id === user.id && editingId !== c.id && (
                  <button
                    onClick={() => {
                      setEditingId(c.id)
                      setEditBody(c.body)
                    }}
                    className="hover:text-slate-900"
                  >
                    Edit
                  </button>
                )}
                {canDelete(c) && (
                  <button
                    onClick={() => {
                      if (confirm('Delete this comment?')) remove.mutate(c.id)
                    }}
                    className="text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                )}
              </span>
            </div>

            {editingId === c.id ? (
              <div className="mt-2 space-y-2">
                <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={3} className={`${inputClass} w-full`} />
                <div className="flex gap-2">
                  <button
                    onClick={() => edit.mutate({ id: c.id, text: editBody })}
                    disabled={edit.isPending || !editBody.trim()}
                    className="rounded-md bg-indigo-600 px-3 py-1 text-sm text-white disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button onClick={() => setEditingId(null)} className="rounded-md border px-3 py-1 text-sm">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{c.body}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}