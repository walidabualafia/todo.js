package store

import (
	"context"

	"github.com/walidabualafia/bloom/internal/model"
)

// Store defines the interface for all database operations.
// Both SQLite and PostgreSQL implementations satisfy this interface.
type Store interface {
	// Users
	CreateUser(ctx context.Context, user *model.User) error
	GetUserByID(ctx context.Context, id int64) (*model.User, error)
	GetUserByUsername(ctx context.Context, username string) (*model.User, error)
	SearchUsers(ctx context.Context, query string, excludeID int64) ([]model.User, error)
	ListUsers(ctx context.Context) ([]model.User, error)
	UpdateUser(ctx context.Context, user *model.User) error
	DeleteUser(ctx context.Context, id int64) error

	// Projects
	CreateProject(ctx context.Context, project *model.Project) error
	GetProject(ctx context.Context, id int64) (*model.Project, error)
	ListProjectsByUser(ctx context.Context, userID int64) ([]model.Project, error)
	UpdateProject(ctx context.Context, project *model.Project) error
	DeleteProject(ctx context.Context, id int64) error

	// Todos
	CreateTodo(ctx context.Context, todo *model.Todo) error
	GetTodo(ctx context.Context, id int64) (*model.Todo, error)
	ListTodosByProject(ctx context.Context, projectID int64) ([]model.Todo, error)
	UpdateTodo(ctx context.Context, todo *model.Todo) error
	DeleteTodo(ctx context.Context, id int64) error

	// Project Members
	AddProjectMember(ctx context.Context, projectID, userID int64, role string) error
	RemoveProjectMember(ctx context.Context, projectID, userID int64) error
	ListProjectMembers(ctx context.Context, projectID int64) ([]model.ProjectMember, error)
	IsProjectMember(ctx context.Context, projectID, userID int64) (bool, error)
	// GetMemberRole returns the user's role in a project: "owner", "editor", "viewer",
	// or empty string if the user has no access.
	GetMemberRole(ctx context.Context, projectID, userID int64) (string, error)

	// Admin
	GetStats(ctx context.Context) (*Stats, error)

	// Lifecycle
	Migrate(ctx context.Context) error
	Close() error
}

// Stats holds system-wide statistics for the admin dashboard.
type Stats struct {
	TotalUsers    int `json:"total_users"`
	TotalProjects int `json:"total_projects"`
	TotalTodos    int `json:"total_todos"`
	CompletedTodos int `json:"completed_todos"`
}
