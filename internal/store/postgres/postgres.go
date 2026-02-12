package postgres

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/walidabualafia/bloom/internal/model"
	"github.com/walidabualafia/bloom/internal/store"

	_ "github.com/lib/pq"
)

const migrationSQL = `
CREATE TABLE IF NOT EXISTS users (
	id BIGSERIAL PRIMARY KEY,
	username VARCHAR(255) UNIQUE NOT NULL,
	email VARCHAR(255) UNIQUE NOT NULL,
	password VARCHAR(255) NOT NULL,
	is_admin BOOLEAN DEFAULT FALSE,
	created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
	id BIGSERIAL PRIMARY KEY,
	name VARCHAR(255) NOT NULL,
	description TEXT DEFAULT '',
	owner_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS todos (
	id BIGSERIAL PRIMARY KEY,
	project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
	title VARCHAR(255) NOT NULL,
	description TEXT DEFAULT '',
	status VARCHAR(50) DEFAULT 'pending',
	priority VARCHAR(50) DEFAULT 'medium',
	deadline TIMESTAMP WITH TIME ZONE,
	created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_members (
	project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
	user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	role VARCHAR(50) DEFAULT 'viewer',
	PRIMARY KEY (project_id, user_id)
);
`

// scannable abstracts *sql.Row and *sql.Rows for reuse in scan helpers.
type scannable interface {
	Scan(dest ...any) error
}

// Store implements store.Store backed by PostgreSQL.
type Store struct {
	db *sql.DB
}

// Compile-time check that Store implements store.Store.
var _ store.Store = (*Store)(nil)

// New opens a PostgreSQL connection with the given DSN and returns a Store.
func New(dsn string) (*Store, error) {
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("open postgres: %w", err)
	}
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("ping postgres: %w", err)
	}
	return &Store{db: db}, nil
}

func (s *Store) Migrate(_ context.Context) error {
	_, err := s.db.Exec(migrationSQL)
	return err
}

func (s *Store) Close() error {
	return s.db.Close()
}

// ── Scan helpers ─────────────────────────────────────────────────────────────

