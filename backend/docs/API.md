# NIRBHAYARAKSHA Backend API

This document is the API contract for the NIRBHAYARAKSHA backend. It describes the current routes, request bodies, response shapes, authentication rules, and security behavior.

A machine-readable OpenAPI 3.0.3 contract is available at [`openapi.yaml`](./openapi.yaml). This document remains the narrative reference for behavior and security details.

New to the project? Start with the backend handoff: [`HANDOFF.md`](./HANDOFF.md).

> **Important:** SOS notifications are currently **simulated**. They are stored with `status: "simulated"` and `provider: "simulated"`. They are **not** sent as real SMS messages.

> All example names, emails, phone numbers, tokens, passwords, and PINs in this document are placeholders. Do not use them in a real deployment.

> Most endpoints require MongoDB. `GET /api/health` and `npm run check:env` do not query the database, but server startup still requires a reachable MongoDB instance.

---

## 1. Base URL

Local development:

```text
http://localhost:5000
```

The port is configurable with `PORT`. All API routes are prefixed with `/api`.

Example:

```text
GET http://localhost:5000/api/health
```

---

## 2. Authentication

Protected routes require a Bearer JWT:

```http
Authorization: Bearer <JWT>
```

The token is returned by `POST /api/auth/login`.

- Default token lifetime: `1d` (configurable with `JWT_EXPIRES_IN`).
- Protected routes return `401` when the token is missing, invalid, or expired.
- The frontend must never store passwords or PINs. Only the JWT should be stored client-side.

---

## 3. Request and response format

Send JSON requests with:

```http
Content-Type: application/json
```

Request bodies for write routes must be JSON objects. Arrays and primitive JSON values are rejected with `400`.

Successful responses use this envelope:

```json
{
  "success": true,
  "data": {}
}
```

Error responses use this envelope:

```json
{
  "success": false,
  "message": "Description of the problem"
}
```

Some errors include extra fields, such as `attemptsRemaining` or `retryAfterSeconds`.

All API route responses include:

```http
Cache-Control: no-store
```

CORS preflight (`OPTIONS`) responses are handled by the CORS middleware before this header is added.

All responses also include:

```http
X-Request-ID: <request-id>
```

If the client sends a valid `X-Request-ID` (up to 128 characters using letters, digits, `.`, `_`, or `-`), the server reuses it. Otherwise the server generates a UUID. Include this value when reporting a problem so server logs can be correlated.

Timestamps are ISO 8601 strings.

---

## 4. Common status codes

| Status | Meaning |
| --- | --- |
| `200` | Success |
| `201` | Resource created |
| `400` | Invalid input or missing required data |
| `401` | Missing/invalid authentication or invalid password/PIN |
| `404` | Resource not found or not owned by the current user |
| `409` | Conflict, such as duplicate email, existing active timer, or invalid state transition |
| `413` | JSON body is larger than `100kb` |
| `423` | PIN is temporarily locked |
| `429` | Rate limit exceeded |
| `500` | Internal server error |

Ownership failures deliberately return `404` instead of `403` so the API does not reveal whether another user's resource exists.

---

## 5. Main data objects

### 5.1 User

Password hashes and PIN hashes are **never** returned.

```json
{
  "_id": "665f1c2a9b1e8a0012a34567",
  "name": "Asha Rao",
  "email": "asha@example.com",
  "phone": "9876543210",
  "address": "Delhi",
  "emergencyInfo": "Call my brother",
  "pinConfigured": true,
  "failedPinAttempts": 0,
  "pinLockedUntil": null,
  "lastLoginAt": "2026-11-08T10:00:00.000Z",
  "createdAt": "2026-11-08T09:00:00.000Z",
  "updatedAt": "2026-11-08T10:00:00.000Z"
}
```

### 5.2 Trusted contact

```json
{
  "_id": "665f1d3b9b1e8a0012a34568",
  "name": "Ravi Rao",
  "phone": "9876543210",
  "relationship": "Family",
  "createdAt": "2026-11-08T09:10:00.000Z",
  "updatedAt": "2026-11-08T09:10:00.000Z"
}
```

Allowed relationships:

```text
Family, Friend, Relative, Colleague, Other
```

Input is case-insensitive and is normalized to the canonical value.

