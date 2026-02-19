const BASE = '/api/tasks'

function getApiKey() {
  return window.__DASHBOARD_API_KEY__ || ''
}

function getActor() {
  return window.localStorage.getItem('dashboard_actor') || 'matt'
}

function authHeaders(extra = {}) {
  return { 'X-API-Key': getApiKey(), ...extra }
}

function writeHeaders(extra = {}) {
  return authHeaders({ 'X-Author': getActor(), ...extra })
}

export async function apiFetch(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: authHeaders(options.headers || {}),
  })
  const data = await res.json()
  if (!data.ok) throw new Error(data.error || 'Request failed')
  return data
}

export async function fetchTasks(filters = {}) {
  const params = new URLSearchParams()
  if (filters.status)   params.set('status',                   filters.status)
  if (filters.owner)    params.set('owner',                    filters.owner)
  if (filters.priority) params.set('priority',                 filters.priority)
  if (filters.effort)   params.set('estimated_token_effort',   filters.effort)
  if (filters.search)   params.set('search',                   filters.search)
  if (filters.estimated_token_effort) params.set('estimated_token_effort', filters.estimated_token_effort)
  const res = await fetch(`${BASE}?${params}`, { headers: authHeaders() })
  const data = await res.json()
  if (!data.ok) throw new Error(data.error)
  return data.tasks
}

export async function createTask(body) {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: writeHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body)
  })
  const data = await res.json()
  if (!data.ok) throw new Error(data.error)
  return data.task
}

export async function updateTask(id, body) {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'PATCH',
    headers: writeHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body)
  })
  const data = await res.json()
  if (!data.ok) throw new Error(data.error)
  return data.task
}

export async function deleteTask(id) {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'DELETE',
    headers: writeHeaders()
  })
  const data = await res.json()
  if (!data.ok) throw new Error(data.error)
}

export async function fetchComments(taskId) {
  const res = await fetch(`${BASE}/${taskId}/comments`, { headers: authHeaders() })
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
  const data = await res.json()
  if (!data.ok) throw new Error(data.error)
  return data.comment
}

export async function fetchTaskHistory(taskId, limit = 50) {
  const res = await fetch(`${BASE}/${taskId}/history?limit=${limit}`, { headers: authHeaders() })
  const data = await res.json()
  if (!data.ok) throw new Error(data.error)
  return data.history || []
}

export async function fetchTaskDependencies(taskId) {
  const res = await fetch(`${BASE}/${taskId}/dependencies`, { headers: authHeaders() })
  const data = await res.json()
  if (!data.ok) throw new Error(data.error)
  return data.dependencies || []
}

export async function addTaskDependency(taskId, blockedById) {
  const res = await fetch(`${BASE}/${taskId}/dependencies`, {
    method: 'POST',
    headers: writeHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ blocked_by: blockedById })
  })
  const data = await res.json()
  if (!data.ok) throw new Error(data.error)
  return true
}

export async function removeTaskDependency(taskId, blockerId) {
  const res = await fetch(`${BASE}/${taskId}/dependencies/${blockerId}`, {
    method: 'DELETE',
    headers: writeHeaders()
  })
  const data = await res.json()
  if (!data.ok) throw new Error(data.error)
  return true
}

export async function fetchTokenReport(filters = {}) {
  const params = new URLSearchParams()
  if (filters.window) params.set('window', filters.window)
  if (filters.start) params.set('start', filters.start)
  if (filters.end) params.set('end', filters.end)
  if (typeof filters.include_unlinked !== 'undefined') {
    params.set('include_unlinked', String(filters.include_unlinked))
  }
  const q = params.toString()
  const data = await apiFetch(`/api/reports/tokens${q ? `?${q}` : ''}`)
  return data
}
