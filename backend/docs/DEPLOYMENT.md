# NIRBHAYARAKSHA Backend Deployment Guide

This guide covers deploying the NIRBHAYARAKSHA backend as a production Node.js API. It does **not** create database schemas, run migrations, or change database code.

> **Notifications are simulated.** No real SMS provider is connected. Production deployment does not change that limitation.

---

## 1. Deployment assumptions

- Node.js 20.19.0 or newer. The project uses ES modules, and the installed Mongoose version requires Node 20.19.0+.
- MongoDB is reachable through `MONGODB_URI`. The database may be managed externally.
- The API runs as a **single instance** unless the rate-limit and worker limitations in section 10 are addressed.
- TLS is terminated by a reverse proxy or hosting platform.
- The frontend is deployed separately and calls the API over HTTPS.
- Secrets are injected by the hosting platform or a secret manager, not committed to the repository.

---

## 2. Production environment variables

Use `backend/.env.production.example` as the template. It contains placeholders only.

| Variable | Required | Production example | Notes |
| --- | --- | --- | --- |
| `NODE_ENV` | Yes | `production` | Enables production checks. |
| `PORT` | No | `5000` | Many platforms inject their own port. The value must be between `1` and `65535`. |
| `MONGODB_URI` | Yes | `mongodb+srv://...` | Contains database credentials. Treat it as a secret. |
| `JWT_SECRET` | Yes | 128 random hex characters | At least 32 characters. The development placeholder is rejected in production. |
| `JWT_EXPIRES_IN` | No | `1d` | Accepted formats: `60s`, `30m`, `12h`, `1d`. |
| `CORS_ORIGINS` | Yes in production | `https://app.example.com` | Comma-separated exact HTTPS origins. No wildcard, path, or trailing slash. |
| `TRUST_PROXY` | No | `1` | `false` (default), a proxy hop count, or a comma-separated list of trusted IPs/subnets. `true` is rejected. |
| `LOG_LEVEL` | No | `info` | One of `error`, `warn`, `info`, `debug`. |

`backend/config/env.js` validates `NODE_ENV`, `PORT`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CORS_ORIGINS`, `TRUST_PROXY`, and `LOG_LEVEL`.

`backend/config/db.js` checks `MONGODB_URI` during startup. It does not validate the connection string format before connecting.

### Generate a production JWT secret

Use a cryptographically random value. Do not reuse a development secret.

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Alternative:

```bash
openssl rand -hex 64
```

Store the result in the hosting provider's secret manager. Never paste a real secret into a document, chat, issue, or commit.

---

## 3. Install and start

### Install production dependencies

Run from `backend/`:

```bash
npm ci --omit=dev
```

`npm ci` uses `package-lock.json` and installs only production dependencies. This avoids installing `nodemon` in production.

### Validate configuration

`npm run check:env` validates the configuration without connecting to MongoDB.

```bash
npm run check:env
```

Important: the checker loads `backend/.env` through `dotenv`. Make sure the production variables are actually present in the process environment, or use a complete production env file. Do not validate a development `.env` and assume production is correct.

On Linux, you can load a complete production env file before checking:

```bash
set -a
. ./.env.production
set +a
npm run check:env
```

With Node.js 20.6 or newer, you can also use the built-in env-file flag:

```bash
node --env-file=.env.production scripts/check-env.js
```

Make sure the env file is complete and is not committed.

### Start the API

```bash
npm start
```

This runs:

```bash
node server.js
```

The startup order is:

1. Load environment variables.
2. Validate configuration.
3. Import the Express app.
4. Connect to MongoDB.
5. Start the safety-timer expiry worker.
6. Listen on `PORT`.

If validation, MongoDB connection, or safety-timer worker initialization fails, the process exits with code `1` before it starts listening.

### Continuous integration

The GitHub Actions workflow at `.github/workflows/backend-ci.yml` runs for pushes and pull requests that change `backend/` or the workflow itself:

1. Installs dependencies from `backend/package-lock.json` with `npm ci`.
2. Runs `npm run check`, which checks the syntax of every backend `.js` file and validates the environment configuration.
3. Runs `npm audit --omit=dev --audit-level=high`.

The workflow uses a dummy `JWT_SECRET` and default non-production settings. It does not connect to MongoDB and does not run database tests. Run the same syntax and environment checks locally from `backend/` with:

```bash
npm run check
```

### Process manager guidance

- Run the API as a non-root user.
- Restart on failure with your platform or process manager.
- Use **one instance**.
- Do not use `nodemon` in production.
- Send logs to stdout/stderr and collect them with the platform.
- The server handles both `SIGINT` and `SIGTERM` for graceful shutdown. It stops accepting new connections, clears the safety-timer worker, closes the MongoDB connection, and exits with code `0`.
- If shutdown does not finish within 10 seconds, the process logs an error and exits with code `1`. Set the platform's stop timeout higher than 10 seconds so the graceful path can complete.

Example systemd unit fragment:

```ini
[Service]
Type=simple
User=nirbhayaraksha
WorkingDirectory=/srv/nirbhayaraksha/backend
EnvironmentFile=/etc/nirbhayaraksha/backend.env
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=5
KillSignal=SIGTERM
TimeoutStopSec=20
NoNewPrivileges=true
PrivateTmp=true
```

Do not store the environment file inside the repository.

---

## 4. Health checks and monitoring

### Liveness endpoint

```text
GET /api/health
```

Public, no authentication.

Example response:

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "service": "nirbhayaraksha-backend",
    "timestamp": "2026-11-08T10:20:00.000Z",
    "uptimeSeconds": 1200
  }
}
```

