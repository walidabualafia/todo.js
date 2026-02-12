package main

import (
	"context"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/walidabualafia/bloom/internal/api"
	"github.com/walidabualafia/bloom/internal/config"
	"github.com/walidabualafia/bloom/internal/store"
	"github.com/walidabualafia/bloom/web"

	sqlitestore "github.com/walidabualafia/bloom/internal/store/sqlite"
	pgstore "github.com/walidabualafia/bloom/internal/store/postgres"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
	}
}

func run() error {
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}

	// Initialize the database store.
	var db store.Store
	switch cfg.DBDriver {
	case "sqlite":
		db, err = sqlitestore.New(cfg.DatabaseURL)
	case "postgres":
		db, err = pgstore.New(cfg.DatabaseURL)
	default:
		return fmt.Errorf("unsupported database driver: %s", cfg.DBDriver)
	}
	if err != nil {
		return fmt.Errorf("open database: %w", err)
	}
	defer db.Close()

	// Run migrations.
	if err := db.Migrate(context.Background()); err != nil {
		return fmt.Errorf("run migrations: %w", err)
	}
	log.Printf("database ready (%s)", cfg.DBDriver)

	// Build the router.
	router := api.NewRouter(db, cfg.JWTSecret)

	// Serve the embedded frontend in production, or skip in development
	// (Vite dev server handles the frontend).
	if !cfg.IsDevelopment() {
		frontendFS, err := fs.Sub(web.Assets, "dist")
		if err != nil {
			return fmt.Errorf("frontend assets: %w", err)
		}
		fileServer := http.FileServer(http.FS(frontendFS))

		// Serve static files, fall back to index.html for SPA routing.
		router.Get("/*", func(w http.ResponseWriter, r *http.Request) {
			// Try to serve the file directly.
			if _, err := fs.Stat(frontendFS, r.URL.Path[1:]); err == nil {
				fileServer.ServeHTTP(w, r)
				return
			}
			// Fall back to index.html for client-side routing.
			r.URL.Path = "/"
			fileServer.ServeHTTP(w, r)
		})
	}

	// Start the HTTP server.
	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown on SIGINT/SIGTERM.
	done := make(chan os.Signal, 1)
	signal.Notify(done, os.Interrupt, syscall.SIGTERM)

	go func() {
		log.Printf("bloom is running on http://localhost:%s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server error: %v", err)
		}
	}()

	<-done
	log.Println("shutting down...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	return srv.Shutdown(ctx)
}
