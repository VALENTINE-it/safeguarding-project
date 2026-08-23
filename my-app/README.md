# Safeguarding App

This React app provides the front end for a secure safeguarding experience, backed by a Go-based API service.

## Overview

The application includes:
- a branded landing experience
- a secure message form for submitting safeguarding reports
- follow-up support through thread-based messaging
- admin and super-admin authentication flows

The backend now runs as a single Go service rather than a Node.js service.

## Frontend scripts

In the project directory, you can run:

### `npm start`

Runs the React app in development mode.
Open http://localhost:3000 to view it in the browser.

### `npm test`

Runs the frontend test suite.

### `npm run build`

Builds the app for production.

## Backend

The API is served by the Go backend in [backend-go](backend-go).

### Run the backend

```bash
cd backend-go
go mod tidy
go run ./cmd/server
```

The API will be available at http://localhost:5000.

### Health check

```bash
curl http://localhost:5000/api/health
```

## Docker

Build the frontend image:

```bash
docker build -t safeguarding-frontend .
```

Run the frontend container:

```bash
docker run -p 3000:3000 safeguarding-frontend
```

### Database

On Terminal:sudo apt update && sudo apt install sqlitebrowser -y
            :sqlitebrowser
            :safeguarding.db
            
If you also want to run the Go backend in Docker, use the backend service configuration from the Go project directory.
