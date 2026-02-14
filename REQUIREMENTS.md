# Dashboard Requirements

## Stack
- **Frontend:** React + Bootstrap 5 (Vite preferred for build tooling)
- **Backend:** Node.js + Express
- **Database:** SQLite

## Frontend notes
- Mobile-friendly / responsive (Bootstrap handles this)
- React for component-based UI
- Bootstrap 5 for styling — no custom CSS frameworks

## Task schema (minimum)
- id, title, description, status (backlog/in-progress/review/done), owner (norman/ada/mason/atlas/bard/matt), priority (low/medium/high), github_url, tags, created_at, updated_at

## Token effort estimation (GitHub issue #1)
- Add `estimated_token_effort` field to task schema (backend + API)
- Tiers: Small (<2,000), Medium (2,000–8,000), Large (8,000+)
- Required field — tasks cannot be created without it (API validation + form)
- Visible in UI as a badge/label on task cards and detail view
- Update seed data to include token effort on all tasks
- Close issue #1 via PR

## Other requirements
- REST API for programmatic task updates by agents
- Push to new GitHub repo: `glovario/openclaw-dashboard`
- Seed with 5-10 meaningful starter tasks
