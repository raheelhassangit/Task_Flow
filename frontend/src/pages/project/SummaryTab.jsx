import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/client'

function Stat({ label, value, tone = 'text-slate-900' }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${tone}`}>{value}</p>
    </div>
  )
}

export default function SummaryTab({ projectId }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['summary', projectId],
    queryFn: () => api.get(`projects/${projectId}/summary/`).then((r) => r.data),
  })

  if (isLoading) return <p className="text-slate-500">Loading...</p>
  if (isError) return <p className="text-red-600">Could not load summary.</p>

  const t = data.tasks

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="Total" value={t.total} />
        <Stat label="To do" value={t.todo} />
        <Stat label="In progress" value={t.in_progress} tone="text-blue-700" />
        <Stat label="Done" value={t.done} tone="text-green-700" />
        <Stat label="Overdue" value={t.overdue} tone={t.overdue ? 'text-red-600' : 'text-slate-900'} />
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <div className="flex justify-between text-sm">
          <span className="font-medium">Completion</span>
          <span className="text-slate-500">{t.completion_rate}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full bg-green-500" style={{ width: `${t.completion_rate}%` }} />
        </div>
        <p className="mt-3 text-xs text-slate-500">
          {data.members} member{data.members === 1 ? '' : 's'} · {data.unassigned_open} open task
          {data.unassigned_open === 1 ? '' : 's'} unassigned
        </p>
      </div>

      <div className="rounded-xl bg-white shadow-sm">
        <h3 className="border-b px-4 py-2 text-sm font-medium">Workload by person</h3>
        {data.by_assignee.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">No assigned tasks yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-slate-500">
              <tr>
                <th className="px-4 py-2">Person</th>
                <th className="px-4 py-2">Open</th>
                <th className="px-4 py-2">Done</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.by_assignee.map((a) => (
                <tr key={a.user_id}>
                  <td className="px-4 py-2">{a.email}</td>
                  <td className="px-4 py-2">{a.open}</td>
                  <td className="px-4 py-2">{a.done}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}