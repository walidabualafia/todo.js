package sqlite

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/walidabualafia/bloom/internal/model"
	"github.com/walidabualafia/bloom/internal/store"

	_ "modernc.org/sqlite"
)

const migrationSQL = `
CREATE TABLE IF NOT EXISTS users (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	username TEXT UNIQUE NOT NULL,
	email TEXT UNIQUE NOT NULL,
	password TEXT NOT NULL,
	is_admin INTEGER DEFAULT 0,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	name TEXT NOT NULL,
	description TEXT DEFAULT '',
	owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS todos (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
	title TEXT NOT NULL,
	description TEXT DEFAULT '',
	status TEXT DEFAULT 'pending',
	priority TEXT DEFAULT 'medium',
	deadline TEXT,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS project_members (
	project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
	user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	role TEXT DEFAULT 'viewer',
	PRIMARY KEY (project_id, user_id)
);
`

// scannable abstracts *sql.Row and *sql.Rows for reuse in scan helpers.
type scannable interface {
	Scan(dest ...any) error
}

// Store implements store.Store backed by SQLite.
type Store struct {
	db *sql.DB
}

// Compile-time check that Store implements store.Store.
var _ store.Store = (*Store)(nil)

// New opens a SQLite database at the given path and returns a Store.
func New(dsn string) (*Store, error) {
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("open sqlite: %w", err)
	}

	// Enable WAL mode for better concurrent read/write performance.
	if _, err := db.Exec("PRAGMA journal_mode=WAL"); err != nil {
		return nil, fmt.Errorf("enable WAL mode: %w", err)
	}
	// Enable foreign key constraints.
	if _, err := db.Exec("PRAGMA foreign_keys=ON"); err != nil {
		return nil, fmt.Errorf("enable foreign keys: %w", err)
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

// ── Helpers ──────────────────────────────────────────────────────────────────

func now() string {
	return time.Now().UTC().Format(time.RFC3339)
}

func parseTime(s string) time.Time {
	t, err := time.Parse(time.RFC3339, s)
	if err != nil {
		t, _ = time.Parse("2006-01-02 15:04:05", s)
	}
	return t
}

func parseNullableTime(ns sql.NullString) *time.Time {
	if !ns.Valid {
		return nil
	}
	t := parseTime(ns.String)
	return &t
}

func timeToNullString(t *time.Time) sql.NullString {
	if t == nil {
		return sql.NullString{}
	}
	return sql.NullString{String: t.UTC().Format(time.RFC3339), Valid: true}
}

func scanUser(row scannable) (*model.User, error) {
	var u model.User
	var isAdmin int
	var createdAt, updatedAt string
	err := row.Scan(&u.ID, &u.Username, &u.Email, &u.Password, &isAdmin, &createdAt, &updatedAt)
	if err != nil {
		return nil, err
	}
	u.IsAdmin = isAdmin != 0
	u.CreatedAt = parseTime(createdAt)
	u.UpdatedAt = parseTime(updatedAt)
	return &u, nil
}

func scanProject(row scannable) (*model.Project, error) {
	var p model.Project
	var ownerName sql.NullString
	var createdAt, updatedAt string
	err := row.Scan(&p.ID, &p.Name, &p.Description, &p.OwnerID, &ownerName, &createdAt, &updatedAt)
	if err != nil {
		return nil, err
	}
	p.OwnerName = ownerName.String
	p.CreatedAt = parseTime(createdAt)
	p.UpdatedAt = parseTime(updatedAt)
	return &p, nil
}

func scanTodo(row scannable) (*model.Todo, error) {
	var t model.Todo
	var deadline sql.NullString
	var createdAt, updatedAt string
	err := row.Scan(&t.ID, &t.ProjectID, &t.Title, &t.Description, &t.Status, &t.Priority, &deadline, &createdAt, &updatedAt)
	if err != nil {
		return nil, err
	}
	t.Deadline = parseNullableTime(deadline)
	t.CreatedAt = parseTime(createdAt)
	t.UpdatedAt = parseTime(updatedAt)
	return &t, nil
}

// ── Users ────────────────────────────────────────────────────────────────────

func (s *Store) CreateUser(ctx context.Context, user *model.User) error {
	ts := now()
	result, err := s.db.ExecContext(ctx,
		`INSERT INTO users (username, email, password, is_admin, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?)`,
		user.Username, user.Email, user.Password, boolToInt(user.IsAdmin), ts, ts,
	)
	if err != nil {
		return fmt.Errorf("create user: %w", err)
	}
	id, err := result.LastInsertId()
	if err != nil {
		return fmt.Errorf("last insert id: %w", err)
	}
	user.ID = id
	user.CreatedAt = parseTime(ts)
	user.UpdatedAt = parseTime(ts)
	return nil
}

func (s *Store) GetUserByID(ctx context.Context, id int64) (*model.User, error) {
	row := s.db.QueryRowContext(ctx,
		`SELECT id, username, email, password, is_admin, created_at, updated_at
		 FROM users WHERE id = ?`, id)
	return scanUser(row)
}

func (s *Store) GetUserByUsername(ctx context.Context, username string) (*model.User, error) {
	row := s.db.QueryRowContext(ctx,
		`SELECT id, username, email, password, is_admin, created_at, updated_at
		 FROM users WHERE username = ?`, username)
	return scanUser(row)
}

func (s *Store) SearchUsers(ctx context.Context, query string, excludeID int64) ([]model.User, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT id, username, email, password, is_admin, created_at, updated_at
		 FROM users WHERE id != ? AND (username LIKE '%' || ? || '%' OR email LIKE '%' || ? || '%')
		 ORDER BY username LIMIT 10`,
		excludeID, query, query,
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
	ts := now()
	_, err := s.db.ExecContext(ctx,
		`UPDATE users SET username = ?, email = ?, password = ?, is_admin = ?, updated_at = ?
		 WHERE id = ?`,
		user.Username, user.Email, user.Password, boolToInt(user.IsAdmin), ts, user.ID,
	)
	if err != nil {
		return fmt.Errorf("update user: %w", err)
	}
	user.UpdatedAt = parseTime(ts)
	return nil
}

func (s *Store) DeleteUser(ctx context.Context, id int64) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM users WHERE id = ?`, id)
	return err
}

