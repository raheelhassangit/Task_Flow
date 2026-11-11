export default function Stat({ label, value, tone = 'text-slate-900', onClick, active }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      onClick={onClick}
      className={`rounded-xl bg-white p-4 text-left shadow-sm ${
        onClick ? 'hover:shadow' : ''
      } ${active ? 'ring-2 ring-indigo-500' : ''}`}
    >
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${tone}`}>{value}</p>
    </Tag>
  )
}