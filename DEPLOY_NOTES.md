# Deployment Notes & Troubleshooting

## 2026-04-07 Deployment Issues

### Problem 1: Google OAuth origin_mismatch
- **Symptom**: "Access blocked: Authorization Error" when logging in from neuberg.ai
- **Cause**: `https://neuberg.ai` was not registered as an Authorized JavaScript Origin in GCP OAuth client
- **Fix**: Added `https://neuberg.ai` to OAuth client origins in GCP Console → APIs & Services → Credentials → OAuth 2.0 Client ID

### Problem 2: env vars truncated during deploy
- **Symptom**: AI API returning 401, stock prices missing, encryption errors
- **Cause**: When reading env vars from Cloud Run revision logs, values were truncated at 50 chars. The truncated values were then used in the new deployment.
- **Fix**: Always read env vars from a known-good revision via the Cloud Run REST API (not from log output). Use the full revision endpoint:
  ```
  GET /v2/projects/{project}/locations/{region}/services/{service}/revisions/{revision}
  ```
  Then extract `containers[0].env` from the response.
- **Prevention**: Never copy env vars from log/terminal output. Always use API programmatically.

### Problem 3: Cloud Run serving stale image despite :latest tag
- **Symptom**: New code deployed but old JS bundle still served
- **Cause**: Cloud Run may cache the Docker image digest for the `:latest` tag
- **Fix**: Use exact image digest instead of `:latest` tag:
  ```
  gcr.io/tradingnewsterminal/tradingnewsweb@sha256:xxxxx
  ```
  Get digest via: `gcloud container images describe gcr.io/.../...:latest --format="value(image_summary.digest)"`
- **Also**: Route 100% traffic to latest revision in the deploy request:
  ```json
  "traffic": [{"type": "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST", "percent": 100}]
  ```

### Problem 4: Layout not updating for existing users
- **Symptom**: Default layout changes in code but users see old layout
- **Cause**: Layout is persisted in `localStorage` key `terminal-layout`. Old layout stays cached.
- **Fix**: Bump `LAYOUT_VERSION` constant in `dock-layout.tsx`. Code auto-resets layout when saved version < current version.

### Problem 5: Scrapers not running on cold start
- **Symptom**: Stock prices, calendar events, insider trades all empty after deploy
- **Cause**: All trackers had `if (getClientCount() === 0) return;` — skipping when no WebSocket clients connected. On cold start, no clients yet = no data fetched.
- **Fix**: Removed `getClientCount()` gate from:
  - `server/src/services/stocks/stock-tracker.ts`
  - `server/src/services/calendar/calendar-tracker.ts`
  - `server/src/services/stocks/insider-tracker.ts`

### Problem 6: Yahoo Finance API returning Unauthorized (CURRENT)
- **Symptom**: All stock prices show `--`
- **Cause**: Yahoo Finance public API (`query1.finance.yahoo.com/v7/finance/quote`) now returns 401 Unauthorized
- **Status**: Needs alternative data source (e.g., Alpha Vantage, Polygon.io, or Yahoo v8 with cookie auth)

## Deploy Checklist

1. Commit & push to GitHub
2. Build: `gcloud builds submit --config /tmp/tradingnews-cloudbuild.yaml --substitutions="_VITE_GOOGLE_CLIENT_ID=985277157092-..."`
3. Get new image digest: `gcloud container images describe gcr.io/.../...:latest --format="value(image_summary.digest)"`
4. Read env vars from known-good revision (rev 91) via REST API
5. Deploy with exact digest + full env vars + traffic routing
6. Verify: `curl https://neuberg.ai/api/health`
7. If layout changed: ensure `LAYOUT_VERSION` was bumped

## Build Performance
- Cloud Build with default machine takes ~15min (npm ci + tsc + vite + chown)
- Bottleneck: `chown -R appuser:appuser /app` on large node_modules (~600MB)
- Optimization TODO: only chown writable directories, not entire /app