### 5.3 SOS event

```json
{
  "id": "665f1e4c9b1e8a0012a34569",
  "status": "active",
  "triggeredAt": "2026-11-08T10:05:00.000Z",
  "cancelledAt": null,
  "hasLocation": true,
  "location": {
    "latitude": 28.6139,
    "longitude": 77.209,
    "accuracy": 12.5
  },
  "message": "Please help me",
  "contactCount": 1
}
```

- Current API flows use `active` and `cancelled`. The underlying model also permits `resolved` for future use.
- `location` can be `null`.
- `accuracy` can be `null`.
- The hidden duress flag is never included in API responses.

### 5.4 Emergency notification

```json
{
  "id": "665f1f5d9b1e8a0012a3456a",
  "contactName": "Ravi Rao",
  "contactPhoneMasked": "******3210",
  "contactRelationship": "Family",
  "channel": "sms",
  "status": "simulated",
  "provider": "simulated",
  "sentAt": null,
  "createdAt": "2026-11-08T10:05:00.000Z",
  "error": null
}
```

- Raw contact phone numbers are never returned by the notification API.
- Possible status values: `pending`, `simulated`, `sent`, `failed`.
- Records created by the current backend use `status: "simulated"` and `provider: "simulated"`.

### 5.5 Safety timer

```json
{
  "id": "665f206e9b1e8a0012a3456b",
  "status": "active",
  "durationMinutes": 30,
  "message": "Check on me",
  "startedAt": "2026-11-08T10:10:00.000Z",
  "expiresAt": "2026-11-08T10:40:00.000Z",
  "secondsRemaining": 1799,
  "checkedInAt": null,
  "expiredAt": null,
  "contactCount": 2,
  "sosEventId": null
}
```

- `status` is `active`, `checked_in`, or `expired`.
- `secondsRemaining` is `0` when the timer is not active.
- `sosEventId` is set after an expired timer creates an SOS event.
- The hidden duress flag is never included in API responses.

### 5.6 Location

```json
{
  "latitude": 28.6139,
  "longitude": 77.209,
  "accuracy": 12.5,
  "recordedAt": "2026-11-08T10:15:00.000Z"
}
```

Only the latest location per user is stored.

---

## 6. Health

### `GET /api/health`

Public. No authentication.

Response `200`:

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

The health handler itself does not query MongoDB. The server startup process still requires a database connection before it begins listening.

---

## 7. Authentication routes

### `POST /api/auth/register`

Creates an account.

Request:

```json
{
  "name": "Asha Rao",
  "email": "asha@example.com",
  "password": "StrongPass123!"
}
```

Rules:

- `name`, `email`, and `password` are required.
- Password must be at least 8 characters.
- Password must not exceed 72 UTF-8 bytes.
- Email is normalized to lowercase.
- Email must be unique.

Response `201`:

```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "665f1c2a9b1e8a0012a34567",
      "name": "Asha Rao",
      "email": "asha@example.com",
      "phone": "",
      "address": "",
      "emergencyInfo": "",
      "pinConfigured": false,
      "failedPinAttempts": 0,
      "pinLockedUntil": null,
      "lastLoginAt": null,
      "createdAt": "2026-11-08T09:00:00.000Z",
      "updatedAt": "2026-11-08T09:00:00.000Z"
    }
  }
}
```

Errors:

- `400`: missing fields, invalid password length, invalid email.
- `409`: email already exists.

---

### `POST /api/auth/login`

Request:

```json
{
  "email": "asha@example.com",
  "password": "StrongPass123!"
}
```

Response `200`:

```json
{
  "success": true,
  "data": {
    "token": "<JWT>",
    "user": {
      "_id": "665f1c2a9b1e8a0012a34567",
      "name": "Asha Rao",
      "email": "asha@example.com",
      "pinConfigured": true
    }
  }
}
```

The returned `user` contains the full safe user object described in section 5.1.

Errors:

- `400`: missing or invalid input.
- `401`: invalid email or password.
- `429`: authentication rate limit exceeded.

---

### `GET /api/auth/me`

Protected.

Response `200`:

```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "665f1c2a9b1e8a0012a34567",
      "name": "Asha Rao",
      "email": "asha@example.com",
      "pinConfigured": true
    }
  }
}
```