func scanUser(row scannable) (*model.User, error) {
	var u model.User
	err := row.Scan(&u.ID, &u.Username, &u.Email, &u.Password, &u.IsAdmin, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func scanProject(row scannable) (*model.Project, error) {
	var p model.Project
	var ownerName sql.NullString
	err := row.Scan(&p.ID, &p.Name, &p.Description, &p.OwnerID, &ownerName, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return nil, err
	}
	p.OwnerName = ownerName.String
	return &p, nil
}

func scanTodo(row scannable) (*model.Todo, error) {
	var t model.Todo
	err := row.Scan(&t.ID, &t.ProjectID, &t.Title, &t.Description, &t.Status, &t.Priority, &t.Deadline, &t.CreatedAt, &t.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

// ── Users ────────────────────────────────────────────────────────────────────

func (s *Store) CreateUser(ctx context.Context, user *model.User) error {
	err := s.db.QueryRowContext(ctx,
		`INSERT INTO users (username, email, password, is_admin)
		 VALUES ($1, $2, $3, $4)
		 RETURNING id, created_at, updated_at`,
		user.Username, user.Email, user.Password, user.IsAdmin,
	).Scan(&user.ID, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		return fmt.Errorf("create user: %w", err)
	}
	return nil
}

func (s *Store) GetUserByID(ctx context.Context, id int64) (*model.User, error) {
	row := s.db.QueryRowContext(ctx,
		`SELECT id, username, email, password, is_admin, created_at, updated_at
		 FROM users WHERE id = $1`, id)
	return scanUser(row)
}

func (s *Store) GetUserByUsername(ctx context.Context, username string) (*model.User, error) {
	row := s.db.QueryRowContext(ctx,
		`SELECT id, username, email, password, is_admin, created_at, updated_at
		 FROM users WHERE username = $1`, username)
	return scanUser(row)
}

func (s *Store) SearchUsers(ctx context.Context, query string, excludeID int64) ([]model.User, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT id, username, email, password, is_admin, created_at, updated_at
		 FROM users WHERE id != $1 AND (username ILIKE '%' || $2 || '%' OR email ILIKE '%' || $2 || '%')
		 ORDER BY username LIMIT 10`,
		excludeID, query,
	)
	if err != nil {
		return nil, fmt.Errorf("search users: %w", err)
	}
	defer rows.Close()

	var users []model.User
	for rows.Next() {
		u, err := scanUser(rows)
		if err != nil {
			return nil, err
		}
		users = append(users, *u)
	}
	return users, rows.Err()
}

func (s *Store) ListUsers(ctx context.Context) ([]model.User, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT id, username, email, password, is_admin, created_at, updated_at
		 FROM users ORDER BY id`)
	if err != nil {
		return nil, fmt.Errorf("list users: %w", err)
	}
	defer rows.Close()

	var users []model.User
	for rows.Next() {
		u, err := scanUser(rows)
		if err != nil {
			return nil, err
		}
		users = append(users, *u)
	}
	return users, rows.Err()
}

func (s *Store) UpdateUser(ctx context.Context, user *model.User) error {
	err := s.db.QueryRowContext(ctx,
		`UPDATE users SET username = $1, email = $2, password = $3, is_admin = $4, updated_at = NOW()
		 WHERE id = $5 RETURNING updated_at`,
		user.Username, user.Email, user.Password, user.IsAdmin, user.ID,
	).Scan(&user.UpdatedAt)
	if err != nil {
		return fmt.Errorf("update user: %w", err)
	}
	return nil
}

func (s *Store) DeleteUser(ctx context.Context, id int64) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM users WHERE id = $1`, id)
	return err
}

// ── Projects ─────────────────────────────────────────────────────────────────

func (s *Store) CreateProject(ctx context.Context, project *model.Project) error {
	err := s.db.QueryRowContext(ctx,
		`INSERT INTO projects (name, description, owner_id)
		 VALUES ($1, $2, $3)
		 RETURNING id, created_at, updated_at`,
		project.Name, project.Description, project.OwnerID,
	).Scan(&project.ID, &project.CreatedAt, &project.UpdatedAt)
	if err != nil {
		return fmt.Errorf("create project: %w", err)
	}
	return nil
}

func (s *Store) GetProject(ctx context.Context, id int64) (*model.Project, error) {
	row := s.db.QueryRowContext(ctx,
		`SELECT p.id, p.name, p.description, p.owner_id, u.username, p.created_at, p.updated_at
		 FROM projects p JOIN users u ON p.owner_id = u.id
		 WHERE p.id = $1`, id)
	return scanProject(row)
}

func (s *Store) ListProjectsByUser(ctx context.Context, userID int64) ([]model.Project, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT DISTINCT p.id, p.name, p.description, p.owner_id, u.username, p.created_at, p.updated_at
		 FROM projects p
		 JOIN users u ON p.owner_id = u.id
		 LEFT JOIN project_members pm ON p.id = pm.project_id
		 WHERE p.owner_id = $1 OR pm.user_id = $1
		 ORDER BY p.updated_at DESC`,
		userID,
	)
	if err != nil {
		return nil, fmt.Errorf("list projects: %w", err)
	}
	defer rows.Close()

	var projects []model.Project
	for rows.Next() {
		p, err := scanProject(rows)
		if err != nil {
			return nil, err
		}
		projects = append(projects, *p)
	}
	return projects, rows.Err()
}

func (s *Store) UpdateProject(ctx context.Context, project *model.Project) error {
	err := s.db.QueryRowContext(ctx,
		`UPDATE projects SET name = $1, description = $2, updated_at = NOW()
		 WHERE id = $3 RETURNING updated_at`,
		project.Name, project.Description, project.ID,
	).Scan(&project.UpdatedAt)
	if err != nil {
		return fmt.Errorf("update project: %w", err)
	}
	return nil
}

func (s *Store) DeleteProject(ctx context.Context, id int64) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM projects WHERE id = $1`, id)
	return err
}

// ── Todos ────────────────────────────────────────────────────────────────────

func (s *Store) CreateTodo(ctx context.Context, todo *model.Todo) error {
	err := s.db.QueryRowContext(ctx,
		`INSERT INTO todos (project_id, title, description, status, priority, deadline)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING id, created_at, updated_at`,
		todo.ProjectID, todo.Title, todo.Description, todo.Status, todo.Priority, todo.Deadline,
	).Scan(&todo.ID, &todo.CreatedAt, &todo.UpdatedAt)
	if err != nil {
		return fmt.Errorf("create todo: %w", err)
	}
	return nil
}

func (s *Store) GetTodo(ctx context.Context, id int64) (*model.Todo, error) {
	row := s.db.QueryRowContext(ctx,
		`SELECT id, project_id, title, description, status, priority, deadline, created_at, updated_at
		 FROM todos WHERE id = $1`, id)
	return scanTodo(row)
}

func (s *Store) ListTodosByProject(ctx context.Context, projectID int64) ([]model.Todo, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT id, project_id, title, description, status, priority, deadline, created_at, updated_at
		 FROM todos WHERE project_id = $1 ORDER BY created_at DESC`, projectID)
	if err != nil {
		return nil, fmt.Errorf("list todos: %w", err)
	}
	defer rows.Close()

	var todos []model.Todo
	for rows.Next() {
		t, err := scanTodo(rows)
		if err != nil {
			return nil, err
		}
		todos = append(todos, *t)
	}
	return todos, rows.Err()
}

