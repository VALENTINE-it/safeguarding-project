# Safeguarding — Backend (Node.js + Express + MongoDB)

A secure, anonymous messaging API for the Safeguarding React app.

---

## Project Structure

```
safeguarding-backend/
├── server.js              # Express app entry point
├── config/
│   └── db.js              # MongoDB connection
├── models/
│   ├── Message.js         # New message schema (with threadToken)
│   └── Reply.js           # Follow-up reply schema
├── routes/
│   ├── messages.js        # POST /api/messages
│   └── threads.js         # GET /api/threads/:token  |  POST /api/threads/:token/reply
├── middleware/
│   └── sanitize.js        # HTML-strip middleware
├── frontend-updated/
│   ├── N.form.js          # Updated React new-message form (wired to API)
│   └── F.form.js          # Updated React follow-up form (wired to API)
├── .env.example
├── .gitignore
└── package.json
```

---

## Quick Start

### 1. Prerequisites

- **Node.js** ≥ 18
- **MongoDB** — local (`mongod`) or [MongoDB Atlas](https://www.mongodb.com/atlas)

### 2. Install dependencies

```bash
cd safeguarding-backend 
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/safeguarding
CLIENT_ORIGIN=http://localhost:3000
```

For **MongoDB Atlas**, replace `MONGO_URI` with your Atlas connection string.

### 4. Run the server

```bash
# Development (auto-restarts on change)
npm run dev

# Production
npm start
```

The API will be available at `http://localhost:5000`.

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/messages` | Submit a new anonymous message |
| `GET` | `/api/threads/:threadToken` | Retrieve a thread by token |
| `POST` | `/api/threads/:threadToken/reply` | Add a follow-up to a thread |

### POST `/api/messages`

**Body:**
```json
{
  "topic": "New Safeguarding Report",
  "message": "Something happened today that I want to report..."
}
```

**Response (201):**
```json
{
  "success": true,
  "threadToken": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Your message has been sent securely."
}
```

> ⚠️ The `threadToken` is **only returned once**. The sender must save it to follow up.

---

### GET `/api/threads/:threadToken`

**Response (200):**
```json
{
  "success": true,
  "thread": {
    "threadToken": "550e8400-...",
    "topic": "New Safeguarding Report",
    "message": "Something happened...",
    "isRead": true,
    "readAt": "2024-01-15T10:30:00.000Z",
    "createdAt": "2024-01-15T09:00:00.000Z",
    "replies": []
  }
}
```

---

### POST `/api/threads/:threadToken/reply`

**Body:**
```json
{
  "topic": "Follow-up Report",
  "message": "Additional information I forgot to include..."
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Your follow-up has been sent securely."
}
```

---

## Frontend Integration

Replace the original form files in `my-app/src/` with the updated ones from `frontend-updated/`:

```bash
cp frontend-updated/N.form.js ../my-app/src/N.form.js
cp frontend-updated/F.form.js ../my-app/src/F.form.js
```

Add this to `my-app/.env`:

```env
REACT_APP_API_URL=http://localhost:5000
```

Also update `index.js` to pass an `onBack` prop to the form components:

```jsx
// In SafeGuardingApp — add onBack prop to FormComponent
<FormComponent onBack={() => setShowForm(false)} />
```

---

## Security Features

| Feature | Implementation |
|---------|---------------|
| **Helmet** | Sets secure HTTP headers |
| **Rate limiting** | 20 msg/15 min per IP on message routes |
| **CORS whitelist** | Only your front-end origin is allowed |
| **Input validation** | `express-validator` on all routes |
| **HTML sanitization** | `sanitize-html` strips all tags from body fields |
| **Body size limit** | Max 10 KB per request |
| **Anonymous tokens** | UUIDs — no user data stored |
| **No IP logging** | IP addresses are never persisted |

---

## Running Both Servers

From the project root, open two terminals:

```bash
# Terminal 1 — Backend
cd safeguarding-backend && npm run dev

# Terminal 2 — Frontend
cd my-app && npm start
```

Or add a `concurrently` script to the root `package.json` to run both with one command.


## Building Docker Image

Run `sudo docker build -t <name-of-image>`

## How to run a docker Image

Run `sudo docker image`

## Running The APP using Docker

Run `sudo docker run -p 3000:3000 <name-of-image>`