import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import RoleBadge from '../components/RoleBadge'

export default function ProjectDetail() {
  const { id } = useParams()
  const { data: project, isLoading, error } = useQuery({
    queryKey: ['project', id],
    queryFn: () => api.get(`projects/${id}/`).then((r) => r.data),
  })

  if (isLoading) return <p className="text-slate-500">Loading...</p>
  if (error?.response?.status === 404)
    return (
      <p>
        Project not found. <Link to="/projects" className="text-indigo-600">Back to projects</Link>
      </p>
    )
  if (error) return <p className="text-red-600">Could not load project.</p>

  return (
    <div>
      <Link to="/projects" className="text-sm text-slate-500">← Projects</Link>
      <div className="mt-2 flex items-center gap-3">
        <h1 className="text-xl font-semibold">{project.name}</h1>
        <RoleBadge role={project.my_role} />
      </div>
      <p className="mt-1 text-slate-600">{project.description}</p>
    </div>
  )
}