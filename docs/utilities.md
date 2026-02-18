# Utility scripts

These scripts help bootstrap tasks for local experimentation without needing to create them manually through the UI.

## `src/seed.js`
- **Run:** `npm run seed`
- **Purpose:** Seeds the database with a curated set of sample tasks that exercises the agent modal (Norman/Ada/Mason roles) plus coordination stories like heartbeat reliability and autopilot. It checks for an existing task count and exits early if the table is not empty to avoid overwriting production data.
- **Notes:** The script runs with `sql.js` and writes directly to `data/dashboard.db`. You can inspect or modify the `tasks` array inside the file to support additional scenarios before seeding.

## `create_tasks.sh`
- **Run:** `bash create_tasks.sh`
- **Purpose:** Posts 50 feature-landscape tasks (R1–R50) to the dashboard using `curl`. Each payload includes an owner, priority, tags, and descriptive text. At the end it posts a comment to task `23` confirming the operation.
- **Requirements:** Dashboard server must be running on `http://localhost:3420` and the `X-API-Key` header value defined in the script must match `DASHBOARD_API_KEY`. Edit the script at the top to point to another host or key if needed.

## `create_tasks2.sh`
- **Run:** `bash create_tasks2.sh`
- **Purpose:** Similar to `create_tasks.sh`, but uses embedded Python to encode JSON, making it easier to reuse when copy-pasting the payload text. It also posts the same R1–R50 tasks and the confirmation comment for task `23`.
- **When to use:** Prefer this script when you need to tweak the JSON templates (it keeps them in a single `tasks` array). The helper `post_task` function at the top reduces duplicated logic.

Both shell scripts assume `python3` is installed and configured. Use `DASHBOARD_API_KEY` so the API accepts the requests, or update the `KEY` variable in each script to a valid value if you rotate the key.
