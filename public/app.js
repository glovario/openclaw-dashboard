/* ─── OpenClaw Dashboard — Frontend ─────────────────────────── */
const API = '/api/tasks';
let tasks = [];
let debounceTimer;

// ─── DOM refs ────────────────────────────────────────────────
const taskList      = document.getElementById('taskList');
const emptyState    = document.getElementById('emptyState');
const searchInput   = document.getElementById('searchInput');
const filterStatus  = document.getElementById('filterStatus');
const filterOwner   = document.getElementById('filterOwner');
const filterPriority= document.getElementById('filterPriority');
const newTaskBtn    = document.getElementById('newTaskBtn');
const modal         = document.getElementById('modal');
const modalBackdrop = document.getElementById('modalBackdrop');
const modalClose    = document.getElementById('modalClose');
const modalTitleEl  = document.getElementById('modalTitle');
const taskForm      = document.getElementById('taskForm');
const deleteBtn     = document.getElementById('deleteBtn');
const cancelBtn     = document.getElementById('cancelBtn');

// Form fields
const fId          = document.getElementById('taskId');
const fTitle       = document.getElementById('fTitle');
const fDescription = document.getElementById('fDescription');
const fStatus      = document.getElementById('fStatus');
const fOwner       = document.getElementById('fOwner');
const fPriority    = document.getElementById('fPriority');
const fGithubUrl   = document.getElementById('fGithubUrl');
const fTags        = document.getElementById('fTags');

// ─── Fetch helpers ───────────────────────────────────────────
async function apiFetch(url, options = {}) {
  options.headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(url, options);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'API error');
  return data;
}

// ─── Load & render ───────────────────────────────────────────
async function loadTasks() {
  const params = new URLSearchParams();
  const s = filterStatus.value;
  const o = filterOwner.value;
  const p = filterPriority.value;
  const q = searchInput.value.trim();
  if (s) params.set('status',   s);
  if (o) params.set('owner',    o);
  if (p) params.set('priority', p);
  if (q) params.set('search',   q);

  try {
    const data = await apiFetch(`${API}?${params}`);
    tasks = data.tasks;
    renderTasks();
  } catch (e) {
    console.error('Failed to load tasks:', e);
  }
}

function renderTasks() {
  taskList.innerHTML = '';
  if (!tasks.length) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  tasks.forEach(task => {
    const card = document.createElement('div');
    card.className = 'task-card';
    card.dataset.id = task.id;

    const tags = task.tags
      ? task.tags.split(',').map(t => t.trim()).filter(Boolean)
          .map(t => `<span class="tag">${escHtml(t)}</span>`).join('')
      : '';

    const githubLink = task.github_url
      ? `<a class="tag" href="${escHtml(task.github_url)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">🔗 GitHub</a>`
      : '';

    const statusLabel = task.status.replace('-', '\u2011'); // non-breaking hyphen

    card.innerHTML = `
      <div class="task-priority-dot ${task.priority}" title="Priority: ${task.priority}"></div>
      <div class="task-title ${task.status === 'done' ? 'done-text' : ''}">${escHtml(task.title)}</div>
      <div class="task-meta">
        <span class="badge badge-status ${task.status}">${statusLabel}</span>
        <span class="badge badge-owner ${task.owner}">${task.owner}</span>
      </div>
      ${task.description ? `<div class="task-desc">${escHtml(task.description)}</div>` : ''}
      ${(tags || githubLink) ? `<div class="task-tags">${tags}${githubLink}</div>` : ''}
    `;

    card.addEventListener('click', () => openEditModal(task));
    taskList.appendChild(card);
  });
}

// ─── Modal helpers ───────────────────────────────────────────
function openModal() {
  modal.classList.remove('hidden');
  setTimeout(() => fTitle.focus(), 50);
}

function closeModal() {
  modal.classList.add('hidden');
  taskForm.reset();
  fId.value = '';
}

function openNewModal() {
  modalTitleEl.textContent = 'New Task';
  deleteBtn.classList.add('hidden');
  fId.value = '';
  fStatus.value = 'backlog';
  fOwner.value = 'matt';
  fPriority.value = 'medium';
  openModal();
}

function openEditModal(task) {
  modalTitleEl.textContent = 'Edit Task';
  deleteBtn.classList.remove('hidden');
  fId.value          = task.id;
  fTitle.value       = task.title;
  fDescription.value = task.description || '';
  fStatus.value      = task.status;
  fOwner.value       = task.owner;
  fPriority.value    = task.priority;
  fGithubUrl.value   = task.github_url || '';
  fTags.value        = task.tags || '';
  openModal();
}

// ─── Form submit (create / update) ───────────────────────────
taskForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = fId.value;
  const body = {
    title:       fTitle.value.trim(),
    description: fDescription.value.trim(),
    status:      fStatus.value,
    owner:       fOwner.value,
    priority:    fPriority.value,
    github_url:  fGithubUrl.value.trim(),
    tags:        fTags.value.trim()
  };

  try {
    if (id) {
      await apiFetch(`${API}/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
    } else {
      await apiFetch(API, { method: 'POST', body: JSON.stringify(body) });
    }
    closeModal();
    loadTasks();
  } catch (e) {
    alert('Error saving task: ' + e.message);
  }
});

// ─── Delete ──────────────────────────────────────────────────
deleteBtn.addEventListener('click', async () => {
  const id = fId.value;
  if (!id) return;
  if (!confirm('Delete this task? This cannot be undone.')) return;
  try {
    await apiFetch(`${API}/${id}`, { method: 'DELETE' });
    closeModal();
    loadTasks();
  } catch (e) {
    alert('Error deleting task: ' + e.message);
  }
});

// ─── Event wiring ────────────────────────────────────────────
newTaskBtn.addEventListener('click', openNewModal);
modalClose.addEventListener('click', closeModal);
cancelBtn.addEventListener('click', closeModal);
modalBackdrop.addEventListener('click', closeModal);

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
  if ((e.key === 'n' || e.key === 'N') && !modal.classList.contains('hidden') === false
      && document.activeElement.tagName !== 'INPUT'
      && document.activeElement.tagName !== 'TEXTAREA') {
    openNewModal();
  }
});

[filterStatus, filterOwner, filterPriority].forEach(el =>
  el.addEventListener('change', loadTasks)
);

searchInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(loadTasks, 280);
});

// ─── Escape HTML ─────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Init ────────────────────────────────────────────────────
loadTasks();
