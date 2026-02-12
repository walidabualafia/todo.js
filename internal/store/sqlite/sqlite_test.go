package sqlite_test

import (
	"context"
	"testing"

	"github.com/walidabualafia/bloom/internal/model"
	"github.com/walidabualafia/bloom/internal/store/sqlite"
)

func setupTestStore(t *testing.T) *sqlite.Store {
	t.Helper()
	s, err := sqlite.New(":memory:")
	if err != nil {
		t.Fatalf("open store: %v", err)
	}
	if err := s.Migrate(context.Background()); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	t.Cleanup(func() { s.Close() })
	return s
}

func TestCreateAndGetUser(t *testing.T) {
	s := setupTestStore(t)
	ctx := context.Background()

	user := &model.User{
		Username: "alice",
		Email:    "alice@example.com",
		Password: "hashed_pw",
	}
	if err := s.CreateUser(ctx, user); err != nil {
		t.Fatalf("create user: %v", err)
	}
	if user.ID == 0 {
		t.Fatal("expected non-zero user ID")
	}

	got, err := s.GetUserByID(ctx, user.ID)
	if err != nil {
		t.Fatalf("get user by id: %v", err)
	}
	if got.Username != "alice" {
		t.Errorf("username = %q, want alice", got.Username)
	}
	if got.Email != "alice@example.com" {
		t.Errorf("email = %q, want alice@example.com", got.Email)
	}

	got2, err := s.GetUserByUsername(ctx, "alice")
	if err != nil {
		t.Fatalf("get user by username: %v", err)
	}
	if got2.ID != user.ID {
		t.Errorf("id = %d, want %d", got2.ID, user.ID)
	}
}

func TestListUsers(t *testing.T) {
	s := setupTestStore(t)
	ctx := context.Background()

	for _, name := range []string{"alice", "bob", "charlie"} {
		err := s.CreateUser(ctx, &model.User{
			Username: name,
			Email:    name + "@example.com",
			Password: "pw",
		})
		if err != nil {
			t.Fatalf("create user %s: %v", name, err)
		}
	}

	users, err := s.ListUsers(ctx)
	if err != nil {
		t.Fatalf("list users: %v", err)
	}
	if len(users) != 3 {
		t.Errorf("got %d users, want 3", len(users))
	}
}

func TestUpdateUser(t *testing.T) {
	s := setupTestStore(t)
	ctx := context.Background()

	user := &model.User{Username: "alice", Email: "alice@example.com", Password: "pw"}
	s.CreateUser(ctx, user)

	user.Username = "alice2"
	user.IsAdmin = true
	if err := s.UpdateUser(ctx, user); err != nil {
		t.Fatalf("update user: %v", err)
	}

	got, _ := s.GetUserByID(ctx, user.ID)
	if got.Username != "alice2" {
		t.Errorf("username = %q, want alice2", got.Username)
	}
	if !got.IsAdmin {
		t.Error("expected is_admin to be true")
	}
}

func TestDeleteUser(t *testing.T) {
	s := setupTestStore(t)
	ctx := context.Background()

	user := &model.User{Username: "alice", Email: "alice@example.com", Password: "pw"}
	s.CreateUser(ctx, user)

	if err := s.DeleteUser(ctx, user.ID); err != nil {
		t.Fatalf("delete user: %v", err)
	}

	_, err := s.GetUserByID(ctx, user.ID)
	if err == nil {
		t.Error("expected error getting deleted user")
	}
}

func TestProjectCRUD(t *testing.T) {
	s := setupTestStore(t)
	ctx := context.Background()

	owner := &model.User{Username: "owner", Email: "owner@example.com", Password: "pw"}
	s.CreateUser(ctx, owner)

	// Create
	project := &model.Project{
		Name:        "Test Project",
		Description: "A test project",
		OwnerID:     owner.ID,
	}
	if err := s.CreateProject(ctx, project); err != nil {
		t.Fatalf("create project: %v", err)
	}
	if project.ID == 0 {
		t.Fatal("expected non-zero project ID")
	}

	// Get
	got, err := s.GetProject(ctx, project.ID)
	if err != nil {
		t.Fatalf("get project: %v", err)
	}
	if got.Name != "Test Project" {
		t.Errorf("name = %q, want Test Project", got.Name)
	}
	if got.OwnerName != "owner" {
		t.Errorf("owner_name = %q, want owner", got.OwnerName)
	}

	// List
	projects, err := s.ListProjectsByUser(ctx, owner.ID)
	if err != nil {
		t.Fatalf("list projects: %v", err)
	}
	if len(projects) != 1 {
		t.Errorf("got %d projects, want 1", len(projects))
	}

	// Update
	project.Name = "Updated Project"
	if err := s.UpdateProject(ctx, project); err != nil {
		t.Fatalf("update project: %v", err)
	}
	got, _ = s.GetProject(ctx, project.ID)
	if got.Name != "Updated Project" {
		t.Errorf("name = %q, want Updated Project", got.Name)
	}

	// Delete
	if err := s.DeleteProject(ctx, project.ID); err != nil {
		t.Fatalf("delete project: %v", err)
	}
	_, err = s.GetProject(ctx, project.ID)
	if err == nil {
		t.Error("expected error getting deleted project")
	}
}