Use this as a **liveness** check. It does not query MongoDB, so it will not detect a database outage that happens after startup.

The server still requires MongoDB to be reachable before it begins listening. A separate readiness check would need a database ping, which is database work and is intentionally out of scope here.

`GET /api/health` is also subject to the general `/api` rate limit of 300 requests per 15 minutes per IP. Use a normal health-check interval; sub-second polling can exhaust the limit.

### Structured logs

The API writes one JSON object per line to stdout/stderr:

```json
{"timestamp":"2026-11-09T10:20:00.000Z","level":"info","message":"request completed","requestId":"8b0c...","method":"GET","route":"/api/health/","status":200,"durationMs":3.21,"ip":"203.0.113.9"}
```

- Every response includes an `X-Request-ID` header. A valid incoming value is reused; otherwise the server generates a UUID.
- Request logs include method, matched route pattern, status, duration, client IP, and request ID.
- Route parameter values are not logged, so share tokens and record IDs do not appear in logs.
- Request bodies, passwords, PINs, and tokens are never logged.
- Successful `/api/health` calls log at `debug`. Set `LOG_LEVEL=debug` only while debugging; health polling is noisy at that level.
- `4xx` responses log at `warn`; `5xx` responses and unhandled errors log at `error` with a stack trace.

### Monitoring basics

- Watch restart loops and startup failures.
- Alert on repeated `500` responses.
- Alert on unusual `429` rates.
- Collect stdout/stderr; the API does not write application log files.
- Do not log secrets, passwords, PINs, raw tokens, or full MongoDB connection strings.
- Rate-limit state is in memory and resets when the process restarts.

---

## 5. Reverse proxy, TLS, and rate limiting

### TLS

Terminate TLS at the proxy or platform, not inside this Node.js process. Forward requests to the API over the private network.

### Required forwarded headers

Configure the proxy to forward:

- `Authorization`
- `Content-Type`
- `X-Forwarded-For`
- `X-Forwarded-Proto`

### Configure `trust proxy`

Set `TRUST_PROXY` so Express and the rate limiters see the real client IP instead of the proxy's IP. Without it, every client behind the proxy shares one rate-limit bucket.

| `TRUST_PROXY` value | When to use it |
| --- | --- |
| `false` | Clients connect directly, with no proxy in front of the API. This is the default. |
| `1` | Exactly one trusted proxy hop, such as a single load balancer or reverse proxy. |
| `2`, `3`, ... | A known number of trusted proxy hops. |
| `10.0.0.0/8,loopback` | A known set of trusted proxy IPs or subnets. |

Do not set `TRUST_PROXY=true`. It lets clients spoof `X-Forwarded-For`, and `config/env.js` rejects it. Choose the smallest value that matches the deployment topology.

Only trust a proxy you control, and make sure that proxy replaces untrusted client-supplied forwarding headers.

### Rate limits

Current limits are per process:

| Scope | Limit |
| --- | --- |
| All `/api` routes | 300 requests / 15 minutes / IP |
| Login and registration | 20 requests / 15 minutes / IP |
| `/api/pin/verify` only | 10 requests / 15 minutes / IP |
| Location share routes | 60 requests / 15 minutes / IP |

Consequences:

- Run a single instance, or move rate limiting to a shared store.
- If you run multiple instances, each instance has its own counters.
- The dedicated PIN request limiter is only mounted on `/api/pin/verify`. SOS and safety-timer starts still use the five-attempt PIN lockout.

### Request limits

- JSON body limit: `100kb`.
- Oversized bodies return `413`.
- Malformed JSON returns `400`.

### Network exposure

