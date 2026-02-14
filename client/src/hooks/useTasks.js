import { useState, useEffect, useCallback } from 'react';

const API = '/api/tasks';

async function apiFetch(url, options = {}) {
  options.headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(url, options);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'API error');
  return data;
}

export function useTasks(filters) {
  const [tasks, setTasks]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.status)   params.set('status',   filters.status);
      if (filters.owner)    params.set('owner',    filters.owner);
      if (filters.priority) params.set('priority', filters.priority);
      if (filters.search)   params.set('search',   filters.search);
      const data = await apiFetch(`${API}?${params}`);
      setTasks(data.tasks);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [filters.status, filters.owner, filters.priority, filters.search]);

  useEffect(() => { load(); }, [load]);

  const createTask = async (body) => {
    const data = await apiFetch(API, { method: 'POST', body: JSON.stringify(body) });
    await load();
    return data.task;
  };

  const updateTask = async (id, body) => {
    const data = await apiFetch(`${API}/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
    await load();
    return data.task;
  };

  const deleteTask = async (id) => {
    await apiFetch(`${API}/${id}`, { method: 'DELETE' });
    await load();
  };

  return { tasks, loading, error, reload: load, createTask, updateTask, deleteTask };
}
