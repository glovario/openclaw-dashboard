const BASE = '/api/tasks'

export async function fetchTasks(filters = {}) {
  const params = new URLSearchParams()
  if (filters.status)   params.set('status',                   filters.status)
  if (filters.owner)    params.set('owner',                    filters.owner)
  if (filters.priority) params.set('priority',                 filters.priority)
  if (filters.effort)   params.set('estimated_token_effort',   filters.effort)
  if (filters.search)   params.set('search',                   filters.search)
  if (filters.estimated_token_effort) params.set('estimated_token_effort', filters.estimated_token_effort)
  const res = await fetch(`${BASE}?${params}`)
  const data = await res.json()
  if (!data.ok) throw new Error(data.error)
  return data.tasks
}

export async function createTask(body) {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  const data = await res.json()
  if (!data.ok) throw new Error(data.error)
  return data.task
}

export async function updateTask(id, body) {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  const data = await res.json()
  if (!data.ok) throw new Error(data.error)
  return data.task
}

export async function deleteTask(id) {
  const res = await fetch(`${BASE}/${id}`, { method: 'DELETE' })
  const data = await res.json()
  if (!data.ok) throw new Error(data.error)
}
