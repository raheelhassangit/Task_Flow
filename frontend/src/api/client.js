import axios from 'axios'

const REFRESH_KEY = 'taskflow_refresh'
let accessToken = null
let onAuthFailure = () => {}

export const tokens = {
  get refresh() {
    return localStorage.getItem(REFRESH_KEY)
  },
  set(access, refresh) {
    accessToken = access
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh)
  },
  clear() {
    accessToken = null
    localStorage.removeItem(REFRESH_KEY)
  },
}

export const setAuthFailureHandler = (fn) => {
  onAuthFailure = fn
}

export const api = axios.create({ baseURL: '/api/v1' })

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  return config
})

// One shared refresh for all requests that fail at the same time
let refreshing = null
function refreshAccess() {
  if (!refreshing) {
    refreshing = axios
      .post('/api/v1/auth/token/refresh/', { refresh: tokens.refresh })
      .then(({ data }) => {
        tokens.set(data.access, data.refresh) // rotation: save the NEW refresh too
        return data.access
      })
      .finally(() => {
        refreshing = null
      })
  }
  return refreshing
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { response, config } = error
    const url = config?.url ?? ''
    const isAuthCall = url.includes('auth/login/') || url.includes('auth/token/refresh/')

    if (response?.status === 401 && !config._retry && !isAuthCall && tokens.refresh) {
      config._retry = true // never retry the same request twice
      try {
        await refreshAccess()
        return api(config) // request interceptor attaches the new access token
      } catch {
        tokens.clear()
        onAuthFailure()
      }
    }
    return Promise.reject(error)
  }
)