# Model Selection Advisor — Design Document

**Author:** Ada (Architect)  
**Date:** 2026-02-15  
**Status:** Draft  
**Task:** #24

---

## Overview

The Model Selection Advisor recommends the optimal LLM (or model combination) for a given task, balancing cost and quality. It is exposed as a lightweight API endpoint and surfaced in the dashboard UI wherever tasks are created or edited.

---

## 1. Routing Rules — Decision Matrix

### Model Roster

| Model ID | Alias | Cost Tier | Best For |
|---|---|---|---|
| `anthropic/claude-haiku-4-5` | Haiku | 💚 Cheap | Simple, fast, high-volume |
| `anthropic/claude-sonnet-4-5` | Sonnet | 💛 Mid | General purpose, balanced |
| `anthropic/claude-opus-4-6` | Opus | 🔴 Expensive | Complex reasoning, high-stakes |
| `google/gemini-3-pro-preview` | Gemini | 💛 Mid | Fallback / alternative / long context |

### Decision Matrix

| Task Type | Small (S) | Medium (M) | Large (L) |
|---|---|---|---|
| **coding** | Haiku | Sonnet | Opus |
| **writing** | Haiku | Sonnet | Sonnet* |
| **ops** | Haiku | Haiku | Sonnet |
| **planning** | Sonnet | Sonnet | Opus |
| **quick_lookup** | Haiku | Haiku | Gemini |
| **research** | Haiku | Sonnet | Gemini |
| **analysis** | Sonnet | Sonnet | Opus |

> *Writing/Large uses Sonnet (not Opus) because writing quality plateaus; Opus adds cost without proportional gain.

### Effort Tier Definitions

| Tier | Signal |
|---|---|
| **Small** | < 30 min estimated, single-step, no code review, no external dependencies |
| **Medium** | 30 min – 4 h, multi-step, moderate context required |
| **Large** | > 4 h, multi-agent, cross-domain reasoning, high-stakes output |

### Fallback Logic

1. If the primary model is unavailable → fall back to Gemini.
2. If Gemini is unavailable → fall back to Sonnet.
3. Never auto-escalate to Opus unless explicitly requested.

---

## 2. Dashboard Integration

### 2a. Task Form — "Recommended Model" Field

On the **Create / Edit Task** form, add:

- A **`Task Type`** dropdown (coding, writing, ops, planning, quick_lookup, research, analysis).
- An **`Effort`** dropdown (Small / Medium / Large) — already exists or maps to existing `priority` field (see §4).
- A **`Recommended Model`** read-only badge, auto-populated via the API on change.
- A **`Override Model`** optional dropdown (all models listed) if the user wants to deviate.

**UX flow:**
```
User selects Task Type + Effort
  → Frontend calls GET /api/recommend-model?taskType=X&effort=Y
  → Badge updates: "✨ Recommended: Claude Sonnet"
  → User can optionally override
  → Saved value: override if set, else recommended
```

### 2b. Task List / Board View

- Each task card shows a small model badge (e.g. `🟡 Sonnet`).
- Colour coding: green = Haiku, yellow = Sonnet/Gemini, red = Opus.
- Hovering the badge shows reasoning: *"Sonnet recommended for medium coding tasks."*

### 2c. Advisor Panel (Optional — Phase 2)

A collapsible sidebar panel on the task detail view:

- Shows the full reasoning chain (task type + effort → model).
- Estimated cost comparison (e.g. "Haiku: $0.002 | Sonnet: $0.018 | Opus: $0.12").
- "Use this model" button.

---

## 3. API Design

### Endpoint

```
GET /api/recommend-model
```

### Query Parameters

| Param | Type | Required | Values |
|---|---|---|---|
| `taskType` | string | ✅ | `coding`, `writing`, `ops`, `planning`, `quick_lookup`, `research`, `analysis` |
| `effort` | string | ✅ | `small`, `medium`, `large` |
| `excludeModels` | string (CSV) | ❌ | Comma-separated model IDs to exclude |

### Response — 200 OK

```json
{
  "recommended": {
    "modelId": "anthropic/claude-sonnet-4-5",
    "alias": "Sonnet",
    "reason": "Balanced model suited for medium-effort coding tasks.",
    "costTier": "mid"
  },
  "alternatives": [
    {
      "modelId": "anthropic/claude-haiku-4-5",
      "alias": "Haiku",
      "reason": "Cheaper option; may miss nuance on complex code.",
      "costTier": "cheap"
    },
    {
      "modelId": "google/gemini-3-pro-preview",
      "alias": "Gemini",
      "reason": "Fallback alternative with similar capability.",
      "costTier": "mid"
    }
  ],
  "matrix": {
    "taskType": "coding",
    "effort": "medium"
  }
}
```

### Response — 400 Bad Request

```json
{
  "error": "Invalid taskType: 'foo'. Valid values: coding, writing, ops, planning, quick_lookup, research, analysis."
}
```

### Auth

