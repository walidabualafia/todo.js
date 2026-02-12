import type {
  AuthResponse,
  Project,
  ProjectMember,
  Stats,
  Todo,
  User,
} from '@/types';

const API_BASE = '/api';

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(body.error || `Request failed with status ${res.status}`);
    }

    if (res.status === 204) {
      return undefined as T;
    }

    return res.json();
  }

  // Auth
  async register(username: string, email: string, password: string): Promise<AuthResponse> {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });
  }

  async login(username: string, password: string): Promise<AuthResponse> {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }

  async me(): Promise<User> {
    return this.request('/auth/me');
  }

  // Projects
  async listProjects(): Promise<Project[]> {
    return this.request('/projects');
  }

  async getProject(id: number): Promise<Project> {
    return this.request(`/projects/${id}`);
  }

  async createProject(data: { name: string; description: string }): Promise<Project> {
    return this.request('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProject(id: number, data: { name: string; description: string }): Promise<Project> {
    return this.request(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteProject(id: number): Promise<void> {
    return this.request(`/projects/${id}`, { method: 'DELETE' });
  }

  async getProjectRole(projectId: number): Promise<{ role: string }> {
    return this.request(`/projects/${projectId}/role`);
  }

  // Project Members
  async listMembers(projectId: number): Promise<ProjectMember[]> {
    return this.request(`/projects/${projectId}/members`);
  }

  async addMember(projectId: number, username: string, role: string): Promise<ProjectMember> {
    return this.request(`/projects/${projectId}/members`, {
      method: 'POST',
      body: JSON.stringify({ username, role }),
    });
  }

  async removeMember(projectId: number, userId: number): Promise<void> {
    return this.request(`/projects/${projectId}/members/${userId}`, {
      method: 'DELETE',
    });
  }

  // Todos
  async listTodos(projectId: number): Promise<Todo[]> {
    return this.request(`/projects/${projectId}/todos`);
  }

  async createTodo(projectId: number, data: Partial<Todo>): Promise<Todo> {
    return this.request(`/projects/${projectId}/todos`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTodo(id: number, data: Partial<Todo>): Promise<Todo> {
    return this.request(`/todos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTodo(id: number): Promise<void> {
    return this.request(`/todos/${id}`, { method: 'DELETE' });
  }

  // User search
  async searchUsers(query: string): Promise<User[]> {
    return this.request(`/users/search?q=${encodeURIComponent(query)}`);
  }

  // Admin
  async getStats(): Promise<Stats> {
    return this.request('/admin/stats');
  }

  async listUsers(): Promise<User[]> {
    return this.request('/admin/users');
  }

  async updateUser(id: number, data: Partial<User>): Promise<User> {
    return this.request(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteUser(id: number): Promise<void> {
    return this.request(`/admin/users/${id}`, { method: 'DELETE' });
  }
}

export const api = new ApiClient();
