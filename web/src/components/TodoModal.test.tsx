import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TodoModal from './TodoModal';

describe('TodoModal', () => {
  it('renders create form', () => {
    render(
      <TodoModal onClose={vi.fn()} onSubmit={vi.fn()} isLoading={false} />
    );
    expect(screen.getByText('New Todo')).toBeInTheDocument();
    expect(screen.getByText('Create Todo')).toBeInTheDocument();
  });

  it('renders edit form with initial data', () => {
    render(
      <TodoModal
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        isLoading={false}
        initial={{
          id: 1,
          project_id: 1,
          title: 'Existing Todo',
          description: 'Details',
          status: 'in_progress',
          priority: 'high',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        }}
      />
    );
    expect(screen.getByText('Edit Todo')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Existing Todo')).toBeInTheDocument();
  });

  it('submits with correct data', () => {
    const onSubmit = vi.fn();
    render(
      <TodoModal onClose={vi.fn()} onSubmit={onSubmit} isLoading={false} />
    );

    fireEvent.change(screen.getByPlaceholderText('What needs to be done?'), {
      target: { value: 'Buy groceries' },
    });
    fireEvent.click(screen.getByText('Create Todo'));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Buy groceries',
        status: 'pending',
        priority: 'medium',
      })
    );
  });
});
