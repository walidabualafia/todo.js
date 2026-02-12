package handler_test

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
)

// helper to register a user and return a JWT token.
func registerUser(t *testing.T, router http.Handler, username, email, password string) string {
	t.Helper()
	body := fmt.Sprintf(`{"username":%q,"email":%q,"password":%q}`, username, email, password)
	req := httptest.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("register %s: status = %d, body = %s", username, rec.Code, rec.Body.String())
	}
	var resp struct{ Token string }
	json.NewDecoder(rec.Body).Decode(&resp)
	return resp.Token
}

func authedRequest(method, path, token string, body string) *http.Request {
	req := httptest.NewRequest(method, path, bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	return req
}

func TestProjectCRUD(t *testing.T) {
	router := setupTestRouter(t)
	token := registerUser(t, router, "alice", "alice@example.com", "password123")

	// Create
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, authedRequest("POST", "/api/projects", token, `{"name":"My Project","description":"Test"}`))

	if rec.Code != http.StatusCreated {
		t.Fatalf("create: status = %d, body = %s", rec.Code, rec.Body.String())
	}

	var project struct {
		ID   int64  `json:"id"`
		Name string `json:"name"`
	}
	json.NewDecoder(rec.Body).Decode(&project)
	if project.Name != "My Project" {
		t.Errorf("name = %q, want My Project", project.Name)
	}

	// List
	rec = httptest.NewRecorder()
	router.ServeHTTP(rec, authedRequest("GET", "/api/projects", token, ""))
	if rec.Code != http.StatusOK {
		t.Fatalf("list: status = %d", rec.Code)
	}
	var projects []struct{ ID int64 }
	json.NewDecoder(rec.Body).Decode(&projects)
	if len(projects) != 1 {
		t.Errorf("got %d projects, want 1", len(projects))
	}

	// Get
	rec = httptest.NewRecorder()
	router.ServeHTTP(rec, authedRequest("GET", fmt.Sprintf("/api/projects/%d", project.ID), token, ""))
	if rec.Code != http.StatusOK {
		t.Fatalf("get: status = %d", rec.Code)
	}

	// Update
	rec = httptest.NewRecorder()
	router.ServeHTTP(rec, authedRequest("PUT", fmt.Sprintf("/api/projects/%d", project.ID), token, `{"name":"Updated","description":"New desc"}`))
	if rec.Code != http.StatusOK {
		t.Fatalf("update: status = %d, body = %s", rec.Code, rec.Body.String())
	}

	// Delete
	rec = httptest.NewRecorder()
	router.ServeHTTP(rec, authedRequest("DELETE", fmt.Sprintf("/api/projects/%d", project.ID), token, ""))
	if rec.Code != http.StatusNoContent {
		t.Fatalf("delete: status = %d", rec.Code)
	}
}

func TestProjectAccessControl(t *testing.T) {
	router := setupTestRouter(t)
	aliceToken := registerUser(t, router, "alice", "alice@example.com", "password123")
	bobToken := registerUser(t, router, "bob", "bob@example.com", "password123")

	// Alice creates a project
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, authedRequest("POST", "/api/projects", aliceToken, `{"name":"Private"}`))
	var project struct{ ID int64 }
	json.NewDecoder(rec.Body).Decode(&project)

	// Bob cannot access it
	rec = httptest.NewRecorder()
	router.ServeHTTP(rec, authedRequest("GET", fmt.Sprintf("/api/projects/%d", project.ID), bobToken, ""))
	if rec.Code != http.StatusForbidden {
		t.Errorf("bob access: status = %d, want %d", rec.Code, http.StatusForbidden)
	}

	// Bob cannot delete it
	rec = httptest.NewRecorder()
	router.ServeHTTP(rec, authedRequest("DELETE", fmt.Sprintf("/api/projects/%d", project.ID), bobToken, ""))
	if rec.Code != http.StatusForbidden {
		t.Errorf("bob delete: status = %d, want %d", rec.Code, http.StatusForbidden)
	}
}
