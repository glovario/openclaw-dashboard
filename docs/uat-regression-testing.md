# UAT & Regression Testing Plan

> OC-097 — Owner: Ada/Norman | Status: Complete (design ready for implementation)

## Goals

- Catch regressions before they hit production
- Validate every release against a production-like dataset
- Provide a clear pass/fail gate that CI can enforce
- Keep the test suite runnable by any team member in under 5 minutes

---

## Test Layers

### 1. Unit Tests (Jest)
**Scope:** Individual functions — DB helpers, validation logic, display_id generation  
**Run:** `npm test`  
**Location:** `tests/unit/`

### 2. API Integration Tests (Supertest + Jest)
**Scope:** Every HTTP endpoint, including error paths, pagination, validation, and audit log  
**Run:** `npm run test:api`  
**Location:** `tests/api/`  
**Data:** In-memory SQLite instance per test run (no file I/O)

### 3. Regression Checklist (Manual / Semi-automated)
**Scope:** End-to-end UI flows against the dev environment with production-like data  
**Run:** Manually before each release, or via Playwright if automated  
**Location:** `tests/regression-checklist.md`

---

## API Test Coverage

Each endpoint must have tests for:

| Endpoint | Happy path | Validation errors | Not found | Auth failure |
|----------|-----------|------------------|-----------|-------------|
| GET /api/tasks | ✓ | n/a | n/a | ✓ |
| GET /api/tasks?status=... | ✓ | n/a | n/a | ✓ |
| GET /api/tasks/:id | ✓ | n/a | ✓ | ✓ |
| POST /api/tasks | ✓ | invalid status/owner/priority/effort | n/a | ✓ |
| PATCH /api/tasks/:id | ✓ | invalid enum values | ✓ | ✓ |
| DELETE /api/tasks/:id | ✓ | n/a | ✓ | ✓ |
| GET /api/tasks/:id/history | ✓ | n/a | ✓ | ✓ |
| GET /api/tasks/:id/dependencies | ✓ | n/a | ✓ | ✓ |
| POST /api/tasks/:id/dependencies | ✓ | self-ref, circular | ✓ | ✓ |
| DELETE /api/tasks/:id/dependencies/:id | ✓ | n/a | n/a | ✓ |
| GET /api/comments/:taskId | ✓ | n/a | ✓ | ✓ |
| POST /api/comments | ✓ | missing body | n/a | ✓ |

---

## Regression Checklist (Manual)

Run against dev environment after each feature branch before raising a PR.

### Setup
- [ ] Dev environment running on port 3421
- [ ] Dev DB seeded from recent production snapshot (`SEED=1 ./scripts/dev-start.sh`)

### Dashboard / Kanban
- [ ] Page loads without JS errors in browser console
- [ ] Kanban columns render with correct task counts
- [ ] Drag-and-drop between columns updates task status
- [ ] Tasks sort by priority within columns
- [ ] "Hide done tasks" toggle works

### Task List
- [ ] Pagination works (next/prev, correct counts)
- [ ] Filter by status, owner, priority returns correct results
- [ ] Search returns relevant results

### Task Create
- [ ] New task form validates required fields
- [ ] Invalid status/owner/priority shows error
- [ ] Created task appears immediately in list

### Task Detail / Edit
- [ ] Task detail modal opens with correct data
- [ ] Edit form pre-fills existing values
- [ ] Saving changes updates the task
- [ ] Audit history tab shows field changes after edits
- [ ] Dependencies section shows blocked-by tasks
- [ ] Sub-tasks (parent_id) visible under parent task

### API Key Auth
- [ ] Request without API key returns 401
- [ ] Request with wrong key returns 401
- [ ] Request with correct key succeeds

### Rate Limiting
- [ ] Sending >100 rapid requests to read endpoint returns 429 with Retry-After
- [ ] Localhost gets higher limit (500/min)

---

## Pass / Fail Criteria

| Gate | Criterion |
|------|-----------|
| Automated (CI) | All Jest tests pass with zero failures |
| Regression (pre-release) | All checklist items checked, zero regressions observed |
| Escalation | Any failure blocks the PR from merging |

---

## CI Integration

Add to `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: ['**']
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: npm ci
      - run: npm test
      - run: npm run test:api
```

PRs to `main` cannot merge without this workflow passing.

---

## Running Locally

```bash
# All tests
npm test

# API tests only
npm run test:api

# Watch mode
npm run test:watch
```

---

## Implementation Checklist

- [ ] Install Jest + Supertest: `npm install --save-dev jest supertest`
- [ ] Add `"test": "jest"` and `"test:api": "jest tests/api"` to `package.json`
- [ ] Create `tests/unit/` directory with DB helper tests
- [ ] Create `tests/api/tasks.test.js` covering the table above
- [ ] Create `.github/workflows/ci.yml`
- [ ] Run first full pass on dev environment and fix any failures

---

*Last updated: 2026-02-17 — Norman (OC-097)*
