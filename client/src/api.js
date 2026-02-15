const BASE = '/api/tasks'

// --- Session token management ---

export function getToken() {
  return sessionStorage.getItem('dashboard_token') || ''
}

export function setToken(token) {
  sessionStorage.setItem('dashboard_token', token)
}

export function clearToken() {
  sessionStorage.removeItem('dashboard_token')
}

export async function login(password) {
  const res = await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  const data = await res.json()
  if (!data.ok) throw new Error(data.error || 'Login failed')
  setToken(data.token)
  return data.token
}

export async function logout() {
  const token = getToken()
  if (token) {
    await fetch('/api/auth/session', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {})
    clearToken()
  }
}

// --- Auth headers ---

function authHeaders(extra = {}) {
  const token = getToken()
  return token
    ? { Authorization: `Bearer ${token}`, ...extra }
    : { ...extra }
}

// --- Generic fetch helper ---

export async function apiFetch(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: authHeaders(options.headers || {}),
  })
  if (res.status === 401) {
    clearToken()
    window.location.reload()
    throw new Error('Session expired')
  }
  const data = await res.json()
  if (!data.ok) throw new Error(data.error || 'Request failed')
  return data
}

// --- Task API ---

export async function fetchTasks(filters = {}) {
  const params = new URLSearchParams()
  if (filters.status)   params.set('status',                   filters.status)
  if (filters.owner)    params.set('owner',                    filters.owner)
  if (filters.priority) params.set('priority',                 filters.priority)
  if (filters.effort)   params.set('estimated_token_effort',   filters.effort)
  if (filters.search)   params.set('search',                   filters.search)
  if (filters.estimated_token_effort) params.set('estimated_token_effort', filters.estimated_token_effort)
  const res = await fetch(`${BASE}?${params}`, { headers: authHeaders() })
  if (res.status === 401) { clearToken(); window.location.reload(); throw new Error('Session expired') }
  const data = await res.json()
  if (!data.ok) throw new Error(data.error)
  return data.tasks
}

export async function createTask(body) {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body)
  })
  if (res.status === 401) { clearToken(); window.location.reload(); throw new Error('Session expired') }
  const data = await res.json()
  if (!data.ok) throw new Error(data.error)
  return data.task
}

export async function updateTask(id, body) {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body)
  })
  if (res.status === 401) { clearToken(); window.location.reload(); throw new Error('Session expired') }
  const data = await res.json()
  if (!data.ok) throw new Error(data.error)
  return data.task
}

export async function deleteTask(id) {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'DELETE',
    headers: authHeaders()
  })
  if (res.status === 401) { clearToken(); window.location.reload(); throw new Error('Session expired') }
  const data = await res.json()
  if (!data.ok) throw new Error(data.error)
}

export async function fetchComments(taskId) {
  const res = await fetch(`${BASE}/${taskId}/comments`, { headers: authHeaders() })
  if (res.status === 401) { clearToken(); window.location.reload(); throw new Error('Session expired') }
  const data = await res.json()
  if (!data.ok) throw new Error(data.error)
  return data.comments
}

export async function addComment(taskId, body) {
  const res = await fetch(`${BASE}/${taskId}/comments`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body)
  })
  if (res.status === 401) { clearToken(); window.location.reload(); throw new Error('Session expired') }
  const data = await res.json()
  if (!data.ok) throw new Error(data.error)
  return data.comment
}
