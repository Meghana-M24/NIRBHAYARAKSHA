# NIRBHAYARAKSHA Backend Handoff

This is the starting point for the next owner of the NIRBHAYARAKSHA backend. It summarizes what is implemented, how to run and verify it, what is intentionally incomplete, and where the database workstream takes over.

> **Status:** Backend application and non-database production hardening are complete. Database schema ownership, migrations, backups, retention, and database-backed testing remain with the database workstream.

> **Notifications are simulated.** No real SMS provider is connected. Do not describe SOS notifications as real alerts until a provider is implemented and verified.

---

## 1. At a glance

| Area | State |
| --- | --- |
| Runtime | Node.js `>=20.19.0`, Express 5, ES modules |
| Database access | Mongoose 9; MongoDB required at startup |
| Authentication | JWT Bearer tokens; bcrypt password hashing |
| Implemented features | Auth/profile, trusted contacts, PIN/duress PIN/lockout, SOS, safety timers, location, location sharing |
| Notifications | Simulated records only; no real SMS delivery |
| API contract | 18 paths, 26 operations; OpenAPI 3.0.3 |
| Automated tests | No database-backed test suite; CI checks syntax, environment, and dependencies |
| Rate limits | In-memory, per process |
| Deployment model | Single API instance with an in-process safety-timer worker |
| Database schema/migrations | Owned by the database workstream |

Last verification: **2026-11-09**.

- `npm run check` passed: syntax check for 37 files, environment validation passed.
- `npm audit --omit=dev --audit-level=high` reported `found 0 vulnerabilities`.
- `docs/openapi.yaml` passed `swagger-cli validate`.
- Redocly reported only the two expected warnings for the localhost/example.com placeholder servers.
- No MongoDB connection was opened during this verification.

---

## 2. What is implemented

- Registration, login, JWT issuance, and safe profile reads/updates.
- Password hashing with bcrypt; passwords and PIN hashes are never returned.
- Trusted contacts with ownership checks.
- Normal PIN and optional duress PIN.
- Five-attempt PIN lockout for 15 minutes.
- SOS event creation, history, detail, cancellation, and simulated notification records.
- Safety timers with check-in, expiry detection, and automatic SOS creation on expiry.
- Latest private location per user.
- Public, expiring location-share links. The raw token is returned once; only its SHA-256 hash is stored.
- Request IDs, structured JSON logs, Helmet, CORS allowlist, rate limits, `100kb` JSON limit, `Cache-Control: no-store`, and centralized error handling.
- Graceful shutdown on `SIGINT`/`SIGTERM`.
- CI workflow and OpenAPI contract.

---

## 3. Architecture

### Runtime flow

```text
Client
  -> reverse proxy / TLS
  -> Express app (app.js)
  -> request ID + structured request log
  -> Helmet + CORS + no-store
  -> rate limiters
  -> 100kb JSON parser
  -> route
  -> auth / validation middleware
  -> controller
  -> Mongoose model or service
  -> MongoDB
```

`server.js` loads the environment first, connects to MongoDB, starts the safety-timer worker, and then starts the HTTP listener. If configuration or the database connection fails, the process exits with code `1` before listening.

### Safety-timer worker

The worker runs inside the API process. It sweeps every 15 seconds, processes up to 100 due timers per sweep, marks them expired, creates an SOS event, and creates simulated notification records. This is one reason the current deployment model is a single instance.

### Directory map

| Path | Purpose |
| --- | --- |
| `../server.js` | Environment-first startup, database connection, worker startup, graceful shutdown |
| `../app.js` | Express middleware order, route mounting, 404 and error handling |
| `../config/` | Environment validation and MongoDB connection |
| `../routes/` | Route definitions and per-route middleware |
| `../controllers/` | Endpoint handlers and field-level validation |
| `../middleware/` | JWT auth, request logging, body/path validation |
| `../models/` | Mongoose models and model-level constraints |
| `../services/` | PIN verification, simulated notifications, safety-timer expiry |
| `../utils/logger.js` | Dependency-free structured logger |
| `../scripts/` | Syntax/environment checks and legacy manual database scripts |
| `./` | API contract, OpenAPI specification, deployment guide, and this handoff |

### Response format

Successful responses:

```json
{ "success": true, "data": { } }
```

Error responses:

```json
{ "success": false, "message": "..." }
```

PIN and rate-limit errors may also include `attemptsRemaining` or `retryAfterSeconds`.

---

## 4. Local setup and commands

