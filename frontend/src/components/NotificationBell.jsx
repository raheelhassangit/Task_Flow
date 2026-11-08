import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: unread = 0 } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => api.get('notifications/unread-count/').then((r) => r.data.unread),
    refetchInterval: 30_000,
  })

  const { data: list, isLoading } = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: () => api.get('notifications/').then((r) => r.data.results),
    enabled: open, // only fetch when the dropdown is open
  })

  const refresh = () => qc.invalidateQueries({ queryKey: ['notifications'] })

  const markRead = useMutation({
    mutationFn: (id) => api.post(`notifications/${id}/read/`),
    onSuccess: refresh,
  })
  const markAll = useMutation({
    mutationFn: () => api.post('notifications/read-all/'),
    onSuccess: refresh,
  })

  function onClickItem(n) {
    if (!n.is_read) markRead.mutate(n.id)
    setOpen(false)
    if (n.task) navigate(`/tasks/${n.task.id}`)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-full p-2 hover:bg-slate-100"
        aria-label="Notifications"
      >
        <svg className="h-5 w-5 text-slate-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0a3 3 0 11-6 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 min-w-5 rounded-full bg-red-500 px-1 text-center text-xs font-medium text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-80 rounded-lg border bg-white shadow-lg">
            <div className="flex items-center justify-between border-b px-3 py-2">
              <span className="text-sm font-medium">Notifications</span>
              {unread > 0 && (
                <button onClick={() => markAll.mutate()} className="text-xs text-indigo-600">
                  Mark all read
                </button>
              )}
            </div>
            <ul className="max-h-96 divide-y overflow-y-auto">
              {isLoading && <li className="p-3 text-sm text-slate-500">Loading...</li>}
              {list?.length === 0 && <li className="p-3 text-sm text-slate-500">Nothing yet.</li>}
              {list?.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => onClickItem(n)}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                      n.is_read ? 'text-slate-500' : 'bg-indigo-50/50 font-medium text-slate-900'
                    }`}
                  >
                    {n.message}
                    <span className="mt-0.5 block text-xs font-normal text-slate-400">
                      {new Date(n.created_at).toLocaleString()}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}