// Seed starter tasks — run once: node src/seed.js
const { getDb, get, insert, all } = require('./db');

async function seed() {
  await getDb();

  const count = get('SELECT COUNT(*) as n FROM tasks').n;
  if (count > 0) {
    console.log(`Database already has ${count} tasks. Skipping seed.`);
    process.exit(0);
  }

  const tasks = [
    {
      title: 'Improve heartbeat reliability & batching',
      description: 'Heartbeats sometimes fire redundant checks. Refactor HEARTBEAT.md system so multiple periodic checks are batched into fewer API calls. Add state tracking in heartbeat-state.json.',
      status: 'in-progress',
      owner: 'norman',
      priority: 'high',
      github_url: '',
      tags: 'heartbeat,agent-ops,reliability'
    },
    {
      title: 'Agent coordination protocol — shared task awareness',
      description: 'When multiple agents are active, they can duplicate effort. Design a lightweight protocol (e.g. a lock file or dashboard status) so agents can see what others are working on before starting a task.',
      status: 'backlog',
      owner: 'team',
      priority: 'high',
      github_url: '',
      tags: 'coordination,multi-agent,protocol'
    },
    {
      title: 'Build openclaw-dashboard REST API and frontend',
      description: 'Create a Node.js + SQLite task dashboard for the OpenClaw agent team. Mobile-friendly. Agents can update tasks via REST API. Completed by subagent on 2026-02-14.',
      status: 'done',
      owner: 'norman',
      priority: 'high',
      github_url: 'https://github.com/glovario/openclaw-dashboard',
      tags: 'dashboard,tooling,infrastructure'
    },
    {
      title: 'Ada: implement email triage automation',
      description: 'Ada should check glovario@yahoo.co.uk at heartbeat time, flag urgent emails, and draft responses for Matt to review. Needs himalaya CLI integration and a response template system.',
      status: 'backlog',
      owner: 'ada',
      priority: 'medium',
      github_url: '',
      tags: 'email,automation,ada'
    },
    {
      title: 'Mason: GitHub PR review assistant',
      description: 'Mason should be able to fetch open PRs across glovario repos, summarise diffs, and post review comments. Needs gh CLI integration and a PR summary template.',
      status: 'backlog',
      owner: 'mason',
      priority: 'medium',
      github_url: '',
      tags: 'github,pr-review,mason'
    },
    {
      title: 'Atlas: system health monitoring dashboard widget',
      description: 'Atlas should log CPU/RAM/disk metrics periodically and surface alerts if thresholds are breached. Integrate with the task dashboard as a status widget.',
      status: 'backlog',
      owner: 'atlas',
      priority: 'medium',
      github_url: '',
      tags: 'monitoring,system-health,atlas'
    },
    {
      title: 'Bard: daily standup summary generation',
      description: 'Bard generates a short daily standup summary (what was done yesterday, what is planned today, any blockers) by reading recent memory files and task dashboard state. Posts to Telegram.',
      status: 'backlog',
      owner: 'bard',
      priority: 'low',
      github_url: '',
      tags: 'standup,reporting,bard,telegram'
    },
    {
      title: 'MEMORY.md review and update cycle',
      description: 'All agents should periodically review their daily memory logs and distill key learnings into MEMORY.md. Standardise the format and create a shared schema for cross-agent readable memories.',
      status: 'backlog',
      owner: 'team',
      priority: 'medium',
      github_url: '',
      tags: 'memory,documentation,agent-ops'
    },
    {
      title: 'Dashboard: add authentication layer',
      description: 'Add basic auth or token-based auth to the dashboard API so it is safe to expose on the local network. Consider a simple API key header for agent-to-agent calls.',
      status: 'backlog',
      owner: 'matt',
      priority: 'medium',
      github_url: 'https://github.com/glovario/openclaw-dashboard',
      tags: 'security,auth,dashboard'
    },
    {
      title: 'Define agent capability registry',
      description: 'Create a CAPABILITIES.md or JSON registry listing what each agent (Norman, Ada, Mason, Atlas, Bard) is good at, what tools they have access to, and their primary responsibilities. Helps routing tasks to the right agent.',
      status: 'in-progress',
      owner: 'matt',
      priority: 'high',
      github_url: '',
      tags: 'documentation,agent-ops,planning'
    }
  ];

  for (const t of tasks) {
    insert(
      `INSERT INTO tasks (title, description, status, owner, priority, github_url, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [t.title, t.description, t.status, t.owner, t.priority, t.github_url, t.tags]
    );
  }

  console.log(`Seeded ${tasks.length} tasks.`);
}

seed().catch(e => { console.error(e); process.exit(1); });
