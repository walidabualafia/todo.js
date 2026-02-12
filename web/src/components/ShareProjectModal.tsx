import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { X, UserPlus, Trash2 } from 'lucide-react';
import type { ProjectMember, User } from '@/types';

interface ShareProjectModalProps {
  projectId: number;
  onClose: () => void;
}

export default function ShareProjectModal({
  projectId,
  onClose,
}: ShareProjectModalProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [role, setRole] = useState<'viewer' | 'editor'>('viewer');
  const [error, setError] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Search users as the user types (debounced via staleTime)
  const { data: searchResults = [] } = useQuery<User[]>({
    queryKey: ['user-search', search],
    queryFn: () => api.searchUsers(search),
    enabled: search.length >= 1 && !selectedUser,
    staleTime: 300,
  });

  const { data: members = [] } = useQuery<ProjectMember[]>({
    queryKey: ['members', projectId],
    queryFn: () => api.listMembers(projectId),
  });

  const addMember = useMutation({
    mutationFn: () => {
      if (!selectedUser) throw new Error('No user selected');
      return api.addMember(projectId, selectedUser.username, role);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', projectId] });
      setSearch('');
      setSelectedUser(null);
      setError('');
    },
    onError: (err) =>
      setError(err instanceof Error ? err.message : 'Failed to add member'),
  });

  const removeMember = useMutation({
    mutationFn: (userId: number) => api.removeMember(projectId, userId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['members', projectId] }),
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Filter out users who are already members
  const memberIds = new Set(members.map((m) => m.user_id));
  const filteredResults = searchResults.filter((u) => !memberIds.has(u.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Share Project
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
          >
            <X size={20} />
          </button>
        </div>

        {/* Add member form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addMember.mutate();
          }}
          className="mb-6 space-y-3"
        >
          {error && (
            <div className="rounded-lg bg-red-50 p-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={selectedUser ? selectedUser.username : search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSelectedUser(null);
                  setShowDropdown(true);
                  setError('');
                }}
                onFocus={() => {
                  if (!selectedUser && search.length >= 1) {
                    setShowDropdown(true);
                  }
                }}
                placeholder="Search users..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-bloom-500 focus:outline-none focus:ring-1 focus:ring-bloom-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />

              {/* Search results dropdown */}
              {showDropdown && !selectedUser && search.length >= 1 && (
                <div
                  ref={dropdownRef}
                  className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"
                >
                  {filteredResults.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                      No users found
                    </div>
                  ) : (
                    filteredResults.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          setSelectedUser(u);
                          setSearch(u.username);
                          setShowDropdown(false);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <div className="h-6 w-6 rounded-full bg-bloom-100 dark:bg-bloom-900 flex items-center justify-center shrink-0">
                          <span className="text-xs font-medium text-bloom-700 dark:text-bloom-300">
                            {u.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">
                            {u.username}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {u.email}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'viewer' | 'editor')}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-bloom-500 focus:outline-none focus:ring-1 focus:ring-bloom-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
            </select>
            <button
              type="submit"
              disabled={addMember.isPending || !selectedUser}
              className="rounded-lg bg-bloom-600 px-3 py-2 text-white hover:bg-bloom-700 disabled:opacity-50 transition-colors"
            >
              <UserPlus size={16} />
            </button>
          </div>
        </form>

        {/* Members list */}
        <div>
          <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            Members ({members.length})
          </h3>
          {members.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No members shared with yet.
            </p>
          ) : (
            <div className="space-y-2">
              {members.map((m) => (
                <div
                  key={m.user_id}
                  className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-bloom-100 dark:bg-bloom-900 flex items-center justify-center">
                      <span className="text-xs font-medium text-bloom-700 dark:text-bloom-300">
                        {m.username?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-sm text-gray-900 dark:text-white">
                      {m.username}
                    </span>
                    <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                      {m.role}
                    </span>
                  </div>
                  <button
                    onClick={() => removeMember.mutate(m.user_id)}
                    className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
