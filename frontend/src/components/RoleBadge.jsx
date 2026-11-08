const styles = {
  owner: 'bg-amber-100 text-amber-800',
  admin: 'bg-indigo-100 text-indigo-800',
  member: 'bg-slate-100 text-slate-700',
}

export default function RoleBadge({ role }) {
  if (!role) return null
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[role] ?? styles.member}`}>
      {role}
    </span>
  )
}