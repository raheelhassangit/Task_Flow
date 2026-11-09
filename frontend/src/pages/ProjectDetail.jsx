import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import RoleBadge from '../components/RoleBadge'
import TasksTab from './project/TasksTab'
import MembersTab from './project/MembersTab'
import SummaryTab from './project/SummaryTab'

const TABS = [
  ['tasks', 'Tasks'],
  ['members', 'Members'],
  ['summary', 'Summary'],
]

export default function ProjectDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [params, setParams] = useSearchParams()
  const tab = TABS.some(([k]) => k === params.get('tab')) ? params.get('tab') : 'tasks'

  const { data: project, isLoading, error } = useQuery({
    queryKey: ['project', id],
    queryFn: () => api.get(`projects/${id}/`).then((r) => r.data),
  })

  const remove = useMutation({
    mutationFn: () => api.delete(`projects/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      navigate('/projects', { replace: true })
    },
  })

  if (isLoading) return <p className="text-slate-500">Loading...</p>
  if (error?.response?.status === 404)
    return (
      <p>
        Project not found. <Link to="/projects" className="text-indigo-600">Back to projects</Link>
      </p>
    )
  if (error) return <p className="text-red-600">Could not load project.</p>

  const role = project.my_role

  return (
    <div>
      <Link to="/projects" className="text-sm text-slate-500">← Projects</Link>
      <div className="mt-2 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">{project.name}</h1>
            <RoleBadge role={role} />
          </div>
          {project.description && <p className="mt-1 text-slate-600">{project.description}</p>}
        </div>
        {role === 'owner' && (
          <button
            onClick={() => {
              if (confirm(`Delete "${project.name}" and all its tasks? This cannot be undone.`))
                remove.mutate()
            }}
            disabled={remove.isPending}
            className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            Delete project
          </button>
        )}
      </div>

      <div className="mt-5 flex gap-1 border-b">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setParams({ tab: key }, { replace: true })}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
              tab === key
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {tab === 'tasks' && <TasksTab projectId={id} />}
        {tab === 'members' && <MembersTab projectId={id} myRole={role} />}
        {tab === 'summary' && <SummaryTab projectId={id} />}
      </div>
    </div>
  )
}