package handler

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"github.com/walidabualafia/bloom/internal/api/middleware"
	"github.com/walidabualafia/bloom/internal/model"
	"github.com/walidabualafia/bloom/internal/store"
)

// Project handles project CRUD and member management.
type Project struct {
	store store.Store
}

// NewProject creates a new Project handler.
func NewProject(s store.Store) *Project {
	return &Project{store: s}
}

type createProjectRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

type addMemberRequest struct {
	Username string `json:"username"`
	Role     string `json:"role"`
}

// List returns all projects accessible to the authenticated user.
func (h *Project) List(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	projects, err := h.store.ListProjectsByUser(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list projects")
		return
	}
	if projects == nil {
		projects = []model.Project{}
	}
	writeJSON(w, http.StatusOK, projects)
}

// Create creates a new project owned by the authenticated user.
func (h *Project) Create(w http.ResponseWriter, r *http.Request) {
	var req createProjectRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Name == "" {
		writeError(w, http.StatusBadRequest, "name is required")
		return
	}

	userID := middleware.GetUserID(r.Context())
	project := &model.Project{
		Name:        req.Name,
		Description: req.Description,
		OwnerID:     userID,
	}

	if err := h.store.CreateProject(r.Context(), project); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create project")
		return
	}

	writeJSON(w, http.StatusCreated, project)
}

// Get returns a single project by ID (must be a member).
func (h *Project) Get(w http.ResponseWriter, r *http.Request) {
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

	project, err := h.store.GetProject(r.Context(), projectID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeError(w, http.StatusNotFound, "project not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to get project")
		return
	}

	writeJSON(w, http.StatusOK, project)
}

// GetRole returns the current user's role in a project.
func (h *Project) GetRole(w http.ResponseWriter, r *http.Request) {
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

	writeJSON(w, http.StatusOK, map[string]string{"role": role})
}

// Update modifies a project (owner only).
func (h *Project) Update(w http.ResponseWriter, r *http.Request) {
	projectID, err := strconv.ParseInt(chi.URLParam(r, "projectID"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid project id")
		return
	}

	project, err := h.store.GetProject(r.Context(), projectID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeError(w, http.StatusNotFound, "project not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to get project")
		return
	}

	userID := middleware.GetUserID(r.Context())
	if project.OwnerID != userID {
		writeError(w, http.StatusForbidden, "only the owner can update this project")
		return
	}

	var req createProjectRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Name != "" {
		project.Name = req.Name
	}
	project.Description = req.Description

	if err := h.store.UpdateProject(r.Context(), project); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update project")
		return
	}

	writeJSON(w, http.StatusOK, project)
}

// Delete removes a project (owner only).
func (h *Project) Delete(w http.ResponseWriter, r *http.Request) {
	projectID, err := strconv.ParseInt(chi.URLParam(r, "projectID"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid project id")
		return
	}

	project, err := h.store.GetProject(r.Context(), projectID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeError(w, http.StatusNotFound, "project not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to get project")
		return
	}

	userID := middleware.GetUserID(r.Context())
	if project.OwnerID != userID {
		writeError(w, http.StatusForbidden, "only the owner can delete this project")
		return
	}

	if err := h.store.DeleteProject(r.Context(), projectID); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete project")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// ListMembers returns all members of a project.
func (h *Project) ListMembers(w http.ResponseWriter, r *http.Request) {
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

	members, err := h.store.ListProjectMembers(r.Context(), projectID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list members")
		return
	}
	if members == nil {
		members = []model.ProjectMember{}
	}
	writeJSON(w, http.StatusOK, members)
}

// AddMember adds a user to a project (owner only).
func (h *Project) AddMember(w http.ResponseWriter, r *http.Request) {
	projectID, err := strconv.ParseInt(chi.URLParam(r, "projectID"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid project id")
		return
	}

	project, err := h.store.GetProject(r.Context(), projectID)
	if err != nil {
		writeError(w, http.StatusNotFound, "project not found")
		return
	}

	userID := middleware.GetUserID(r.Context())
	if project.OwnerID != userID {
		writeError(w, http.StatusForbidden, "only the owner can add members")
		return
	}

	var req addMemberRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Username == "" {
		writeError(w, http.StatusBadRequest, "username is required")
		return
	}
	if req.Role == "" {
		req.Role = "viewer"
	}
	if req.Role != "viewer" && req.Role != "editor" {
		writeError(w, http.StatusBadRequest, "role must be 'viewer' or 'editor'")
		return
	}

	targetUser, err := h.store.GetUserByUsername(r.Context(), req.Username)
	if err != nil {
		writeError(w, http.StatusNotFound, "user not found")
		return
	}

	if targetUser.ID == userID {
		writeError(w, http.StatusBadRequest, "you are already the owner")
		return
	}

	if err := h.store.AddProjectMember(r.Context(), projectID, targetUser.ID, req.Role); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to add member")
		return
	}

	writeJSON(w, http.StatusCreated, model.ProjectMember{
		ProjectID: projectID,
		UserID:    targetUser.ID,
		Username:  targetUser.Username,
		Role:      req.Role,
	})
}

// RemoveMember removes a user from a project (owner only).
func (h *Project) RemoveMember(w http.ResponseWriter, r *http.Request) {
	projectID, err := strconv.ParseInt(chi.URLParam(r, "projectID"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid project id")
		return
	}

	project, err := h.store.GetProject(r.Context(), projectID)
	if err != nil {
		writeError(w, http.StatusNotFound, "project not found")
		return
	}

	callerID := middleware.GetUserID(r.Context())
	if project.OwnerID != callerID {
		writeError(w, http.StatusForbidden, "only the owner can remove members")
		return
	}

	memberID, err := strconv.ParseInt(chi.URLParam(r, "userID"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	if err := h.store.RemoveProjectMember(r.Context(), projectID, memberID); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to remove member")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
