const status = {
  todo: ['To do', 'bg-slate-100 text-slate-700'],
  in_progress: ['In progress', 'bg-blue-100 text-blue-800'],
  done: ['Done', 'bg-green-100 text-green-800'],
}
const priority = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-amber-100 text-amber-800',
  high: 'bg-red-100 text-red-800',
}

export function StatusBadge({ value }) {
  const [label, cls] = status[value] ?? status.todo
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>
}

export function PriorityBadge({ value }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${priority[value] ?? priority.low}`}>
      {value}
    </span>
  )
}