func TestTodoCRUD(t *testing.T) {
	s := setupTestStore(t)
	ctx := context.Background()

	owner := &model.User{Username: "owner", Email: "owner@example.com", Password: "pw"}
	s.CreateUser(ctx, owner)

	project := &model.Project{Name: "P1", OwnerID: owner.ID}
	s.CreateProject(ctx, project)

	// Create
	todo := &model.Todo{
		ProjectID:   project.ID,
		Title:       "Buy groceries",
		Description: "Milk, eggs, bread",
		Status:      model.StatusPending,
		Priority:    model.PriorityHigh,
	}
	if err := s.CreateTodo(ctx, todo); err != nil {
		t.Fatalf("create todo: %v", err)
	}
	if todo.ID == 0 {
		t.Fatal("expected non-zero todo ID")
	}

	// Get
	got, err := s.GetTodo(ctx, todo.ID)
	if err != nil {
		t.Fatalf("get todo: %v", err)
	}
	if got.Title != "Buy groceries" {
		t.Errorf("title = %q, want Buy groceries", got.Title)
	}
	if got.Priority != model.PriorityHigh {
		t.Errorf("priority = %q, want high", got.Priority)
	}

	// List
	todos, err := s.ListTodosByProject(ctx, project.ID)
	if err != nil {
		t.Fatalf("list todos: %v", err)
	}
	if len(todos) != 1 {
		t.Errorf("got %d todos, want 1", len(todos))
	}

	// Update
	todo.Status = model.StatusCompleted
	if err := s.UpdateTodo(ctx, todo); err != nil {
		t.Fatalf("update todo: %v", err)
	}
	got, _ = s.GetTodo(ctx, todo.ID)
	if got.Status != model.StatusCompleted {
		t.Errorf("status = %q, want completed", got.Status)
	}

	// Delete
	if err := s.DeleteTodo(ctx, todo.ID); err != nil {
		t.Fatalf("delete todo: %v", err)
	}
	_, err = s.GetTodo(ctx, todo.ID)
	if err == nil {
		t.Error("expected error getting deleted todo")
	}
}

func TestProjectMembers(t *testing.T) {
	s := setupTestStore(t)
	ctx := context.Background()

	owner := &model.User{Username: "owner", Email: "owner@example.com", Password: "pw"}
	s.CreateUser(ctx, owner)
	member := &model.User{Username: "member", Email: "member@example.com", Password: "pw"}
	s.CreateUser(ctx, member)
	outsider := &model.User{Username: "outsider", Email: "outsider@example.com", Password: "pw"}
	s.CreateUser(ctx, outsider)

	project := &model.Project{Name: "Shared", OwnerID: owner.ID}
	s.CreateProject(ctx, project)

	// Owner is a member by default
	isMember, err := s.IsProjectMember(ctx, project.ID, owner.ID)
	if err != nil {
		t.Fatalf("is member (owner): %v", err)
	}
	if !isMember {
		t.Error("expected owner to be a member")
	}

	// Outsider is not a member
	isMember, err = s.IsProjectMember(ctx, project.ID, outsider.ID)
	if err != nil {
		t.Fatalf("is member (outsider): %v", err)
	}
	if isMember {
		t.Error("expected outsider to not be a member")
	}

	// Add member
	if err := s.AddProjectMember(ctx, project.ID, member.ID, "editor"); err != nil {
		t.Fatalf("add member: %v", err)
	}

	isMember, err = s.IsProjectMember(ctx, project.ID, member.ID)
	if err != nil {
		t.Fatalf("is member (member): %v", err)
	}
	if !isMember {
		t.Error("expected member to be a member")
	}

	// List members
	members, err := s.ListProjectMembers(ctx, project.ID)
	if err != nil {
		t.Fatalf("list members: %v", err)
	}
	if len(members) != 1 {
		t.Errorf("got %d members, want 1", len(members))
	}
	if members[0].Role != "editor" {
		t.Errorf("role = %q, want editor", members[0].Role)
	}

	// Member can see the project in their list
	projects, err := s.ListProjectsByUser(ctx, member.ID)
	if err != nil {
		t.Fatalf("list projects: %v", err)
	}
	if len(projects) != 1 {
		t.Errorf("got %d projects for member, want 1", len(projects))
	}

	// Remove member
	if err := s.RemoveProjectMember(ctx, project.ID, member.ID); err != nil {
		t.Fatalf("remove member: %v", err)
	}
	isMember, _ = s.IsProjectMember(ctx, project.ID, member.ID)
	if isMember {
		t.Error("expected member to not be a member after removal")
	}
}

func TestGetStats(t *testing.T) {
	s := setupTestStore(t)
	ctx := context.Background()

	owner := &model.User{Username: "owner", Email: "owner@example.com", Password: "pw"}
	s.CreateUser(ctx, owner)

	project := &model.Project{Name: "P1", OwnerID: owner.ID}
	s.CreateProject(ctx, project)

	s.CreateTodo(ctx, &model.Todo{ProjectID: project.ID, Title: "T1", Status: "pending", Priority: "low"})
	s.CreateTodo(ctx, &model.Todo{ProjectID: project.ID, Title: "T2", Status: "completed", Priority: "medium"})

	stats, err := s.GetStats(ctx)
	if err != nil {
		t.Fatalf("get stats: %v", err)
	}
	if stats.TotalUsers != 1 {
		t.Errorf("total_users = %d, want 1", stats.TotalUsers)
	}
	if stats.TotalProjects != 1 {
		t.Errorf("total_projects = %d, want 1", stats.TotalProjects)
	}
	if stats.TotalTodos != 2 {
		t.Errorf("total_todos = %d, want 2", stats.TotalTodos)
	}
	if stats.CompletedTodos != 1 {
		t.Errorf("completed_todos = %d, want 1", stats.CompletedTodos)
	}
}