From `backend/`:

```powershell
npm ci
Copy-Item .env.example .env
# Edit .env with real local values.
npm run check
npm run dev
```

On macOS/Linux, replace `Copy-Item` with `cp`.

`npm run check` runs:

1. `npm run check:syntax` — `node --check` across backend JavaScript files.
2. `npm run check:env` — validates configuration without querying MongoDB.

The environment checker prints the JWT secret length, never the secret itself.

### Start and health check

```powershell
npm start
```

```bash
curl -i http://localhost:5000/api/health
```

`GET /api/health` is a liveness check. It does not query MongoDB, but server startup still requires a reachable database.

### Production install

```powershell
npm ci --omit=dev
npm run check
npm start
```

### Dependency audit

```powershell
npm audit --omit=dev --audit-level=high
```

### OpenAPI validation

From `backend/`:

```powershell
npx --yes @apidevtools/swagger-cli validate docs/openapi.yaml
npx --yes @redocly/cli lint docs/openapi.yaml
```

The two Redocly warnings about `localhost` and `example.com` are expected because those server entries are intentional placeholders.

### Legacy scripts

`../scripts/testUserModel.js` and `../scripts/testPasswordHashing.js` are manual scripts that connect to MongoDB and create test records. They are not part of `npm run check` and must not be run against production. No automated database-backed test suite is currently included.

---

## 5. Environment variables

`../config/env.js` validates the application environment. `../config/db.js` checks that `MONGODB_URI` exists during startup and then connects.

| Variable | Required | Development default | Notes |
| --- | --- | --- | --- |
| `NODE_ENV` | No | `development` | `development`, `test`, or `production`. |
| `PORT` | No | `5000` | Integer from `1` to `65535`. |
| `MONGODB_URI` | Yes at startup | None in templates | Secret if it contains credentials. URL-encode special characters. |
| `JWT_SECRET` | Yes | None in templates | At least 32 characters. Placeholder values are rejected in production. Never print or commit it. |
| `JWT_EXPIRES_IN` | No | `1d` | Format such as `60s`, `30m`, `12h`, or `1d`. |
| `CORS_ORIGINS` | Yes in production | Four local frontend origins | Comma-separated exact origins. No `*`, paths, or trailing slashes. |
| `TRUST_PROXY` | No | `false` | `false`, a positive hop count, or trusted IPs/subnets. `true` is rejected to prevent spoofed forwarded headers. |
| `LOG_LEVEL` | No | `info` | `error`, `warn`, `info`, or `debug`. Health-check successes log at `debug`. |

Templates:

- Development: [`../.env.example`](../.env.example)
- Production placeholders: [`../.env.production.example`](../.env.production.example)

The production template intentionally fails until its placeholder `JWT_SECRET` is replaced.

---

## 6. API and OpenAPI

- Human-readable contract: [`API.md`](./API.md)
- Machine-readable contract: [`openapi.yaml`](./openapi.yaml)

The OpenAPI document covers 18 paths and 26 operations.

| Route group | Authentication | Notes |
| --- | --- | --- |
| `GET /api/health` | Public | Liveness only. |
| `/api/auth/register`, `/api/auth/login` | Public | Login returns the Bearer JWT. |
| `GET/PATCH /api/auth/me` | Bearer JWT | Safe profile only. |
| `/api/contacts` | Bearer JWT | Ownership failures return `404`. |
| `/api/pin/*` | Bearer JWT | Normal PIN, duress PIN, and lockout. |
| `/api/sos/*` | Bearer JWT | Notifications are simulated. |
| `/api/safety-timer/*` | Bearer JWT | Start requires the PIN; check-in does not. |
| `/api/location` | Bearer JWT | Latest private location. |
| `POST/DELETE /api/location/share` | Bearer JWT | Create or revoke the current share. |
| `GET /api/location/share/{token}` | Public | Returns owner name, location, and expiry only. |

Important contract behavior:

- Protected routes use `Authorization: Bearer <JWT>`.
- Resource ownership failures return `404`, not `403`.
- Raw location-share tokens are returned once.
- Notification phone numbers are masked in API responses.
- Passwords, password hashes, PINs, and PIN hashes are never returned.
- API responses include `X-Request-ID` and `Cache-Control: no-store`.

If routes or response shapes change, update both `API.md` and `openapi.yaml`.

---

## 7. CI

Workflow: [`../../.github/workflows/backend-ci.yml`](../../.github/workflows/backend-ci.yml)

Triggers:

