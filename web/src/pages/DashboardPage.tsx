import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Plus, FolderKanban, Clock, CheckCircle2 } from 'lucide-react';
import type { Project } from '@/types';
import ProjectModal from '@/components/ProjectModal';

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: () => api.listProjects(),
  });

  const createProject = useMutation({
    mutationFn: (data: { name: string; description: string }) =>
      api.createProject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setShowCreate(false);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-bloom-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage your projects and todos
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-bloom-600 px-4 py-2 text-sm font-medium text-white hover:bg-bloom-700 transition-colors"
        >
          <Plus size={16} />
          New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-300 p-12 text-center dark:border-gray-700">
          <FolderKanban className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
            No projects yet
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Create your first project to start organizing your tasks.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-bloom-600 px-4 py-2 text-sm font-medium text-white hover:bg-bloom-700 transition-colors"
          >
            <Plus size={16} />
            Create Project
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      {showCreate && (
        <ProjectModal
          onClose={() => setShowCreate(false)}
          onSubmit={(data) => createProject.mutate(data)}
          isLoading={createProject.isPending}
        />
      )}
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      to={`/projects/${project.id}`}
      className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-bloom-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-bloom-700"
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-gray-900 group-hover:text-bloom-600 dark:text-white dark:group-hover:text-bloom-400">
            {project.name}
          </h3>
          {project.description && (
            <p className="mt-1 text-sm text-gray-500 line-clamp-2 dark:text-gray-400">
              {project.description}
            </p>
          )}
        </div>
      </div>
      <div className="mt-4 flex items-center gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <Clock size={12} />
          {new Date(project.updated_at).toLocaleDateString()}
        </span>
        <span className="flex items-center gap-1">
          <CheckCircle2 size={12} />
          {project.owner_name}
        </span>
      </div>
    </Link>
  );
}
