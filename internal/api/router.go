package api

import (
	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"github.com/walidabualafia/bloom/internal/api/handler"
	"github.com/walidabualafia/bloom/internal/api/middleware"
	"github.com/walidabualafia/bloom/internal/store"
)

// NewRouter creates and configures the Chi router with all API routes.
func NewRouter(s store.Store, jwtSecret string) *chi.Mux {
	r := chi.NewRouter()

	// Global middleware
	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(middleware.Logger)
	r.Use(chimw.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:*", "https://*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Handlers
	auth := handler.NewAuth(s, jwtSecret)
	project := handler.NewProject(s)
	todo := handler.NewTodo(s)
	user := handler.NewUser(s)

	// Public routes
	r.Route("/api", func(r chi.Router) {
		r.Post("/auth/register", auth.Register)
		r.Post("/auth/login", auth.Login)

		// Protected routes
		r.Group(func(r chi.Router) {
			r.Use(middleware.Auth(jwtSecret))

			// Current user
			r.Get("/auth/me", auth.Me)

			// Projects
			r.Get("/projects", project.List)
			r.Post("/projects", project.Create)
			r.Get("/projects/{projectID}", project.Get)
			r.Get("/projects/{projectID}/role", project.GetRole)
			r.Put("/projects/{projectID}", project.Update)
			r.Delete("/projects/{projectID}", project.Delete)

			// Project members
			r.Get("/projects/{projectID}/members", project.ListMembers)
			r.Post("/projects/{projectID}/members", project.AddMember)
			r.Delete("/projects/{projectID}/members/{userID}", project.RemoveMember)

			// Todos (scoped to project)
			r.Get("/projects/{projectID}/todos", todo.ListByProject)
			r.Post("/projects/{projectID}/todos", todo.Create)

			// Todos (direct access)
			r.Get("/todos/{todoID}", todo.Get)
			r.Put("/todos/{todoID}", todo.Update)
			r.Delete("/todos/{todoID}", todo.Delete)

			// User search (for sharing)
			r.Get("/users/search", user.Search)

			// Admin
			r.Get("/admin/stats", user.Stats)
			r.Get("/admin/users", user.List)
			r.Put("/admin/users/{userID}", user.Update)
			r.Delete("/admin/users/{userID}", user.Delete)
		})
	})

	return r
}
