.PHONY: help dev dev-api dev-web build build-web build-go test test-go test-web lint lint-go lint-web clean docker

# Default target
help: ## Show this help message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

# ── Development ───────────────────────────────────────────────────────────────

dev: ## Run both API and frontend in development mode
	@echo "Starting Bloom in development mode..."
	@$(MAKE) dev-api &
	@$(MAKE) dev-web &
	@wait

dev-api: ## Run the Go API server with live reload (requires air)
	@echo "Starting API server on :8080..."
	@cd cmd/bloom && ENVIRONMENT=development go run .

dev-web: ## Run the Vite development server
	@echo "Starting frontend on :5173..."
	@cd web && npm run dev

# ── Build ─────────────────────────────────────────────────────────────────────

build: build-web build-go ## Build the production binary (frontend + backend)

build-web: ## Build the frontend for production
	@echo "Building frontend..."
	@cd web && npm ci && npm run build

build-go: ## Build the Go binary
	@echo "Building bloom binary..."
	@go build -o bin/bloom ./cmd/bloom

# ── Testing ───────────────────────────────────────────────────────────────────

test: test-go test-web ## Run all tests

test-go: ## Run Go tests
	@echo "Running Go tests..."
	@go test -v -race -count=1 ./...

test-web: ## Run frontend tests
	@echo "Running frontend tests..."
	@cd web && npm test -- --run

# ── Linting ───────────────────────────────────────────────────────────────────

lint: lint-go lint-web ## Run all linters

lint-go: ## Run Go linter
	@echo "Linting Go code..."
	@golangci-lint run ./...

lint-web: ## Run frontend linter
	@echo "Linting frontend code..."
	@cd web && npm run lint

# ── Docker ────────────────────────────────────────────────────────────────────

docker: ## Build the Docker image
	@echo "Building Docker image..."
	@docker build -t bloom .

docker-run: ## Run the Docker container
	@docker run -p 8080:8080 -v bloom-data:/data -e DATABASE_URL=/data/bloom.db bloom

# ── Cleanup ───────────────────────────────────────────────────────────────────

clean: ## Remove build artifacts
	@rm -rf bin/ web/dist/
	@mkdir -p web/dist && touch web/dist/placeholder
	@echo "Cleaned build artifacts."