The `user` object is the full safe user object described in section 5.1.

Errors:

- `401`: missing, invalid, or expired token.

---

### `PATCH /api/auth/me`

Protected. Updates allowed profile fields.

Any combination of:

```json
{
  "name": "Asha Rao",
  "phone": "9876543210",
  "address": "Delhi",
  "emergencyInfo": "Call my brother"
}
```

Field limits:

- `name`: maximum 100 characters.
- `phone`: maximum 20 characters.
- `address`: maximum 300 characters.
- `emergencyInfo`: maximum 1000 characters.

Response `200`:

```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "665f1c2a9b1e8a0012a34567",
      "name": "Asha Rao",
      "phone": "9876543210",
      "address": "Delhi",
      "emergencyInfo": "Call my brother"
    }
  }
}
```

The `user` object is the full safe user object described in section 5.1.

Errors:

- `400`: no valid fields, invalid type, or validation failure.
- `401`: missing or invalid token.

---

## 8. Trusted contact routes

All contact routes are protected.

### `GET /api/contacts`

Response `200`:

```json
{
  "success": true,
  "data": {
    "contacts": []
  }
}
```

Contacts are sorted by creation time, oldest first.

---

### `POST /api/contacts`

Request:

```json
{
  "name": "Ravi Rao",
  "phone": "9876543210",
  "relationship": "Family"
}
```

Rules:

- `name`, `phone`, and `relationship` are required.
- `name` has a maximum length of 100 characters.
- `phone` must be exactly 10 digits.
- `relationship` must be one of the allowed values.

Response `201`:

```json
{
  "success": true,
  "data": {
    "contact": {
      "_id": "665f1d3b9b1e8a0012a34568",
      "name": "Ravi Rao",
      "phone": "9876543210",
      "relationship": "Family",
      "createdAt": "2026-11-08T09:10:00.000Z",
      "updatedAt": "2026-11-08T09:10:00.000Z"
    }
  }
}
```

Errors:

- `400`: missing field, invalid phone, or invalid relationship.

---

### `PATCH /api/contacts/:id`

Protected. Updates any combination of:

```json
{
  "name": "Ravi Rao",
  "phone": "9876543210",
  "relationship": "Friend"
}
```

Response `200`:

```json
{
  "success": true,
  "data": {
    "contact": {
      "_id": "665f1d3b9b1e8a0012a34568",
      "name": "Ravi Rao",
      "phone": "9876543210",
      "relationship": "Friend"
    }
  }
}
```

This example is abridged. The full contact object also includes `createdAt` and `updatedAt`.

Errors:

- `400`: no valid fields or invalid data.
- `404`: contact not found or not owned by the current user.

---

### `DELETE /api/contacts/:id`

Response `200`:

```json
{
  "success": true,
  "data": {
    "deletedContactId": "665f1d3b9b1e8a0012a34568"
  }
}
```

Errors:

- `404`: contact not found or not owned by the current user.

---

## 9. PIN routes

All PIN routes are protected.

### `POST /api/pin/setup`

Sets the PIN for the first time. Requires the account password.

Request:

```json
{
  "password": "StrongPass123!",
  "pin": "1234",
  "duressPin": "9876"
}
```

Rules:

- `password` and `pin` are required.
- `pin` must be exactly 4 digits.
- `duressPin` is optional.
- If provided, `duressPin` must be exactly 4 digits and different from `pin`.

Response `201`:

```json
{
  "success": true,
  "data": {
    "message": "PIN set successfully",
    "hasDuressPin": true
  }
}
```

Errors:

- `400`: invalid input or invalid PIN format.
- `401`: invalid password.
- `409`: PIN is already set. Use the change endpoint.

---

### `POST /api/pin/verify`

Request:

```json
{
  "pin": "1234"
}
```

Response `200` for both the normal PIN and the duress PIN:

```json
{
  "success": true,
  "data": {
    "verified": true
  }
}
```

The response is intentionally identical for normal and duress PINs. The client must not be able to tell which one was used.

Errors:

- `400`: missing/invalid PIN, or PIN not configured.
- `401`: invalid PIN.

Invalid PIN response includes remaining attempts:

```json
{
  "success": false,
  "message": "Invalid PIN",
  "attemptsRemaining": 4
}
```

