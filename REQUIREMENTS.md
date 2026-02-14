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

## Other requirements
- REST API for programmatic task updates by agents
- Push to new GitHub repo: `glovario/openclaw-dashboard`
- Seed with 5-10 meaningful starter tasks
