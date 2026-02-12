export interface User {
  id: number;
  username: string;
  email: string;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: number;
  name: string;
  description: string;
  owner_id: number;
  owner_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Todo {
  id: number;
  project_id: number;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  deadline?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  project_id: number;
  user_id: number;
  username?: string;
  role: 'viewer' | 'editor';
}

export interface Stats {
  total_users: number;
  total_projects: number;
  total_todos: number;
  completed_todos: number;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ApiError {
  error: string;
}