// ── Projects ─────────────────────────────────────────────────────────────────

func (s *Store) CreateProject(ctx context.Context, project *model.Project) error {
	ts := now()
	result, err := s.db.ExecContext(ctx,
		`INSERT INTO projects (name, description, owner_id, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?)`,
		project.Name, project.Description, project.OwnerID, ts, ts,
	)
	if err != nil {
		return fmt.Errorf("create project: %w", err)
	}
	id, err := result.LastInsertId()
	if err != nil {
		return fmt.Errorf("last insert id: %w", err)
	}
	project.ID = id
	project.CreatedAt = parseTime(ts)
	project.UpdatedAt = parseTime(ts)
	return nil
}

func (s *Store) GetProject(ctx context.Context, id int64) (*model.Project, error) {
	row := s.db.QueryRowContext(ctx,
		`SELECT p.id, p.name, p.description, p.owner_id, u.username, p.created_at, p.updated_at
		 FROM projects p JOIN users u ON p.owner_id = u.id
		 WHERE p.id = ?`, id)
	return scanProject(row)
}

func (s *Store) ListProjectsByUser(ctx context.Context, userID int64) ([]model.Project, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT DISTINCT p.id, p.name, p.description, p.owner_id, u.username, p.created_at, p.updated_at
		 FROM projects p
		 JOIN users u ON p.owner_id = u.id
		 LEFT JOIN project_members pm ON p.id = pm.project_id
		 WHERE p.owner_id = ? OR pm.user_id = ?
		 ORDER BY p.updated_at DESC`,
		userID, userID,
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
	ts := now()
	_, err := s.db.ExecContext(ctx,
		`UPDATE projects SET name = ?, description = ?, updated_at = ? WHERE id = ?`,
		project.Name, project.Description, ts, project.ID,
	)
	if err != nil {
		return fmt.Errorf("update project: %w", err)
	}
	project.UpdatedAt = parseTime(ts)
	return nil
}

func (s *Store) DeleteProject(ctx context.Context, id int64) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM projects WHERE id = ?`, id)
	return err
}

// ── Todos ────────────────────────────────────────────────────────────────────

