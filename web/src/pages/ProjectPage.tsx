import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { Project, Todo } from '@/types';
import {
  Plus,
  Trash2,
  Edit3,
  Users,
  ArrowLeft,
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import ProjectModal from '@/components/ProjectModal';
import ShareProjectModal from '@/components/ShareProjectModal';
import TodoModal from '@/components/TodoModal';

const statusIcons = {
  pending: Circle,
  in_progress: Clock,
  completed: CheckCircle2,
};

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
};

const priorityColors: Record<string, string> = {
  low: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950',
  medium: 'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-950',
  high: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950',
};

export default function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showEdit, setShowEdit] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showTodoCreate, setShowTodoCreate] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [filter, setFilter] = useState<string>('all');

  const pid = Number(projectId);

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ['project', pid],
    queryFn: () => api.getProject(pid),
    enabled: !!pid,
  });

  const { data: roleData } = useQuery<{ role: string }>({
    queryKey: ['project-role', pid],
    queryFn: () => api.getProjectRole(pid),
    enabled: !!pid,
  });

  const { data: todos = [], isLoading: todosLoading } = useQuery<Todo[]>({
    queryKey: ['todos', pid],
    queryFn: () => api.listTodos(pid),
    enabled: !!pid,
  });

  const updateProject = useMutation({
    mutationFn: (data: { name: string; description: string }) =>
      api.updateProject(pid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', pid] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setShowEdit(false);
    },
  });

  const deleteProject = useMutation({
    mutationFn: () => api.deleteProject(pid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      navigate('/');
    },
  });

  const createTodo = useMutation({
    mutationFn: (data: Partial<Todo>) => api.createTodo(pid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos', pid] });
      setShowTodoCreate(false);
    },
  });

  const updateTodo = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Todo> }) =>
      api.updateTodo(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos', pid] });
      setEditingTodo(null);
    },
  });

  const deleteTodo = useMutation({
    mutationFn: (id: number) => api.deleteTodo(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todos', pid] }),
  });

  const toggleStatus = (todo: Todo) => {
    const next =
      todo.status === 'pending'
        ? 'in_progress'
        : todo.status === 'in_progress'
          ? 'completed'
          : 'pending';
    updateTodo.mutate({ id: todo.id, data: { status: next } });
  };

  if (projectLoading || todosLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-bloom-500 border-t-transparent" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-4 text-gray-500">Project not found</p>
      </div>
    );
  }

  const role = roleData?.role ?? '';
  const isOwner = role === 'owner';
  const canEdit = role === 'owner' || role === 'editor';
  const filteredTodos =
    filter === 'all' ? todos : todos.filter((t) => t.status === filter);
  const counts = {
    all: todos.length,
    pending: todos.filter((t) => t.status === 'pending').length,
    in_progress: todos.filter((t) => t.status === 'in_progress').length,
    completed: todos.filter((t) => t.status === 'completed').length,
  };

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/')}
          className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {project.name}
            </h1>
            {project.description && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {project.description}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-400">
              Owned by {project.owner_name}
            </p>
          </div>
          {isOwner && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowShare(true)}
                className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <Users size={14} />
                Share
              </button>
              <button
                onClick={() => setShowEdit(true)}
                className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <Edit3 size={14} />
                Edit
              </button>
              <button
                onClick={() => {
                  if (confirm('Delete this project and all its todos?')) {
                    deleteProject.mutate();
                  }
                }}
                className="flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filters & Actions */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-1 rounded-lg border border-gray-200 p-1 dark:border-gray-700">
          {(['all', 'pending', 'in_progress', 'completed'] as const).map(
            (s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  filter === s
                    ? 'bg-bloom-600 text-white'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                }`}
              >
                {s === 'all' ? 'All' : statusLabels[s]} ({counts[s]})
              </button>
            )
          )}
        </div>

        {canEdit && (
          <button
            onClick={() => setShowTodoCreate(true)}
            className="flex items-center gap-1.5 rounded-lg bg-bloom-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-bloom-700 transition-colors"
          >
            <Plus size={16} />
            Add Todo
          </button>
        )}
      </div>

      {/* Todo List */}
      {filteredTodos.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {todos.length === 0
              ? 'No todos yet. Create your first one!'
              : 'No todos match the selected filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTodos.map((todo) => {
            const StatusIcon = statusIcons[todo.status];
            return (
              <div
                key={todo.id}
                className={`group flex items-center gap-3 rounded-lg border bg-white p-4 transition-all dark:bg-gray-900 ${
                  todo.status === 'completed'
                    ? 'border-gray-100 dark:border-gray-800'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <button
                  onClick={() => canEdit && toggleStatus(todo)}
                  disabled={!canEdit}
                  className={`shrink-0 transition-colors ${
                    todo.status === 'completed'
                      ? 'text-green-500'
                      : todo.status === 'in_progress'
                        ? 'text-bloom-500'
                        : 'text-gray-300 hover:text-bloom-400 dark:text-gray-600'
                  } ${!canEdit ? 'cursor-default' : ''}`}
                >
                  <StatusIcon size={20} />
                </button>

                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-medium ${
                      todo.status === 'completed'
                        ? 'text-gray-400 line-through dark:text-gray-500'
                        : 'text-gray-900 dark:text-white'
                    }`}
                  >
                    {todo.title}
                  </p>
                  {todo.description && (
                    <p className="mt-0.5 text-xs text-gray-500 line-clamp-1 dark:text-gray-400">
                      {todo.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {todo.deadline && (
                    <span className="text-xs text-gray-400">
                      {new Date(todo.deadline).toLocaleDateString()}
                    </span>
                  )}
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${priorityColors[todo.priority]}`}
                  >
                    {todo.priority}
                  </span>
                  {canEdit && (
                    <div className="hidden items-center gap-1 group-hover:flex">
                      <button
                        onClick={() => setEditingTodo(todo)}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => deleteTodo.mutate(todo.id)}
                        className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {showEdit && project && (
        <ProjectModal
          onClose={() => setShowEdit(false)}
          onSubmit={(data) => updateProject.mutate(data)}
          isLoading={updateProject.isPending}
          initial={{ name: project.name, description: project.description }}
        />
      )}

      {showShare && (
        <ShareProjectModal
          projectId={pid}
          onClose={() => setShowShare(false)}
        />
      )}

      {(showTodoCreate || editingTodo) && (
        <TodoModal
          onClose={() => {
            setShowTodoCreate(false);
            setEditingTodo(null);
          }}
          onSubmit={(data) => {
            if (editingTodo) {
              updateTodo.mutate({ id: editingTodo.id, data });
            } else {
              createTodo.mutate(data);
            }
          }}
          isLoading={createTodo.isPending || updateTodo.isPending}
          initial={editingTodo ?? undefined}
        />
      )}
    </div>
  );
}
