package handler_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/walidabualafia/bloom/internal/api"
	"github.com/walidabualafia/bloom/internal/store/sqlite"
	"context"
)

const testJWTSecret = "test-secret-key"

func setupTestRouter(t *testing.T) http.Handler {
	t.Helper()
	s, err := sqlite.New(":memory:")
	if err != nil {
		t.Fatalf("open store: %v", err)
	}
	if err := s.Migrate(context.Background()); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	t.Cleanup(func() { s.Close() })
	return api.NewRouter(s, testJWTSecret)
}

func TestRegisterAndLogin(t *testing.T) {
	router := setupTestRouter(t)

	// Register
	body := `{"username":"testuser","email":"test@example.com","password":"password123"}`
	req := httptest.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("register: status = %d, want %d, body = %s", rec.Code, http.StatusCreated, rec.Body.String())
	}

	var regResp struct {
		Token string `json:"token"`
		User  struct {
			ID       int64  `json:"id"`
			Username string `json:"username"`
		} `json:"user"`
	}
	json.NewDecoder(rec.Body).Decode(&regResp)

	if regResp.Token == "" {
		t.Fatal("expected non-empty token")
	}
	if regResp.User.Username != "testuser" {
		t.Errorf("username = %q, want testuser", regResp.User.Username)
	}

	// Login
	body = `{"username":"testuser","password":"password123"}`
	req = httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	rec = httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("login: status = %d, want %d, body = %s", rec.Code, http.StatusOK, rec.Body.String())
	}

	var loginResp struct {
		Token string `json:"token"`
	}
	json.NewDecoder(rec.Body).Decode(&loginResp)
	if loginResp.Token == "" {
		t.Fatal("expected non-empty token from login")
	}

	// Me
	req = httptest.NewRequest(http.MethodGet, "/api/auth/me", nil)
	req.Header.Set("Authorization", "Bearer "+loginResp.Token)
	rec = httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("me: status = %d, want %d", rec.Code, http.StatusOK)
	}
}

func TestRegisterValidation(t *testing.T) {
	router := setupTestRouter(t)

	tests := []struct {
		name string
		body string
		want int
	}{
		{"empty body", `{}`, http.StatusBadRequest},
		{"missing password", `{"username":"a","email":"a@b.com"}`, http.StatusBadRequest},
		{"short password", `{"username":"a","email":"a@b.com","password":"12345"}`, http.StatusBadRequest},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			rec := httptest.NewRecorder()
			router.ServeHTTP(rec, req)

			if rec.Code != tt.want {
				t.Errorf("status = %d, want %d, body = %s", rec.Code, tt.want, rec.Body.String())
			}
		})
	}
}

func TestLoginInvalidCredentials(t *testing.T) {
	router := setupTestRouter(t)

	body := `{"username":"nonexistent","password":"password123"}`
	req := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusUnauthorized)
	}
}

func TestProtectedRouteWithoutAuth(t *testing.T) {
	router := setupTestRouter(t)

	req := httptest.NewRequest(http.MethodGet, "/api/projects", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusUnauthorized)
	}
}
