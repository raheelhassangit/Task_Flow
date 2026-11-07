import { createContext, useContext, useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api, tokens, setAuthFailureHandler } from '../api/client'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const qc = useQueryClient()
  const [user, setUser] = useState(null)
  const [booting, setBooting] = useState(true)

  useEffect(() => {
    // If a refresh ever fails mid-session, drop to logged-out state
    setAuthFailureHandler(() => {
      qc.clear()
      setUser(null)
    })

    if (!tokens.refresh) {
      setBooting(false)
      return
    }
    api
      .get('auth/me/')
      .then(({ data }) => setUser(data))
      .catch(() => {})
      .finally(() => setBooting(false))
  }, [qc])

  async function login(email, password) {
    const { data } = await api.post('auth/login/', { email, password })
    tokens.set(data.access, data.refresh)
    const me = await api.get('auth/me/')
    setUser(me.data)
  }

  async function register(payload) {
    await api.post('auth/register/', payload) // returns the user, no tokens
    await login(payload.email, payload.password)
  }

  async function logout() {
    try {
      await api.post('auth/logout/', { refresh: tokens.refresh })
    } catch {
      /* even if the server call fails, log out locally */
    }
    tokens.clear()
    qc.clear() // wipe cached data so the next user doesn't see it
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, booting, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}