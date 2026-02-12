package config

import (
	"fmt"
	"os"
)

// Config holds all application configuration, loaded from environment variables.
type Config struct {
	Port        string
	DBDriver    string
	DatabaseURL string
	JWTSecret   string
	Environment string
}

// Load reads configuration from environment variables with sensible defaults.
func Load() (*Config, error) {
	cfg := &Config{
		Port:        getEnv("PORT", "8080"),
		DBDriver:    getEnv("DB_DRIVER", "sqlite"),
		DatabaseURL: getEnv("DATABASE_URL", "bloom.db"),
		JWTSecret:   os.Getenv("JWT_SECRET"),
		Environment: getEnv("ENVIRONMENT", "development"),
	}

	if cfg.JWTSecret == "" {
		if cfg.Environment == "production" {
			return nil, fmt.Errorf("JWT_SECRET environment variable is required in production")
		}
		// Use a default secret only in development
		cfg.JWTSecret = "bloom-dev-secret-change-me"
	}

	if cfg.DBDriver != "sqlite" && cfg.DBDriver != "postgres" {
		return nil, fmt.Errorf("DB_DRIVER must be 'sqlite' or 'postgres', got '%s'", cfg.DBDriver)
	}

	return cfg, nil
}

// IsDevelopment returns true if the app is running in development mode.
func (c *Config) IsDevelopment() bool {
	return c.Environment == "development"
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