After five failed attempts, the PIN is locked for 15 minutes:

```json
{
  "success": false,
  "message": "PIN is locked. Try again later.",
  "retryAfterSeconds": 900
}
```

Status `423` is used for a locked PIN.

PIN verification is rate-limited to 10 requests per 15 minutes per IP.

---

### `PATCH /api/pin`

Changes the PIN using the account password. The current PIN is not required.

Request:

```json
{
  "password": "StrongPass123!",
  "pin": "5678",
  "duressPin": "4321"
}
```

Duress PIN behavior:

- Omit `duressPin` to keep the existing duress PIN.
- Send `null` or an empty string to remove the duress PIN.
- Send a 4-digit string to replace it.
- A replacement duress PIN must be different from the new normal PIN.
- If the existing duress PIN is kept, the new normal PIN must not match it.

Response `200`:

```json
{
  "success": true,
  "data": {
    "message": "PIN updated successfully",
    "hasDuressPin": true
  }
}
```

Errors:

- `400`: invalid input or invalid PIN format.
- `401`: invalid password.
- `409`: PIN is not configured. Use the setup endpoint.

---

## 10. SOS routes

All SOS routes are protected.

### `POST /api/sos`

Triggers an SOS event.

Request:

```json
{
  "pin": "1234",
  "location": {
    "latitude": 28.6139,
    "longitude": 77.209,
    "accuracy": 12.5
  },
  "message": "Please help me"
}
```

Rules:

- `pin` is required and must be exactly 4 digits.
- `location` is optional.
- If provided, `location` must contain numeric `latitude` and `longitude`.
- `accuracy` is optional and must be a non-negative number.
- `message` is optional and must not exceed 500 characters.

Trusted contacts are snapshotted at trigger time.

Response `201`:

```json
{
  "success": true,
  "data": {
    "message": "SOS triggered",
    "event": {
      "id": "665f1e4c9b1e8a0012a34569",
      "status": "active",
      "triggeredAt": "2026-11-08T10:05:00.000Z",
      "cancelledAt": null,
      "hasLocation": true,
      "location": {
        "latitude": 28.6139,
        "longitude": 77.209,
        "accuracy": 12.5
      },
      "message": "Please help me",
      "contactCount": 1
    },
    "notifications": {
      "simulated": true,
      "status": "created",
      "count": 1
    }
  }
}
```

`notifications.status` can be `created` or `failed`. This describes creation of simulated notification records, not real delivery.

Errors:

- `400`: invalid PIN format, PIN not configured, invalid location, or invalid message.
- `401`: invalid PIN.
- `423`: PIN is locked.
- `429`: general `/api` rate limit exceeded.

SOS uses the same five-attempt PIN lockout as the verification endpoint. The dedicated 10-request PIN limiter is mounted only on `/api/pin/verify`.

If the duress PIN is used, the SOS event is created with the hidden duress flag set, but the client receives the same response shape.

---

### `GET /api/sos`

Protected. Returns SOS history for the current user, newest first.

Query parameters:

- `page`: positive integer, default `1`.
- `limit`: integer from `1` to `50`, default `20`.

Example:

```text
GET /api/sos?page=1&limit=20
```

Response `200`:

```json
{
  "success": true,
  "data": {
    "events": [],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 0,
      "pages": 0
    }
  }
}
```

Errors:

- `400`: invalid page or limit.

---

### `GET /api/sos/:id`

Protected. Returns one SOS event owned by the current user.

Response `200`:

```json
{
  "success": true,
  "data": {
    "event": {
      "id": "665f1e4c9b1e8a0012a34569",
      "status": "active",
      "triggeredAt": "2026-11-08T10:05:00.000Z",
      "cancelledAt": null,
      "hasLocation": true,
      "location": {
        "latitude": 28.6139,
        "longitude": 77.209,
        "accuracy": 12.5
      },
      "message": "Please help me",
      "contactCount": 1
    }
  }
}
```

Errors:

- `404`: event not found or not owned by the current user.

---

### `PATCH /api/sos/:id/cancel`

Protected. Cancels an active SOS event.

Response `200`:

```json
{
  "success": true,
  "data": {
    "message": "SOS cancelled",
    "event": {
      "id": "665f1e4c9b1e8a0012a34569",
      "status": "cancelled",
      "cancelledAt": "2026-11-08T10:06:00.000Z"
    }
  }
}
```

