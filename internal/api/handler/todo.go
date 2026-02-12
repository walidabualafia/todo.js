package handler

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/walidabualafia/bloom/internal/api/middleware"
	"github.com/walidabualafia/bloom/internal/model"
	"github.com/walidabualafia/bloom/internal/store"
)

// Todo handles todo CRUD within projects.
type Todo struct {
	store store.Store
}

// NewTodo creates a new Todo handler.
func NewTodo(s store.Store) *Todo {
	return &Todo{store: s}
}

type createTodoRequest struct {
	Title       string  `json:"title"`
	Description string  `json:"description"`
	Status      string  `json:"status"`
	Priority    string  `json:"priority"`
	Deadline    *string `json:"deadline"`
}

type updateTodoRequest struct {
	Title       *string `json:"title"`
	Description *string `json:"description"`
	Status      *string `json:"status"`
	Priority    *string `json:"priority"`
	Deadline    *string `json:"deadline"`
}

// ListByProject returns all todos for a given project.
func (h *Todo) ListByProject(w http.ResponseWriter, r *http.Request) {
	projectID, err := strconv.ParseInt(chi.URLParam(r, "projectID"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid project id")
		return
	}

	userID := middleware.GetUserID(r.Context())
	isMember, err := h.store.IsProjectMember(r.Context(), projectID, userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal server error")
		return
	}
	if !isMember {
		writeError(w, http.StatusForbidden, "you do not have access to this project")
		return
	}

	todos, err := h.store.ListTodosByProject(r.Context(), projectID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list todos")
		return
	}
	if todos == nil {
		todos = []model.Todo{}
	}
	writeJSON(w, http.StatusOK, todos)
}

// Create adds a new todo to a project (owner or editor only).
func (h *Todo) Create(w http.ResponseWriter, r *http.Request) {
	projectID, err := strconv.ParseInt(chi.URLParam(r, "projectID"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid project id")
		return
	}

	userID := middleware.GetUserID(r.Context())
	role, err := h.store.GetMemberRole(r.Context(), projectID, userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal server error")
		return
	}
	if role == "" {
		writeError(w, http.StatusForbidden, "you do not have access to this project")
		return
	}
	if role == "viewer" {
		writeError(w, http.StatusForbidden, "viewers cannot create todos")
		return
	}

	var req createTodoRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Title == "" {
		writeError(w, http.StatusBadRequest, "title is required")
		return
	}

	todo := &model.Todo{
		ProjectID:   projectID,
		Title:       req.Title,
		Description: req.Description,
		Status:      req.Status,
		Priority:    req.Priority,
	}

	// Default values
	if todo.Status == "" {
		todo.Status = model.StatusPending
	}
	if todo.Priority == "" {
		todo.Priority = model.PriorityMedium
	}

	if !model.ValidStatus(todo.Status) {
		writeError(w, http.StatusBadRequest, "status must be 'pending', 'in_progress', or 'completed'")
		return
	}
	if !model.ValidPriority(todo.Priority) {
		writeError(w, http.StatusBadRequest, "priority must be 'low', 'medium', or 'high'")
		return
	}

	if req.Deadline != nil && *req.Deadline != "" {
		t, err := time.Parse(time.RFC3339, *req.Deadline)
		if err != nil {
			writeError(w, http.StatusBadRequest, "deadline must be in RFC3339 format")
			return
		}
		todo.Deadline = &t
	}

	if err := h.store.CreateTodo(r.Context(), todo); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create todo")
		return
	}

	writeJSON(w, http.StatusCreated, todo)
}

// Get returns a single todo by ID.
func (h *Todo) Get(w http.ResponseWriter, r *http.Request) {
	todoID, err := strconv.ParseInt(chi.URLParam(r, "todoID"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid todo id")
		return
	}

	todo, err := h.store.GetTodo(r.Context(), todoID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeError(w, http.StatusNotFound, "todo not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to get todo")
		return
	}

	// Verify access
	userID := middleware.GetUserID(r.Context())
	isMember, err := h.store.IsProjectMember(r.Context(), todo.ProjectID, userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal server error")
		return
	}
	if !isMember {
		writeError(w, http.StatusForbidden, "you do not have access to this todo")
		return
	}

	writeJSON(w, http.StatusOK, todo)
}

// Update modifies an existing todo (owner or editor only).
func (h *Todo) Update(w http.ResponseWriter, r *http.Request) {
	todoID, err := strconv.ParseInt(chi.URLParam(r, "todoID"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid todo id")
		return
	}

	todo, err := h.store.GetTodo(r.Context(), todoID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeError(w, http.StatusNotFound, "todo not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to get todo")
		return
	}

	userID := middleware.GetUserID(r.Context())
	role, err := h.store.GetMemberRole(r.Context(), todo.ProjectID, userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal server error")
		return
	}
	if role == "" {
		writeError(w, http.StatusForbidden, "you do not have access to this todo")
		return
	}
	if role == "viewer" {
		writeError(w, http.StatusForbidden, "viewers cannot edit todos")
		return
	}

	var req updateTodoRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Title != nil {
		todo.Title = *req.Title
	}
	if req.Description != nil {
		todo.Description = *req.Description
	}
	if req.Status != nil {
		if !model.ValidStatus(*req.Status) {
			writeError(w, http.StatusBadRequest, "invalid status")
			return
		}
		todo.Status = *req.Status
	}
	if req.Priority != nil {
		if !model.ValidPriority(*req.Priority) {
			writeError(w, http.StatusBadRequest, "invalid priority")
			return
		}
		todo.Priority = *req.Priority
	}
	if req.Deadline != nil {
		if *req.Deadline == "" {
			todo.Deadline = nil
		} else {
			t, err := time.Parse(time.RFC3339, *req.Deadline)
			if err != nil {
				writeError(w, http.StatusBadRequest, "deadline must be in RFC3339 format")
				return
			}
			todo.Deadline = &t
		}
	}

	if err := h.store.UpdateTodo(r.Context(), todo); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update todo")
		return
	}

	writeJSON(w, http.StatusOK, todo)
}

// Delete removes a todo (owner or editor only).
func (h *Todo) Delete(w http.ResponseWriter, r *http.Request) {
	todoID, err := strconv.ParseInt(chi.URLParam(r, "todoID"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid todo id")
		return
	}

	todo, err := h.store.GetTodo(r.Context(), todoID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeError(w, http.StatusNotFound, "todo not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to get todo")
		return
	}

	userID := middleware.GetUserID(r.Context())
	role, err := h.store.GetMemberRole(r.Context(), todo.ProjectID, userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal server error")
		return
	}
	if role == "" {
		writeError(w, http.StatusForbidden, "you do not have access to this todo")
		return
	}
	if role == "viewer" {
		writeError(w, http.StatusForbidden, "viewers cannot delete todos")
		return
	}

	if err := h.store.DeleteTodo(r.Context(), todoID); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete todo")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
