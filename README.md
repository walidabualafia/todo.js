# Bloom

[![CI](https://github.com/walidabualafia/bloom/actions/workflows/ci.yml/badge.svg)](https://github.com/walidabualafia/bloom/actions/workflows/ci.yml)
[![Go](https://img.shields.io/badge/Go-1.24-00ADD8?logo=go&logoColor=white)](https://go.dev)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A modern, multi-user task management application built with **Go** and **React/TypeScript**. Ships as a single binary with an embedded frontend and SQLite database -- no external dependencies required.

## Features

- **Multi-user authentication** with JWT tokens and bcrypt password hashing
- **Project management** -- create, edit, delete, and organize projects
- **Todo tracking** with status (pending/in-progress/completed), priority (low/medium/high), and deadlines
- **Project sharing** -- invite users as viewers or editors with role-based access control
- **Admin dashboard** -- system stats, user management
- **Dark mode** -- toggle between light and dark themes
- **Responsive design** -- works on desktop, tablet, and mobile
- **Single binary deployment** -- frontend embedded in the Go binary via `embed`
- **Dual database support** -- SQLite (default, zero-config) or PostgreSQL (production scale)

## Architecture

```
┌─────────────────────────────────────────────┐
│              Single Binary (bloom)          │
│                                             │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐ │
│  │ React UI │  │ Go API   │  │ Store     │ │
│  │ (embed)  │──│ (Chi)    │──│ Interface │ │
│  └──────────┘  └──────────┘  └─────┬─────┘ │
│                                    │       │
└────────────────────────────────────┼───────┘
                                     │
                          ┌──────────┴──────────┐
                          │                     │
                     ┌────┴────┐          ┌─────┴─────┐
                     │ SQLite  │          │PostgreSQL  │
                     │(default)│          │(optional)  │
                     └─────────┘          └───────────┘
```

**Backend:** Go with Chi router, repository pattern, JWT auth, structured middleware

**Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + TanStack Query

## Quick Start

### Option 1: Download a release

Download the latest binary from [Releases](https://github.com/walidabualafia/bloom/releases), then:

```bash
./bloom
```

Open [http://localhost:8080](http://localhost:8080) and register your first account.

### Option 2: Docker

```bash
docker run -p 8080:8080 -v bloom-data:/home/bloom/data ghcr.io/walidabualafia/bloom:latest
```

### Option 3: Build from source

```bash
git clone https://github.com/walidabualafia/bloom.git
cd bloom
make build
./bin/bloom
```

## Development

### Prerequisites

- [Go 1.24+](https://go.dev/dl/)
- [Node.js 20+](https://nodejs.org/)

### Setup

```bash
# Install frontend dependencies
cd web && npm install && cd ..

# Start the API server (port 8080)
make dev-api

# In another terminal, start the frontend dev server (port 5173)
make dev-web
```

Open [http://localhost:5173](http://localhost:5173). The Vite dev server proxies `/api` requests to the Go backend.

### Testing

```bash
make test        # Run all tests
make test-go     # Go tests only
make test-web    # Frontend tests only
```

### Building

```bash
make build       # Build production binary with embedded frontend
make docker      # Build Docker image
```

## Configuration

Bloom is configured via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | HTTP server port |
| `DB_DRIVER` | `sqlite` | Database driver (`sqlite` or `postgres`) |
| `DATABASE_URL` | `bloom.db` | SQLite file path or PostgreSQL connection string |
| `JWT_SECRET` | (dev default) | Secret key for JWT signing (required in production) |
| `ENVIRONMENT` | `development` | `development` or `production` |

### PostgreSQL

To use PostgreSQL instead of SQLite:

```bash
export DB_DRIVER=postgres
export DATABASE_URL="postgres://user:pass@localhost:5432/bloom?sslmode=disable"
./bloom
```

## API Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/auth/register` | Register a new user | No |
| POST | `/api/auth/login` | Login and get JWT | No |
| GET | `/api/auth/me` | Get current user | Yes |
| GET | `/api/projects` | List user's projects | Yes |
| POST | `/api/projects` | Create a project | Yes |
| GET | `/api/projects/:id` | Get a project | Yes |
| PUT | `/api/projects/:id` | Update a project | Yes (owner) |
| DELETE | `/api/projects/:id` | Delete a project | Yes (owner) |
| GET | `/api/projects/:id/members` | List project members | Yes |
| POST | `/api/projects/:id/members` | Add a project member | Yes (owner) |
| DELETE | `/api/projects/:id/members/:uid` | Remove a member | Yes (owner) |
| GET | `/api/projects/:id/todos` | List project todos | Yes |
| POST | `/api/projects/:id/todos` | Create a todo | Yes |
| GET | `/api/todos/:id` | Get a todo | Yes |
| PUT | `/api/todos/:id` | Update a todo | Yes |
| DELETE | `/api/todos/:id` | Delete a todo | Yes |
| GET | `/api/admin/stats` | System statistics | Admin |
| GET | `/api/admin/users` | List all users | Admin |
| PUT | `/api/admin/users/:id` | Update a user | Admin |
| DELETE | `/api/admin/users/:id` | Delete a user | Admin |

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT](LICENSE)
