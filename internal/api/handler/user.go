package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"github.com/walidabualafia/bloom/internal/api/middleware"
	"github.com/walidabualafia/bloom/internal/model"
	"github.com/walidabualafia/bloom/internal/store"
)

// User handles admin user management endpoints.
type User struct {
	store store.Store
}

// NewUser creates a new User handler.
func NewUser(s store.Store) *User {
	return &User{store: s}
}

type updateUserRequest struct {
	Username *string `json:"username"`
	Email    *string `json:"email"`
	IsAdmin  *bool   `json:"is_admin"`
}

// Search returns users matching a query string (for sharing projects).
func (h *User) Search(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query().Get("q")
	if q == "" {
		writeJSON(w, http.StatusOK, []model.User{})
		return
	}

	callerID := middleware.GetUserID(r.Context())
	users, err := h.store.SearchUsers(r.Context(), q, callerID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to search users")
		return
	}
	if users == nil {
		users = []model.User{}
	}
	writeJSON(w, http.StatusOK, users)
}

// List returns all users (admin only).
func (h *User) List(w http.ResponseWriter, r *http.Request) {
	if !h.isAdmin(w, r) {
		return
	}

	users, err := h.store.ListUsers(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list users")
		return
	}
	if users == nil {
		users = []model.User{}
	}
	writeJSON(w, http.StatusOK, users)
}

// Update modifies a user (admin only).
func (h *User) Update(w http.ResponseWriter, r *http.Request) {
	if !h.isAdmin(w, r) {
		return
	}

	userID, err := strconv.ParseInt(chi.URLParam(r, "userID"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	user, err := h.store.GetUserByID(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusNotFound, "user not found")
		return
	}

	var req updateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Username != nil {
		user.Username = *req.Username
	}
	if req.Email != nil {
		user.Email = *req.Email
	}
	if req.IsAdmin != nil {
		user.IsAdmin = *req.IsAdmin
	}

	if err := h.store.UpdateUser(r.Context(), user); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update user")
		return
	}

	writeJSON(w, http.StatusOK, user)
}

// Delete removes a user (admin only).
func (h *User) Delete(w http.ResponseWriter, r *http.Request) {
	if !h.isAdmin(w, r) {
		return
	}

	userID, err := strconv.ParseInt(chi.URLParam(r, "userID"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	callerID := middleware.GetUserID(r.Context())
	if userID == callerID {
		writeError(w, http.StatusBadRequest, "you cannot delete yourself")
		return
	}

	if err := h.store.DeleteUser(r.Context(), userID); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete user")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// Stats returns system-wide statistics (admin only).
func (h *User) Stats(w http.ResponseWriter, r *http.Request) {
	if !h.isAdmin(w, r) {
		return
	}

	stats, err := h.store.GetStats(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to get stats")
		return
	}

	writeJSON(w, http.StatusOK, stats)
}

// isAdmin checks if the current user is an admin. Writes 403 if not.
func (h *User) isAdmin(w http.ResponseWriter, r *http.Request) bool {
	userID := middleware.GetUserID(r.Context())
	user, err := h.store.GetUserByID(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal server error")
		return false
	}
	if !user.IsAdmin {
		writeError(w, http.StatusForbidden, "admin access required")
		return false
	}
	return true
}