func (s *Store) CreateTodo(ctx context.Context, todo *model.Todo) error {
	ts := now()
	dl := timeToNullString(todo.Deadline)
	result, err := s.db.ExecContext(ctx,
		`INSERT INTO todos (project_id, title, description, status, priority, deadline, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		todo.ProjectID, todo.Title, todo.Description, todo.Status, todo.Priority, dl, ts, ts,
	)
	if err != nil {
		return fmt.Errorf("create todo: %w", err)
	}
	id, err := result.LastInsertId()
	if err != nil {
		return fmt.Errorf("last insert id: %w", err)
	}
	todo.ID = id
	todo.CreatedAt = parseTime(ts)
	todo.UpdatedAt = parseTime(ts)
	return nil
}

func (s *Store) GetTodo(ctx context.Context, id int64) (*model.Todo, error) {
	row := s.db.QueryRowContext(ctx,
		`SELECT id, project_id, title, description, status, priority, deadline, created_at, updated_at
		 FROM todos WHERE id = ?`, id)
	return scanTodo(row)
}

func (s *Store) ListTodosByProject(ctx context.Context, projectID int64) ([]model.Todo, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT id, project_id, title, description, status, priority, deadline, created_at, updated_at
		 FROM todos WHERE project_id = ? ORDER BY created_at DESC`, projectID)
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
	ts := now()
	dl := timeToNullString(todo.Deadline)
	_, err := s.db.ExecContext(ctx,
		`UPDATE todos SET title = ?, description = ?, status = ?, priority = ?, deadline = ?, updated_at = ?
		 WHERE id = ?`,
		todo.Title, todo.Description, todo.Status, todo.Priority, dl, ts, todo.ID,
	)
	if err != nil {
		return fmt.Errorf("update todo: %w", err)
	}
	todo.UpdatedAt = parseTime(ts)
	return nil
}

func (s *Store) DeleteTodo(ctx context.Context, id int64) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM todos WHERE id = ?`, id)
	return err
}

// ── Project Members ──────────────────────────────────────────────────────────

func (s *Store) AddProjectMember(ctx context.Context, projectID, userID int64, role string) error {
	_, err := s.db.ExecContext(ctx,
		`INSERT OR REPLACE INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)`,
		projectID, userID, role,
	)
	return err
}

func (s *Store) RemoveProjectMember(ctx context.Context, projectID, userID int64) error {
	_, err := s.db.ExecContext(ctx,
		`DELETE FROM project_members WHERE project_id = ? AND user_id = ?`,
		projectID, userID,
	)
	return err
}

func (s *Store) ListProjectMembers(ctx context.Context, projectID int64) ([]model.ProjectMember, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT pm.project_id, pm.user_id, u.username, pm.role
		 FROM project_members pm
		 JOIN users u ON pm.user_id = u.id
		 WHERE pm.project_id = ?`, projectID)
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
	var exists int
	err := s.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM (
			SELECT 1 FROM projects WHERE id = ? AND owner_id = ?
			UNION
			SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?
		)`, projectID, userID, projectID, userID,
	).Scan(&exists)
	if err != nil {
		return false, err
	}
	return exists > 0, nil
}

func (s *Store) GetMemberRole(ctx context.Context, projectID, userID int64) (string, error) {
	// Check if user is the owner first.
	var ownerID int64
	err := s.db.QueryRowContext(ctx, `SELECT owner_id FROM projects WHERE id = ?`, projectID).Scan(&ownerID)
	if err != nil {
		return "", err
	}
	if ownerID == userID {
		return "owner", nil
	}

	// Check project_members table.
	var role string
	err = s.db.QueryRowContext(ctx,
		`SELECT role FROM project_members WHERE project_id = ? AND user_id = ?`,
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
	err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM users`).Scan(&stats.TotalUsers)
	if err != nil {
		return nil, err
	}
	err = s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM projects`).Scan(&stats.TotalProjects)
	if err != nil {
		return nil, err
	}
	err = s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM todos`).Scan(&stats.TotalTodos)
	if err != nil {
		return nil, err
	}
	err = s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM todos WHERE status = 'completed'`).Scan(&stats.CompletedTodos)
	if err != nil {
		return nil, err
	}
	return stats, nil
}

// ── Utilities ────────────────────────────────────────────────────────────────

func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}
