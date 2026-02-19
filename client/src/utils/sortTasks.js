const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 }

const EFFORT_ORDER = { unknown: 0, small: 1, medium: 2, large: 3 }

const SORTERS = {
  priority: (a, b) => (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99),
  updated_at: (a, b) => new Date(a.updated_at || 0).getTime() - new Date(b.updated_at || 0).getTime(),
  created_at: (a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime(),
  status: (a, b) => String(a.status || '').localeCompare(String(b.status || '')),
  owner: (a, b) => String(a.owner || '').localeCompare(String(b.owner || '')),
  estimated_token_effort: (a, b) => (EFFORT_ORDER[a.estimated_token_effort] ?? 99) - (EFFORT_ORDER[b.estimated_token_effort] ?? 99),
}

const tieBreak = (a, b) => {
  const byUpdated = new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime()
  if (byUpdated) return byUpdated
  const byCreated = new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  if (byCreated) return byCreated
  return Number(a.id || 0) - Number(b.id || 0)
}

export const SORT_FIELDS = ['priority', 'updated_at', 'created_at', 'status', 'owner', 'estimated_token_effort']

export function sortTasks(tasks, sortField = 'priority', sortDirection = 'asc') {
  const sorter = SORTERS[sortField] || SORTERS.priority
  const sign = sortDirection === 'desc' ? -1 : 1
  return [...tasks].sort((a, b) => {
    const primary = sorter(a, b)
    if (primary !== 0) return primary * sign
    return tieBreak(a, b)
  })
}
