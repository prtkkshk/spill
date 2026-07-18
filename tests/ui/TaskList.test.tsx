import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import TaskList from '@/components/TaskList';
import { Task } from '@/lib/types';

describe('TaskList Component Tests', () => {
  const mockTasks: { today: Task[]; this_week: Task[]; anytime: Task[] } = {
    today: [
      {
        id: 'task-1',
        description: 'Read a book',
        status: 'pending',
        fuzzy_deadline: 'today',
        energy_level: 'low_focus',
        context: 'library',
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
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders all groups and task cards correctly', () => {
    render(<TaskList initialTasks={mockTasks} onRefreshNeeded={mockOnRefreshNeeded} />);

    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('This Week')).toBeInTheDocument();
    expect(screen.getByText('Low-Energy / Anytime')).toBeInTheDocument();

    expect(screen.getByText('Read a book')).toBeInTheDocument();
    expect(screen.getByText('Write code')).toBeInTheDocument();
    expect(screen.getByText('Wash dishes')).toBeInTheDocument();
  });

  it('renders encouraging empty state when there are no tasks', () => {
    const emptyTasks = { today: [], this_week: [], anytime: [] };
    render(<TaskList initialTasks={emptyTasks} onRefreshNeeded={mockOnRefreshNeeded} />);

    expect(screen.getByText('No pending tasks!')).toBeInTheDocument();
    expect(screen.getByText(/You're all clear/i)).toBeInTheDocument();
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
});
