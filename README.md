# Bloom - Project Todo Manager

A beautiful, project-based todo list application with a clean interface, featuring user authentication, project organization, and deadline management.

## Features

- **User Authentication**: Username/password login system with JWT tokens and account creation
- **Beautiful Interface**: Clean, intuitive UI with sidebar navigation
- **Project Organization**: Group todos by project scope for better organization
- **Task Management**: Create, edit, and delete todos
- **Deadlines**: Set due dates and times for tasks
- **Status Tracking**: Track progress with pending, in-progress, and completed statuses
- **Filtered Views**: View all todos or filter by specific projects
- **Visual Branding**: Custom Bloom logo and green-themed design
- **Persistent Storage**: SQLite database ensures data persists across server restarts

## Tech Stack

- **Frontend**: React
- **Backend**: Node.js + Express
- **Database**: SQLite (better-sqlite3) for persistent storage
- **Authentication**: JWT (jsonwebtoken) + bcrypt
- **Deployment**: Railway (backend) + GitHub Pages (frontend)

## Installation

1. Install root dependencies:
```bash
npm install
```

2. Install server dependencies:
```bash
cd server
npm install
cd ..
```

3. Install client dependencies:
```bash
cd client
npm install
cd ..
```

Or use the convenience script:
```bash
npm run install-all
```

## Running the Application

### Development Mode (Both servers)
```bash
npm run dev
```

This will start:
- Backend server on http://localhost:5001
- Frontend React app on http://localhost:3001

### Individual Servers

Backend only:
```bash
npm run server
```

Frontend only:
```bash
npm run client
```

## Getting Started

You can either:
1. **Create a new account** directly from the login page (no admin access needed)
2. **Use demo accounts** that are pre-created:
   - Username: `admin` / Password: `password123`
   - Username: `demo` / Password: `password123`

Two demo projects are automatically created: "Personal" and "Work"

## Deployment

Ready to deploy to production? See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions on deploying:
- **Backend** to Railway (free tier with persistent SQLite database)
- **Frontend** to GitHub Pages (free static hosting)

Your data will persist across server restarts and be accessible from anywhere!

## Project Structure

```
todo-list/
├── server/
│   ├── server.js           # Express server and API routes
│   ├── database.js         # In-memory database
│   └── package.json
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Login.js
│   │   │   ├── Dashboard.js
│   │   │   ├── Sidebar.js
│   │   │   ├── TodoList.js
│   │   │   └── TodoModal.js
│   │   ├── App.js
│   │   └── App.css
│   └── package.json
└── package.json
```

## API Endpoints

### Authentication
- `POST /api/register` - Create new user account
- `POST /api/login` - Login and receive JWT token

### Users
- `GET /api/users` - Get all users (authenticated)

### Projects
- `GET /api/projects` - Get all projects (authenticated)
- `GET /api/projects/:id` - Get specific project (authenticated)
- `POST /api/projects` - Create new project
- `PUT /api/projects/:id` - Update existing project
- `DELETE /api/projects/:id` - Delete project

### Todos
- `GET /api/todos` - Get all todos (authenticated)
- `GET /api/todos/project/:projectId` - Get todos by project
- `POST /api/todos` - Create new todo
- `PUT /api/todos/:id` - Update existing todo
- `DELETE /api/todos/:id` - Delete todo

## Security Notes

- Passwords are hashed using bcrypt
- JWT tokens expire after 24 hours
- JWT_SECRET should be changed in production (in server/server.js)
- This is a demo application - additional security measures needed for production use