- **Public read** (no API key required) — recommendation logic is not sensitive.
- Future: optionally gated if cost-estimation features are added.

---

## 4. Data Model

### New: `model_recommendations` table (optional audit log)

```sql
CREATE TABLE model_recommendations (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id     INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
  task_type   TEXT NOT NULL,
  effort      TEXT NOT NULL,
  recommended TEXT NOT NULL,   -- model ID
  override    TEXT,            -- model ID if user overrode
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

> This is optional for Phase 1. It enables future analytics (e.g. "how often do users override Haiku?").

### Changes to `tasks` table

Add two columns:

```sql
ALTER TABLE tasks ADD COLUMN task_type TEXT;       -- coding | writing | ops | planning | quick_lookup | research | analysis
ALTER TABLE tasks ADD COLUMN assigned_model TEXT;  -- model ID actually used (recommended or overridden)
```

> `effort` can map from the existing `priority` field: `low → small`, `medium → medium`, `high → large`. No schema change needed unless we want them decoupled.

### Routing Matrix Config (JSON — no DB needed)

Store the matrix as a static JSON file or in-memory constant in the API layer:

```json
{
  "coding":       { "small": "anthropic/claude-haiku-4-5", "medium": "anthropic/claude-sonnet-4-5", "large": "anthropic/claude-opus-4-6" },
  "writing":      { "small": "anthropic/claude-haiku-4-5", "medium": "anthropic/claude-sonnet-4-5", "large": "anthropic/claude-sonnet-4-5" },
  "ops":          { "small": "anthropic/claude-haiku-4-5", "medium": "anthropic/claude-haiku-4-5",  "large": "anthropic/claude-sonnet-4-5" },
  "planning":     { "small": "anthropic/claude-sonnet-4-5","medium": "anthropic/claude-sonnet-4-5", "large": "anthropic/claude-opus-4-6"  },
  "quick_lookup": { "small": "anthropic/claude-haiku-4-5", "medium": "anthropic/claude-haiku-4-5",  "large": "google/gemini-3-pro-preview" },
  "research":     { "small": "anthropic/claude-haiku-4-5", "medium": "anthropic/claude-sonnet-4-5", "large": "google/gemini-3-pro-preview" },
  "analysis":     { "small": "anthropic/claude-sonnet-4-5","medium": "anthropic/claude-sonnet-4-5", "large": "anthropic/claude-opus-4-6"  }
}
```

---

## 5. Implementation Steps (for Mason)

Ordered build plan — each step is independently shippable.

### Step 1 — Static routing config (30 min)
- Create `server/lib/modelMatrix.js` (or `.ts`) containing the JSON matrix above.
- Export a `recommendModel(taskType, effort, excludeModels?)` function.
- Unit test: all 21 matrix cells return a valid model ID.

### Step 2 — API endpoint (1 h)
- Add route `GET /api/recommend-model` in the Express/Hono router.
- Validate `taskType` and `effort` params; return 400 on invalid input.
- Call `recommendModel()`, build the response shape from §3.
- Populate `alternatives` as the other models not chosen (hardcoded ranked list).
- Populate `reason` from a static reasons map (one sentence per cell or per model).

### Step 3 — DB schema migration (30 min)
- Add `task_type TEXT` and `assigned_model TEXT` columns to `tasks`.
- Write migration script `migrations/NNNN_add_model_advisor_fields.sql`.
- Update task create/update API to accept and persist these fields.

### Step 4 — Frontend: Task form fields (2 h)
- Add `Task Type` dropdown to Create/Edit Task form.
- Wire `taskType` + existing effort/priority → call `GET /api/recommend-model` on change (debounced, 300 ms).
- Render recommended model badge (colour-coded by cost tier).
- Add optional `Override Model` dropdown; default to recommended.
- On save, submit `task_type` and `assigned_model` to the tasks API.

### Step 5 — Frontend: Task card badge (1 h)
- Show model badge on task cards in list/board view.
- Colour: green (Haiku), yellow (Sonnet/Gemini), red (Opus).
- Tooltip: show reason text from the API.

### Step 6 — (Optional Phase 2) Advisor panel
- Collapsible panel on task detail page.
- Show cost estimates per model (pull from a static cost table).
- Show full matrix reasoning.
- "Switch to this model" action updates `assigned_model`.

### Step 7 — (Optional Phase 2) Audit log
- Create `model_recommendations` table (migration).
- Log each recommendation + override on task save.
- Add a `/api/model-stats` endpoint for analytics.

---

## Appendix — Model Cost Reference (Approximate)

| Model | Input $/1M tok | Output $/1M tok |
|---|---|---|
| claude-haiku-4-5 | $0.80 | $4.00 |
| claude-sonnet-4-5 | $3.00 | $15.00 |
| claude-opus-4-6 | $15.00 | $75.00 |
| gemini-3-pro-preview | ~$3.50 | ~$10.50 |

> Use these for cost estimation UI in Phase 2. Verify current pricing at provider dashboards before displaying to users.

---

*End of design document.*
