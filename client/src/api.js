const BASE = '/api/tasks'

function getApiKey() {
  return window.__DASHBOARD_API_KEY__ || ''
}

function authHeaders(extra = {}) {
  return { 'X-API-Key': getApiKey(), ...extra }
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

// OC-037: returns { tasks, total, limit, offset }
export async function fetchTasks(filters = {}) {
  const params = new URLSearchParams()
  if (filters.status)   params.set('status',                   filters.status)
  if (filters.owner)    params.set('owner',                    filters.owner)
  if (filters.priority) params.set('priority',                 filters.priority)
  if (filters.effort)   params.set('estimated_token_effort',   filters.effort)
  if (filters.search)   params.set('search',                   filters.search)
  if (filters.estimated_token_effort) params.set('estimated_token_effort', filters.estimated_token_effort)
  if (filters.limit  != null) params.set('limit',  String(filters.limit))
  if (filters.offset != null) params.set('offset', String(filters.offset))
  const res = await fetch(`${BASE}?${params}`, { headers: authHeaders() })
  const data = await res.json()
  if (!data.ok) throw new Error(data.error)
  return { tasks: data.tasks, total: data.total, limit: data.limit, offset: data.offset }
}

export async function createTask(body) {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body)
  })
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
  const data = await res.json()
  if (!data.ok) throw new Error(data.error)
  return data.task
}

export async function deleteTask(id) {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'DELETE',
    headers: authHeaders()
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

// OC-032: History
export async function fetchHistory(taskId) {
  const res = await fetch(`${BASE}/${taskId}/history`, { headers: authHeaders() })
  const data = await res.json()
  if (!data.ok) throw new Error(data.error)
  return data.history
}

// OC-033: Dependencies
export async function fetchDependencies(taskId) {
  const res = await fetch(`${BASE}/${taskId}/dependencies`, { headers: authHeaders() })
  const data = await res.json()
  if (!data.ok) throw new Error(data.error)
  return data
}

export async function addDependency(taskId, blockedByTaskId) {
  const res = await fetch(`${BASE}/${taskId}/dependencies`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ blocked_by_task_id: blockedByTaskId })
  })
  const data = await res.json()
  if (!data.ok) throw new Error(data.error)
  return data
}

export async function removeDependency(taskId, depId) {
  const res = await fetch(`${BASE}/${taskId}/dependencies/${depId}`, {
    method: 'DELETE',
    headers: authHeaders()
  })
  const data = await res.json()
  if (!data.ok) throw new Error(data.error)
}
