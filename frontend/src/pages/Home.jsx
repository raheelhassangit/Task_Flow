import { useAuth } from '../auth/AuthContext'

export default function Home() {
  const { user, logout } = useAuth()
  return (
    <div className="p-6">
      <p className="text-lg">Welcome, {user.first_name || user.email}</p>
      <button onClick={logout} className="mt-4 rounded-md bg-slate-800 px-3 py-2 text-sm text-white">
        Log out
      </button>
    </div>
  )
}