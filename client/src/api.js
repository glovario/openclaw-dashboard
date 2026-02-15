const BASE = '/api/tasks'

function getApiKey() {
  return window.__DASHBOARD_API_KEY__ || ''
}

function authHeaders(extra = {}) {
  return { 'X-API-Key': getApiKey(), ...extra }
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