This example is abridged. The full event object matches section 5.3.

Errors:

- `404`: event not found or not owned by the current user.
- `409`: event is not active.

---

### `GET /api/sos/:id/notifications`

Protected. Returns notification records for an event owned by the current user.

Response `200`:

```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "665f1f5d9b1e8a0012a3456a",
        "contactName": "Ravi Rao",
        "contactPhoneMasked": "******3210",
        "contactRelationship": "Family",
        "channel": "sms",
        "status": "simulated",
        "provider": "simulated",
        "sentAt": null,
        "createdAt": "2026-11-08T10:05:00.000Z",
        "error": null
      }
    ],
    "count": 1
  }
}
```

Errors:

- `404`: event not found or not owned by the current user.

> These records are simulated. No SMS message is actually sent.

---

## 11. Safety timer routes

All safety timer routes are protected.

### `POST /api/safety-timer`

Starts a safety timer. Requires the PIN.

Request:

```json
{
  "pin": "1234",
  "durationMinutes": 30,
  "message": "Check on me"
}
```

Rules:

- `pin` is required and must be exactly 4 digits.
- `durationMinutes` must be a whole number from `1` to `1440`.
- `message` is optional and must not exceed 500 characters.
- Only one active timer is allowed per user.
- Trusted contacts are snapshotted when the timer starts.

Response `201`:

```json
{
  "success": true,
  "data": {
    "message": "Safety timer started",
    "timer": {
      "id": "665f206e9b1e8a0012a3456b",
      "status": "active",
      "durationMinutes": 30,
      "message": "Check on me",
      "startedAt": "2026-11-08T10:10:00.000Z",
      "expiresAt": "2026-11-08T10:40:00.000Z",
      "secondsRemaining": 1800,
      "checkedInAt": null,
      "expiredAt": null,
      "contactCount": 1,
      "sosEventId": null
    }
  }
}
```

Errors:

- `400`: invalid PIN format, PIN not configured, invalid duration, or invalid message.
- `401`: invalid PIN.
- `409`: an active timer already exists.
- `423`: PIN is locked.
- `429`: general `/api` rate limit exceeded.

Starting a timer uses the five-attempt PIN lockout. The dedicated 10-request PIN limiter is mounted only on `/api/pin/verify`.

---

### `GET /api/safety-timer`

Protected. Returns the current active timer.

Response `200`:

```json
{
  "success": true,
  "data": {
    "timer": {
      "id": "665f206e9b1e8a0012a3456b",
      "status": "active",
      "durationMinutes": 30,
      "secondsRemaining": 1500,
      "contactCount": 1,
      "sosEventId": null
    }
  }
}
```

This example is abridged. The full timer object matches section 5.5.

Errors:

- `404`: no active safety timer.

---

### `PATCH /api/safety-timer/check-in`

Protected. Checks in on the active timer. Does not require a PIN.

Response `200`:

```json
{
  "success": true,
  "data": {
    "message": "Safety timer checked in",
    "timer": {
      "id": "665f206e9b1e8a0012a3456b",
      "status": "checked_in",
      "secondsRemaining": 0,
      "checkedInAt": "2026-11-08T10:20:00.000Z"
    }
  }
}
```

This example is abridged. The full timer object matches section 5.5.

Errors:

- `404`: no active safety timer. This includes a timer that the expiry sweep has already marked `expired`.
- `409`: the timer has passed `expiresAt` but the 15-second sweep has not yet marked it `expired`.

---

### Timer expiry behavior

The backend runs a sweep every 15 seconds.

When an active timer reaches `expiresAt`:

1. The timer status becomes `expired`.
2. An SOS event is created automatically.
3. The SOS event snapshots the timer's contact snapshot.
4. Simulated notification records are created.
5. The timer's `sosEventId` points to the created SOS event.

The generated SOS message is `Safety timer expired`, or `Safety timer expired: <timer message>` when the timer had a message. The generated SOS event has no location. If event creation fails, the timer is reverted to `active` and retried on the next sweep.

If the timer was started with the duress PIN, the created SOS event keeps the hidden duress flag.

---

## 12. Location routes