- Do not expose the MongoDB port publicly.
- Restrict the API port to the proxy or platform network.
- The server listens on all interfaces by default; use a firewall or private network to restrict access.
- Allow only HTTPS traffic from clients.

---

## 6. CORS and frontend integration

Set `CORS_ORIGINS` to the exact production frontend origins.

Examples:

```text
https://app.example.com
https://www.app.example.com
```

Rules:

- Use exact origins.
- Do not use `*`.
- Do not include paths.
- Do not include trailing slashes.
- Do not include development `localhost` origins in production.
- Include both apex and `www` origins if both are used.

The API uses Bearer JWTs and does not use cookie-based sessions. The frontend should send:

```http
Authorization: Bearer <JWT>
```

The frontend must not store plaintext passwords or PINs. Only the JWT should be stored client-side. The current frontend still stores plaintext passwords in `localStorage`; that must be replaced during integration.

---

## 7. Secrets and rotation

- Store `JWT_SECRET` and `MONGODB_URI` in a secret manager or platform environment settings.
- Never commit `.env`, `.env.production`, or any real environment file.
- The repository `.gitignore` ignores `.env` and `.env.*`, while keeping `.env.example` and `.env.production.example`.
- Do not print secrets in CI logs or deployment scripts.
- `npm run check:env` prints the secret length, not the secret value.

### Rotating the JWT secret

Changing `JWT_SECRET` invalidates every existing JWT. Users must log in again. There is no refresh-token flow.

Plan rotation during a maintenance window or accept forced re-authentication.

### Rotating MongoDB credentials

Update `MONGODB_URI` through the secret manager and restart the API. Coordinate with the database owner because this is a database-side task.

---

## 8. Pre-deployment checklist

- [ ] Node.js 20.19.0 or newer is installed.
- [ ] `npm ci --omit=dev` completed successfully.
- [ ] `NODE_ENV=production`.
- [ ] `PORT` matches the platform or proxy target.
- [ ] `MONGODB_URI` is set and the database is reachable.
- [ ] `JWT_SECRET` is random, at least 32 characters, and not the placeholder.
- [ ] `JWT_EXPIRES_IN` uses an accepted format.
- [ ] `CORS_ORIGINS` contains exact HTTPS production origins only.
- [ ] `npm run check` passes with production variables loaded.
- [ ] The API runs as one instance.
- [ ] The health check is configured for `GET /api/health`.
- [ ] The proxy forwards `Authorization`, `Content-Type`, `X-Forwarded-For`, and `X-Forwarded-Proto`.
- [ ] `TRUST_PROXY` matches the proxy topology (`1` for one trusted proxy, `false` for direct connections).
- [ ] Logs are collected and secrets are not logged.
- [ ] `LOG_LEVEL` is set (normally `info`).
- [ ] MongoDB is not publicly exposed.
- [ ] Notifications are treated as simulated.
- [ ] The frontend no longer stores plaintext passwords.
- [ ] The database owner has confirmed backup and retention arrangements.

---

## 9. Rollback and restart behavior

### Invalid configuration

The process exits with code `1` before listening. Fix the environment and restart.

### MongoDB unavailable

The process exits with code `1`. The platform should restart it, but repeated restarts will continue until the database is reachable.

### Code rollback

Deploy the previous application version with the same environment. If `JWT_SECRET` changed, all existing sessions are invalid.

### Database rollback

Database schema changes, migrations, backups, and restores are owned by the database workstream. This guide does not perform them.

---

## 10. Known deployment blockers and follow-ups

- **Rate limits are in memory.** Multi-instance deployment requires a shared store.
- **Health check is liveness only.** It does not verify MongoDB after startup.
- **Notifications are simulated.** No real SMS delivery is implemented.
- **No refresh tokens.** JWT expiry forces a new login.
- **No automated tests.** CI runs syntax, environment, and dependency checks only. Database-backed tests are currently out of scope.
- **No metrics endpoint or log aggregation.** Structured JSON logs go to stdout/stderr; the platform must collect them.
- **The safety-timer worker runs inside the API process.** Treat it as part of the single-instance deployment model.

---

## 11. Command summary

From `backend/`:

```bash
npm ci --omit=dev
npm run check
npm start
```

`npm run check` runs the syntax check and `npm run check:env`.

Health check:

```bash
curl -i https://api.example.com/api/health
```

---

## 12. Related documents

- Backend handoff: [`HANDOFF.md`](./HANDOFF.md)
- API contract: [`API.md`](./API.md)
- OpenAPI specification: [`openapi.yaml`](./openapi.yaml)
- Environment template: [`../.env.production.example`](../.env.production.example)