- Push or pull request affecting `backend/**`.
- Changes to the workflow file itself.

The job:

1. Runs on Ubuntu with Node.js `20.19.0`.
2. Runs `npm ci` in `backend/`.
3. Runs `npm run check`.
4. Runs `npm audit --omit=dev --audit-level=high`.

The workflow uses read-only repository permissions and cancels superseded runs. It does **not** connect to MongoDB, run migrations, or run database-backed tests.

---

## 8. Database ownership boundary

The database workstream owns:

- Schema and collection design.
- Index changes, migrations, and data backfills.
- Backups, restores, and disaster recovery.
- Retention policies and data deletion.
- Database credentials and network access.
- Database performance and capacity.
- Database-backed integration tests.

This backend workstream added application-level Mongoose models and queries, but did not add migrations or change database infrastructure. Any schema or index change must be coordinated with the database owner before deployment.

Current model files and their default Mongoose collection names:

| Model file | Collection |
| --- | --- |
| `../models/User.js` | `users` |
| `../models/TrustedContact.js` | `trustedcontacts` |
| `../models/EmergencyEvent.js` | `emergencyevents` |
| `../models/EmergencyNotification.js` | `emergencynotifications` |
| `../models/SafetyTimer.js` | `safetytimers` |
| `../models/UserLocation.js` | `userlocations` |
| `../models/LocationShare.js` | `locationshares` |

The models declare constraints and indexes such as unique email, one location per user, unique share-token hash, a TTL index for share expiry, and event/user lookup indexes. The database owner should review all model-defined indexes before production.

The API requires a reachable MongoDB instance at startup. The health endpoint does not verify the database after startup.

---

## 9. Known limitations and production follow-ups

### Current limitations

- SOS notifications are simulated only. No real SMS is sent.
- No automated database-backed tests.
- Rate limits use in-memory storage and are per process.
- The health endpoint is liveness-only; there is no database readiness check.
- No refresh-token flow; JWT expiry forces a new login.
- No metrics endpoint or log aggregation. Structured JSON logs go to stdout/stderr.
- The safety-timer worker runs inside the API process; multi-instance deployment needs a worker/coordination design.
- Account deletion, data export, and retention policies are not implemented.
- The frontend is not integrated with this backend and still stores plaintext passwords in `localStorage`.
- The OpenAPI specification is hand-maintained and can drift if routes change without documentation updates.

### Recommended follow-ups, in priority order

1. Connect a real notification provider and verify delivery before claiming real emergency alerts.
2. Finalize schema, indexes, migrations, backups, and retention with the database owner.
3. Add a shared rate-limit store before running multiple API instances.
4. Add a readiness check that verifies MongoDB and worker health.
5. Add refresh tokens or a deliberate re-authentication policy.
6. Add metrics and centralized log collection.
7. Integrate the frontend and remove plaintext password storage.
8. Add database-backed integration tests when the database workstream is ready.
9. Add account deletion, data export, and retention controls.

---

## 10. Handoff checklist

- [ ] Read [`API.md`](./API.md), [`openapi.yaml`](./openapi.yaml), and [`DEPLOYMENT.md`](./DEPLOYMENT.md).
- [ ] Confirm database ownership, collections, indexes, migrations, backups, and retention.
- [ ] Set production secrets in the platform secret manager.
- [ ] Run `npm ci --omit=dev`, `npm run check`, and the dependency audit.
- [ ] Deploy as a single API instance unless shared rate limiting and worker coordination are added.
- [ ] Configure the health check for `GET /api/health`.
- [ ] Verify CORS origins and `TRUST_PROXY` against the real proxy topology.
- [ ] Confirm logs are collected and secrets are not logged.
- [ ] Smoke-test registration, login, PIN setup, contacts, SOS, safety timer, location, and sharing with non-production data.
- [ ] Treat every notification record as simulated.
- [ ] Remove plaintext password storage from the frontend before integration.
- [ ] Update `API.md` and `openapi.yaml` for any route or response change.

---

## 11. Related documents

- API contract: [`API.md`](./API.md)
- OpenAPI specification: [`openapi.yaml`](./openapi.yaml)
- Deployment guide: [`DEPLOYMENT.md`](./DEPLOYMENT.md)
- Production environment template: [`../.env.production.example`](../.env.production.example)
- Development environment template: [`../.env.example`](../.env.example)
- CI workflow: [`../../.github/workflows/backend-ci.yml`](../../.github/workflows/backend-ci.yml)
