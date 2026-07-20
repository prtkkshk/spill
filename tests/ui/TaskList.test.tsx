import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import TaskList from '@/components/TaskList';
import { Task } from '@/lib/types';

describe('TaskList Component Tests', () => {
  const mockTasks: { overdue: Task[]; today: Task[]; this_week: Task[]; next_week: Task[]; anytime: Task[]; completed: Task[] } = {
    overdue: [],
    today: [
      {
        id: 'task-1',
        description: 'Read a book',
        status: 'pending',
        fuzzy_deadline: 'today',
        energy_level: 'low_focus',
        context: 'library',
        specific_deadline: null,
        raw_transcript: 'some text',
        recording_id: 'rec-1',
        created_at: new Date().toISOString(),
        completed_at: null,
      },
    ],
    this_week: [
      {
        id: 'task-2',
        description: 'Write code',
        status: 'pending',
        fuzzy_deadline: 'this_week',
        energy_level: 'high_focus',
        context: 'VS Code',
        specific_deadline: null,
        raw_transcript: 'some text',
        recording_id: 'rec-1',
        created_at: new Date().toISOString(),
        completed_at: null,
      },
    ],
    next_week: [
      {
        id: 'task-next',
        description: 'Prepare slides',
        status: 'pending',
        fuzzy_deadline: 'next_week',
        energy_level: 'high_focus',
        context: 'slides',
        specific_deadline: 'Tuesday, July 21',
        raw_transcript: 'some text',
        recording_id: 'rec-1',
        created_at: new Date().toISOString(),
        completed_at: null,
      },
    ],
    anytime: [
      {
        id: 'task-3',
        description: 'Wash dishes',
        status: 'pending',
        fuzzy_deadline: 'backlog',
        energy_level: 'low_focus',
        context: 'kitchen',
        specific_deadline: null,
        raw_transcript: 'some text',
        recording_id: 'rec-1',
        created_at: new Date().toISOString(),
        completed_at: null,
      },
    ],
    completed: [],
  };

  const mockOnRefreshNeeded = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.spyOn(window, 'confirm').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('renders all groups and task cards correctly', () => {
    render(<TaskList initialTasks={mockTasks} onRefreshNeeded={mockOnRefreshNeeded} />);

    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('This Week')).toBeInTheDocument();
    expect(screen.getByText('Next Week')).toBeInTheDocument();
    expect(screen.getByText('Low-Energy / Anytime')).toBeInTheDocument();

    expect(screen.getByText('Read a book')).toBeInTheDocument();
    expect(screen.getByText('Write code')).toBeInTheDocument();
    expect(screen.getByText('Prepare slides')).toBeInTheDocument();
    expect(screen.getByText('Wash dishes')).toBeInTheDocument();
    expect(screen.getByText('🗓️ Tuesday, July 21')).toBeInTheDocument();
  });

  it('renders encouraging empty state when there are no tasks', () => {
    const emptyTasks = { overdue: [], today: [], this_week: [], next_week: [], anytime: [], completed: [] };
    render(<TaskList initialTasks={emptyTasks} onRefreshNeeded={mockOnRefreshNeeded} />);

    expect(screen.getByText("All clear, you're doing great!")).toBeInTheDocument();
  });

  it('performs optimistic check and calls patch on toggle complete', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<TaskList initialTasks={mockTasks} onRefreshNeeded={mockOnRefreshNeeded} />);

    const checkboxes = screen.getAllByRole('button', { name: 'Mark task complete' });
    fireEvent.click(checkboxes[0]);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/tasks', expect.any(Object));
    }, { timeout: 2000 });
  });

  it('allows inline editing and patches update to server', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<TaskList initialTasks={mockTasks} onRefreshNeeded={mockOnRefreshNeeded} />);

    const editButtons = screen.getAllByRole('button', { name: 'Edit task' });
    fireEvent.click(editButtons[0]);

    const textarea = screen.getByPlaceholderText('Task description...');
    expect(textarea).toHaveValue('Read a book');

    fireEvent.change(textarea, { target: { value: 'Read a book updated' } });

    const saveButton = screen.getByRole('button', { name: 'Save' });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Read a book updated')).toBeInTheDocument();
      expect(global.fetch).toHaveBeenCalledWith('/api/tasks', expect.objectContaining({
        method: 'PATCH',
      }));
    });
  });

  it('allows deleting a task and sends delete request to server', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<TaskList initialTasks={mockTasks} onRefreshNeeded={mockOnRefreshNeeded} />);

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete task' });
    fireEvent.click(deleteButtons[0]);

    expect(window.confirm).toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.queryByText('Read a book')).not.toBeInTheDocument();
      expect(global.fetch).toHaveBeenCalledWith('/api/tasks', expect.objectContaining({
        method: 'DELETE',
      }));
    });
  });

  it('renders completed tasks in collapsible completed list and handles undoing completion', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    const mockTasksWithCompleted = {
      ...mockTasks,
      completed: [
        {
          id: 'completed-1',
          description: 'A completed task description',
          status: 'completed' as const,
          fuzzy_deadline: 'today' as const,
          energy_level: 'low_focus' as const,
          context: 'home',
          specific_deadline: null,
          raw_transcript: 'some text',
          recording_id: 'rec-1',
          created_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        },
      ],
    };

    render(<TaskList initialTasks={mockTasksWithCompleted} onRefreshNeeded={mockOnRefreshNeeded} />);

    expect(screen.getByText(/Recently Completed \(1\)/i)).toBeInTheDocument();

    const expandButton = screen.getByRole('button', { name: /Recently Completed/i });
    fireEvent.click(expandButton);

    expect(screen.getByText('A completed task description')).toBeInTheDocument();

    const undoButton = screen.getByRole('button', { name: 'Mark task pending' });
    fireEvent.click(undoButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/tasks', expect.objectContaining({
        method: 'PATCH',
        body: expect.stringContaining('"status":"pending"'),
      }));
    });
  });

  it('supports bulk clearing completed tasks with confirmation', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    const mockTasksWithCompleted = {
      ...mockTasks,
      completed: [
        {
          id: 'completed-1',
          description: 'A completed task description',
          status: 'completed' as const,
          fuzzy_deadline: 'today' as const,
          energy_level: 'low_focus' as const,
          context: 'home',
          specific_deadline: null,
          raw_transcript: 'some text',
          recording_id: 'rec-1',
          created_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        },
      ],
    };

    render(<TaskList initialTasks={mockTasksWithCompleted} onRefreshNeeded={mockOnRefreshNeeded} />);

    const clearButton = screen.getByRole('button', { name: 'Clear all' });
    fireEvent.click(clearButton);

    expect(screen.getByRole('button', { name: 'Confirm Clear All?' })).toBeInTheDocument();

    fireEvent.click(clearButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/tasks', expect.objectContaining({
        method: 'DELETE',
        body: expect.stringContaining('"scope":"completed"'),
      }));
    });
  });
});
