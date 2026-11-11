import { Link } from 'react-router-dom'
import { PriorityBadge, StatusBadge } from './Badges'

export default function TaskRow({ task: t, today }) {
  const overdue = t.due_date && t.due_date < today && t.status !== 'done'
  return (
    <Link to={`/tasks/${t.id}`} className="flex flex-wrap items-center gap-3 rounded-xl bg-white p-3 shadow-sm hover:shadow">
      <span className="min-w-0 flex-1">
        <span className={`block truncate font-medium ${t.status === 'done' ? 'text-slate-400 line-through' : ''}`}>
          {t.title}
        </span>
        <span className="block text-xs text-slate-400">{t.project.name}</span>
      </span>
      <StatusBadge value={t.status} />
      <PriorityBadge value={t.priority} />
      <span className={`w-28 text-xs ${overdue ? 'font-medium text-red-600' : 'text-slate-500'}`}>
        {t.due_date ? `${overdue ? 'Overdue ' : ''}${t.due_date}` : 'No due date'}
      </span>
      <span className="text-xs text-slate-400">💬 {t.comment_count}</span>
    </Link>
  )
}