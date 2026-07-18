import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import TaskList from '@/components/TaskList';
import { Task } from '@/lib/types';

describe('TaskList Component Tests', () => {
  const mockTasks: { today: Task[]; this_week: Task[]; next_week: Task[]; anytime: Task[] } = {
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
  };

  const mockOnRefreshNeeded = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.spyOn(window, 'confirm').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
    const emptyTasks = { today: [], this_week: [], next_week: [], anytime: [] };
    render(<TaskList initialTasks={emptyTasks} onRefreshNeeded={mockOnRefreshNeeded} />);

    expect(screen.getByText("All clear, you're doing great!")).toBeInTheDocument();
    expect(screen.getByText(/No pending tasks left/i)).toBeInTheDocument();
  });

  it('performs optimistic check and calls patch on toggle complete', async () => {
    // Mock successful fetch PATCH response
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<TaskList initialTasks={mockTasks} onRefreshNeeded={mockOnRefreshNeeded} />);

    const checkboxes = screen.getAllByRole('button', { name: 'Mark task complete' });
    
    // Tap the first checkbox ("Read a book" in "today")
    fireEvent.click(checkboxes[0]);

    // Check that network PATCH is triggered
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/tasks', expect.any(Object));
    });

    // Check that task is removed from UI after delay
    await waitFor(() => {
      expect(screen.queryByText('Read a book')).not.toBeInTheDocument();
    });

    expect(mockOnRefreshNeeded).toHaveBeenCalled();
  });

  it('rolls back optimistic check on network failure', async () => {
    // Mock failed fetch PATCH response
    global.fetch = vi.fn().mockRejectedValue(new Error('Network disconnected'));

    render(<TaskList initialTasks={mockTasks} onRefreshNeeded={mockOnRefreshNeeded} />);

    const checkboxes = screen.getAllByRole('button', { name: 'Mark task complete' });
    
    // Tap the first checkbox
    fireEvent.click(checkboxes[0]);

    // Check that fetch was called
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    // Task should rollback and still be visible
    await waitFor(() => {
      expect(screen.getByText('Read a book')).toBeInTheDocument();
    });

    expect(window.alert).toHaveBeenCalled();
    expect(mockOnRefreshNeeded).not.toHaveBeenCalled();
  });

  it('allows inline editing and patches update to server', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<TaskList initialTasks={mockTasks} onRefreshNeeded={mockOnRefreshNeeded} />);

    // Click the edit button for first task (Read a book)
    const editButtons = screen.getAllByRole('button', { name: 'Edit task' });
    fireEvent.click(editButtons[0]);

    // Check textarea is rendered with original value
    const textarea = screen.getByPlaceholderText('Task description...');
    expect(textarea).toHaveValue('Read a book');

    // Change description text
    fireEvent.change(textarea, { target: { value: 'Read a book updated' } });

    // Click save button
    const saveButton = screen.getByRole('button', { name: 'Save' });
    fireEvent.click(saveButton);

    // Verify it updates locally and sends network request
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

    // Click the delete button for first task (Read a book)
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete task' });
    fireEvent.click(deleteButtons[0]);

    // Verify window.confirm was called
    expect(window.confirm).toHaveBeenCalled();

    // Verify it is removed and delete was triggered
    await waitFor(() => {
      expect(screen.queryByText('Read a book')).not.toBeInTheDocument();
      expect(global.fetch).toHaveBeenCalledWith('/api/tasks', expect.objectContaining({
        method: 'DELETE',
      }));
    });
  });
});