func (s *Store) UpdateTodo(ctx context.Context, todo *model.Todo) error {
	err := s.db.QueryRowContext(ctx,
		`UPDATE todos SET title = $1, description = $2, status = $3, priority = $4, deadline = $5, updated_at = NOW()
		 WHERE id = $6 RETURNING updated_at`,
		todo.Title, todo.Description, todo.Status, todo.Priority, todo.Deadline, todo.ID,
	).Scan(&todo.UpdatedAt)
	if err != nil {
		return fmt.Errorf("update todo: %w", err)
	}
	return nil
}

func (s *Store) DeleteTodo(ctx context.Context, id int64) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM todos WHERE id = $1`, id)
	return err
}

// ── Project Members ──────────────────────────────────────────────────────────

func (s *Store) AddProjectMember(ctx context.Context, projectID, userID int64, role string) error {
	_, err := s.db.ExecContext(ctx,
		`INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3)
		 ON CONFLICT (project_id, user_id) DO UPDATE SET role = $3`,
		projectID, userID, role,
	)
	return err
}

func (s *Store) RemoveProjectMember(ctx context.Context, projectID, userID int64) error {
	_, err := s.db.ExecContext(ctx,
		`DELETE FROM project_members WHERE project_id = $1 AND user_id = $2`,
		projectID, userID,
	)
	return err
}

func (s *Store) ListProjectMembers(ctx context.Context, projectID int64) ([]model.ProjectMember, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT pm.project_id, pm.user_id, u.username, pm.role
		 FROM project_members pm
		 JOIN users u ON pm.user_id = u.id
		 WHERE pm.project_id = $1`, projectID)
	if err != nil {
		return nil, fmt.Errorf("list members: %w", err)
	}
	defer rows.Close()

	var members []model.ProjectMember
	for rows.Next() {
		var m model.ProjectMember
		if err := rows.Scan(&m.ProjectID, &m.UserID, &m.Username, &m.Role); err != nil {
			return nil, err
		}
		members = append(members, m)
	}
	return members, rows.Err()
}

func (s *Store) IsProjectMember(ctx context.Context, projectID, userID int64) (bool, error) {
	var exists bool
	err := s.db.QueryRowContext(ctx,
		`SELECT EXISTS(
			SELECT 1 FROM projects WHERE id = $1 AND owner_id = $2
			UNION
			SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2
		)`, projectID, userID,
	).Scan(&exists)
	if err != nil {
		return false, err
	}
	return exists, nil
}

func (s *Store) GetMemberRole(ctx context.Context, projectID, userID int64) (string, error) {
	// Check if user is the owner first.
	var ownerID int64
	err := s.db.QueryRowContext(ctx, `SELECT owner_id FROM projects WHERE id = $1`, projectID).Scan(&ownerID)
	if err != nil {
		return "", err
	}
	if ownerID == userID {
		return "owner", nil
	}

	// Check project_members table.
	var role string
	err = s.db.QueryRowContext(ctx,
		`SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2`,
		projectID, userID,
	).Scan(&role)
	if err != nil {
		return "", nil // not a member
	}
	return role, nil
}

// ── Admin ────────────────────────────────────────────────────────────────────

func (s *Store) GetStats(ctx context.Context) (*store.Stats, error) {
	stats := &store.Stats{}
	err := s.db.QueryRowContext(ctx,
		`SELECT
			(SELECT COUNT(*) FROM users),
			(SELECT COUNT(*) FROM projects),
			(SELECT COUNT(*) FROM todos),
			(SELECT COUNT(*) FROM todos WHERE status = 'completed')`,
	).Scan(&stats.TotalUsers, &stats.TotalProjects, &stats.TotalTodos, &stats.CompletedTodos)
	if err != nil {
		return nil, err
	}
	return stats, nil
}
