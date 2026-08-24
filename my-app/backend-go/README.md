# Safeguarding — Go Backend

A secure, anonymous messaging API for the Safeguarding React app, implemented in Go and backed by SQLite.

---

## Overview

The backend now runs as a single Go service in [backend-go](../backend-go). The Go server exposes the core API surface for:

- anonymous message submission
- thread retrieval and replies
- staff directory management
- admin and super-admin authentication
- health checks

---

## Project structure

```text
backend-go/
├── cmd/
│   └── server/
│       └── main.go              # application entry point
├── internal/
│   └── app/
│       ├── auth.go              # auth and super-admin routes
│       ├── messages.go          # message listing and submission routes
│       ├── models.go            # domain models
│       ├── server.go            # router, middleware, and DB bootstrap
│       ├── staff.go             # staff management routes
│       ├── threads.go           # thread retrieval and reply routes
│       └── server_test.go       # basic health endpoint test
├── go.mod                       # Go module definition
└── go.sum                       # dependency lockfile
```

---

## Prerequisites

- Go 1.22+
- SQLite (no external service required; the database is a local file)

---

## Environment

Set the following environment variables before starting the server:

```bash
export PORT=5000
export DB_PATH=./safeguarding.db
export JWT_SECRET=safeguarding_secret_key_2026
```

### Turso Cloud Database (Recommended for Free Cloud Persistence)

To connect to a free hosted Turso SQLite cloud database:

```bash
export TURSO_DATABASE_URL=libsql://<your-db-name>-<your-org>.turso.io
export TURSO_AUTH_TOKEN=<your-turso-auth-token>
```

When `TURSO_DATABASE_URL` is provided, the backend connects to Turso automatically and provisions the schema and default accounts. If not set, it defaults to a local `./safeguarding.db` SQLite file.

---

## Run the backend

From the backend-go directory:

```bash
cd my-app/backend-go
go mod tidy
go run ./cmd/server
```

The API will be available at:

```text
http://localhost:5000
```

---

## Health check

```bash
curl http://localhost:5000/api/health
```

Example response:

```json
{
  "status": "ok",
  "timestamp": "2026-08-04T04:27:29.711532883Z"
}
```

---

## API overview

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/auth/register` | Register an admin |
| `POST` | `/api/auth/login` | Log in an admin |
| `GET` | `/api/auth/admins` | List admins |
| `POST` | `/api/super-auth/register` | Register a super admin |
| `POST` | `/api/super-auth/login` | Log in a super admin |
| `GET` | `/api/super-auth/superadmins` | List super admins |
| `GET` | `/api/messages` | List messages |
| `GET` | `/api/messages/unread` | List unread messages |
| `POST` | `/api/messages` | Submit a new message |
| `PATCH` | `/api/messages/mark-all-read` | Mark visible messages as read |
| `PATCH` | `/api/messages/:id/read` | Mark a single message as read |
| `GET` | `/api/threads/:threadToken` | Retrieve a thread |
| `POST` | `/api/threads/:threadToken/reply` | Add a reply to a thread |
| `GET` | `/api/staff` | List staff members |
| `POST` | `/api/staff` | Add a staff member |
| `DELETE` | `/api/staff/:id` | Remove a staff member |

---

## Testing

Run the test suite with:

```bash
cd my-app/backend-go
go test ./...
```

---

## Notes

- The Go service keeps the same JSON responses and endpoint paths as the original backend where possible so the React frontend can continue using the same API contract.
- The database is a local SQLite file. If the file is not writable, the server will still start but database-backed requests will fail until the database is accessible.