All private location routes are protected.

### `PUT /api/location`

Saves or replaces the current user's latest location.

Request:

```json
{
  "latitude": 28.6139,
  "longitude": 77.209,
  "accuracy": 12.5
}
```

Rules:

- `latitude` must be a number from `-90` to `90`.
- `longitude` must be a number from `-180` to `180`.
- `accuracy` is optional and must be non-negative.
- `recordedAt` is set by the server.
- Only the latest location is stored.

Response `200`:

```json
{
  "success": true,
  "data": {
    "message": "Location updated",
    "location": {
      "latitude": 28.6139,
      "longitude": 77.209,
      "accuracy": 12.5,
      "recordedAt": "2026-11-08T10:15:00.000Z"
    }
  }
}
```

Errors:

- `400`: invalid coordinates or accuracy.

---

### `GET /api/location`

Protected. Returns the current user's latest location.

Response `200`:

```json
{
  "success": true,
  "data": {
    "location": {
      "latitude": 28.6139,
      "longitude": 77.209,
      "accuracy": 12.5,
      "recordedAt": "2026-11-08T10:15:00.000Z"
    }
  }
}
```

Errors:

- `404`: location not found.

---

### `DELETE /api/location`

Protected. Deletes the current user's latest location.

Response `200`:

```json
{
  "success": true,
  "data": {
    "message": "Location deleted"
  }
}
```

Errors:

- `404`: location not found.

---

## 13. Location share routes

All `/api/location/share` routes share a 60 requests / 15 minutes / IP limiter, in addition to the general `/api` limiter.

### `POST /api/location/share`

Protected. Creates or replaces the current user's active public share link.

Request:

```json
{
  "expiresInMinutes": 60
}
```

Rules:

- `expiresInMinutes` is optional and defaults to `60`.
- It must be a whole number from `1` to `1440`.
- The user must have a saved location.
- Creating a new share invalidates the previous share.
- The raw token is returned only once.
- Only a SHA-256 hash of the token is stored.

Response `201`:

```json
{
  "success": true,
  "data": {
    "message": "Location share created",
    "share": {
      "token": "<64-character-hex-token>",
      "path": "/api/location/share/<64-character-hex-token>",
      "expiresAt": "2026-11-08T11:15:00.000Z"
    }
  }
}
```

Errors:

- `400`: invalid expiry or no saved location.
- `401`: missing or invalid token.
- `429`: location-share rate limit exceeded.

---

### `GET /api/location/share/:token`

Public. No authentication.

Response `200`:

```json
{
  "success": true,
  "data": {
    "owner": {
      "name": "Asha Rao"
    },
    "location": {
      "latitude": 28.6139,
      "longitude": 77.209,
      "accuracy": 12.5,
      "recordedAt": "2026-11-08T10:15:00.000Z"
    },
    "expiresAt": "2026-11-08T11:15:00.000Z"
  }
}
```

The public response does **not** include:

- Email
- Phone number
- User ID
- Any PIN or password data

Errors:

- `404`: invalid token, expired share, or no location available.
- `429`: public share rate limit exceeded.

The public view is subject to the same location-share limiter described at the start of this section.

---

### `DELETE /api/location/share`

Protected. Revokes the current user's active share.

Response `200`:

```json
{
  "success": true,
  "data": {
    "message": "Location share revoked"
  }
}
```

Errors:

- `401`: missing or invalid token.
- `404`: no active location share.
- `429`: location-share rate limit exceeded.

---

## 14. Security behavior

### Security headers

The backend uses Helmet and removes `X-Powered-By`.

### Logging

- The API writes structured JSON logs to stdout/stderr.
- Request logs include the request ID, method, matched route pattern, status, duration, and client IP.
- Request bodies, passwords, PINs, tokens, and route parameter values are not logged.
- `LOG_LEVEL` controls verbosity: `error`, `warn`, `info` (default), or `debug`.
- Every response includes `X-Request-ID`.

### CORS

CORS uses an explicit allowlist from `CORS_ORIGINS`.

- Allowed origins are reflected in `Access-Control-Allow-Origin`.
- Disallowed origins receive no CORS header.
- Preflight responses return `204`.
- Wildcard `*` is rejected by configuration validation.
- `X-Request-ID` is an allowed request header and an exposed response header.

