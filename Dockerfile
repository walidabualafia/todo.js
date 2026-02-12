# ── Stage 1: Build frontend ──────────────────────────────────────────────────
FROM node:20-alpine AS frontend

WORKDIR /app/web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# ── Stage 2: Build Go binary ────────────────────────────────────────────────
FROM golang:1.24-alpine AS backend

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
COPY --from=frontend /app/web/dist ./web/dist
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o bloom ./cmd/bloom

# ── Stage 3: Final minimal image ────────────────────────────────────────────
FROM alpine:3.20

RUN apk add --no-cache ca-certificates tzdata && \
    adduser -D -h /home/bloom bloom

USER bloom
WORKDIR /home/bloom

COPY --from=backend /app/bloom .

ENV PORT=8080
ENV DB_DRIVER=sqlite
ENV DATABASE_URL=/home/bloom/data/bloom.db
ENV ENVIRONMENT=production

EXPOSE 8080

VOLUME ["/home/bloom/data"]

ENTRYPOINT ["./bloom"]
