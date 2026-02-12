import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ProjectModal from './ProjectModal';

describe('ProjectModal', () => {
  it('renders with create title when no initial data', () => {
    render(
      <ProjectModal onClose={vi.fn()} onSubmit={vi.fn()} isLoading={false} />
    );
    expect(screen.getByText('New Project')).toBeInTheDocument();
    expect(screen.getByText('Create Project')).toBeInTheDocument();
  });

  it('renders with edit title when initial data provided', () => {
    render(
      <ProjectModal
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        isLoading={false}
        initial={{ name: 'Existing', description: 'Desc' }}
      />
    );
    expect(screen.getByText('Edit Project')).toBeInTheDocument();
    expect(screen.getByText('Save Changes')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Existing')).toBeInTheDocument();
  });

  it('calls onSubmit with form data', () => {
    const onSubmit = vi.fn();
    render(
      <ProjectModal onClose={vi.fn()} onSubmit={onSubmit} isLoading={false} />
    );

    fireEvent.change(screen.getByPlaceholderText('Project name'), {
      target: { value: 'My Project' },
    });
    fireEvent.change(screen.getByPlaceholderText('Optional description'), {
      target: { value: 'A description' },
    });
    fireEvent.click(screen.getByText('Create Project'));

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'My Project',
      description: 'A description',
    });
  });

  it('calls onClose when cancel is clicked', () => {
    const onClose = vi.fn();
    render(
      <ProjectModal onClose={onClose} onSubmit={vi.fn()} isLoading={false} />
    );
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('disables submit when loading', () => {
    render(
      <ProjectModal onClose={vi.fn()} onSubmit={vi.fn()} isLoading={true} />
    );
    expect(screen.getByText('Saving...')).toBeDisabled();
  });
});