### Rate limits

Current in-memory limits:

| Scope | Limit |
| --- | --- |
| All `/api` routes | 300 requests / 15 minutes / IP |
| Login and registration | 20 requests / 15 minutes / IP |
| `/api/pin/verify` only | 10 requests / 15 minutes / IP |
| Location share routes (create, view, revoke) | 60 requests / 15 minutes / IP |

The dedicated PIN limiter is mounted only on `/api/pin/verify`. SOS and safety-timer starts still enforce the five-attempt PIN lockout, but they do not use the dedicated PIN request limiter.

`429` responses include rate-limit headers and `Cache-Control: no-store`.

These limits are stored in process memory. A multi-instance production deployment will need a shared rate-limit store and correct reverse-proxy configuration.

### Request body limits

- JSON bodies are limited to `100kb`.
- Oversized bodies return `413`.
- Malformed JSON returns `400`.

### Input validation

Validation runs before handlers touch the database where possible.

- Request bodies for write routes must be JSON objects. Arrays, strings, numbers, and `null` return `400`. A missing body is handled by the route: required-field routes return `400`, while optional-body routes such as location share use their defaults.
- Required fields are type-checked before use. PINs must be exactly four digits, coordinates must be finite numbers in range, and messages cannot exceed 500 characters.
- Registration emails must match `^[^\s@]+@[^\s@]+\.[^\s@]+$` and be at most 254 characters. Registration passwords must be at least 8 characters and at most 72 bytes.
- Contact phone numbers must be exactly 10 digits. Relationships must be `Family`, `Friend`, `Relative`, `Colleague`, or `Other`.
- Pagination `page` must be a positive integer. `limit` must be between 1 and 50.
- Safety timer and location-share durations must be whole minutes between 1 and 1440.
- Allowed profile and contact fields are read individually. Unknown fields are ignored.
- Contact and SOS path IDs are validated before the controller runs. Invalid IDs return `404`.
- Share tokens must be 64 lowercase hex characters. Otherwise the API returns `404`.

### Error handling

- Unknown routes return `404`.
- Unexpected errors return a generic `500` response.
- Stack traces are not returned to clients.
- Ownership failures return `404`.

### Secret handling

- Passwords and PINs are hashed with bcrypt.
- Password hashes and PIN hashes use `select: false`.
- The `toJSON` transform removes password and PIN hashes.
- The API never returns plaintext passwords or PINs.
- The hidden duress flag is stored server-side only.

### Environment validation

Run:

```bash
npm run check:env
```

The command validates:

- `NODE_ENV`
- `PORT`
- `JWT_SECRET` (at least 32 characters; placeholder values rejected in production)
- `JWT_EXPIRES_IN`
- `CORS_ORIGINS`
- `TRUST_PROXY`
- `LOG_LEVEL`

The real JWT secret is never printed.

---

## 15. Current limitations

- Notifications are simulated only. Real SMS delivery is not implemented.
- Automated integration tests are not currently present because they require MongoDB.
- Rate limits use in-memory storage.
- Structured logs are available, but there is no metrics endpoint or log aggregation.
- There is no refresh-token flow; clients must log in again when the JWT expires.
- Account deletion, data export, and retention policies are not implemented.
- Frontend integration is pending.
- The frontend must stop storing plaintext passwords in `localStorage`.

---

## 16. Quick integration checklist

1. Start the backend with valid environment variables and a reachable MongoDB instance.
2. Call `GET /api/health` to confirm the service is running.
3. Register with `POST /api/auth/register`.
4. Log in with `POST /api/auth/login`.
5. Store only the JWT on the client.
6. Send `Authorization: Bearer <JWT>` on protected requests.
7. Set up a PIN before using SOS or safety timers.
8. Add trusted contacts before testing SOS notifications.
9. Treat notification records as simulated until a real provider is added.
10. Never send or store plaintext passwords or PINs in frontend storage.

---

## 17. Related documents

- Backend handoff: [`HANDOFF.md`](./HANDOFF.md)
- OpenAPI specification: [`openapi.yaml`](./openapi.yaml)
- Deployment guide: [`DEPLOYMENT.md`](./DEPLOYMENT.md)
- Production environment template: [`../.env.production.example`](../.env.production.example)
