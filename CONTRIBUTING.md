# Contributing to Bloom

Thank you for your interest in contributing to Bloom! This guide will help you get started.

## Getting Started

### Prerequisites

- [Go 1.24+](https://go.dev/dl/)
- [Node.js 20+](https://nodejs.org/)
- [Git](https://git-scm.com/)

### Development Setup

1. **Fork and clone the repository:**

   ```bash
   git clone https://github.com/<your-username>/bloom.git
   cd bloom
   ```

2. **Install frontend dependencies:**

   ```bash
   cd web && npm install && cd ..
   ```

3. **Start the development servers:**

   In one terminal, start the Go API server:

   ```bash
   make dev-api
   ```

   In another terminal, start the Vite dev server:

   ```bash
   make dev-web
   ```

4. **Open the app:**

   Navigate to [http://localhost:5173](http://localhost:5173). The Vite dev server proxies API requests to the Go server on port 8080.

### Running Tests

```bash
# Run all Go tests
make test-go

# Run all frontend tests
make test-web

# Run everything
make test
```

### Building

```bash
# Build the production binary (includes embedded frontend)
make build

# Run it
./bin/bloom
```

## How to Contribute

### Reporting Bugs

Use the [Bug Report](https://github.com/walidabualafia/bloom/issues/new?template=bug_report.md) issue template.

### Suggesting Features

Use the [Feature Request](https://github.com/walidabualafia/bloom/issues/new?template=feature_request.md) issue template.

### Submitting Pull Requests

1. Create a branch from `main`: `git checkout -b feature/my-feature`
2. Make your changes with clear, focused commits
3. Ensure all tests pass: `make test`
4. Push your branch and open a pull request

### Code Style

**Go:**

- Follow standard Go conventions
- Run `gofmt` before committing (your editor likely does this automatically)
- Add tests for new functionality
- Use meaningful variable and function names

**TypeScript/React:**

- Follow the existing code style
- Use TypeScript types (avoid `any`)
- Add component tests for new UI components
- Use Tailwind CSS for styling

## Project Structure

```
bloom/
├── cmd/bloom/           # Go entry point
├── internal/
│   ├── api/             # HTTP handlers, router, middleware
│   ├── config/          # Configuration management
│   ├── model/           # Domain types
│   └── store/           # Database layer (SQLite + PostgreSQL)
├── web/                 # React + TypeScript frontend
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── hooks/       # Custom React hooks
│   │   ├── pages/       # Page-level components
│   │   ├── services/    # API client
│   │   └── types/       # TypeScript types
├── Dockerfile           # Multi-stage production build
├── docker-compose.yml   # Local development with Docker
└── Makefile             # Common development commands
```

## Questions?

Feel free to open an issue or start a discussion. We're happy to help!
