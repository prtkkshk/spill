import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ShareButton from '@/components/ShareButton';
import { Task } from '@/lib/types';

describe('ShareButton Component Tests', () => {
  const mockTasks: { overdue: Task[]; today: Task[]; this_week: Task[]; next_week: Task[]; anytime: Task[] } = {
    overdue: [
      {
        id: '1',
        description: 'Overdue task',
        status: 'pending',
        fuzzy_deadline: 'today',
        energy_level: 'high_focus',
        context: null,
        specific_deadline: null,
        raw_transcript: '',
        recording_id: '1',
        created_at: new Date(Date.now() - 86400000).toISOString(),
        completed_at: null,
      },
    ],
    today: [
      {
        id: '2',
        description: 'Today task',
        status: 'pending',
        fuzzy_deadline: 'today',
        energy_level: 'low_focus',
        context: null,
        specific_deadline: null,
        raw_transcript: '',
        recording_id: '1',
        created_at: new Date().toISOString(),
        completed_at: null,
      },
    ],
    this_week: [],
    next_week: [],
    anytime: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders share button icon', () => {
    render(<ShareButton tasks={mockTasks} />);
    const button = screen.getByRole('button', { name: 'Share task list' });
    expect(button).toBeInTheDocument();
  });

  it('invokes navigator.share if available', async () => {
    const mockShare = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', {
      value: mockShare,
      writable: true,
      configurable: true,
    });

    render(<ShareButton tasks={mockTasks} />);
    const button = screen.getByRole('button', { name: 'Share task list' });
    fireEvent.click(button);

    expect(mockShare).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Spill Task List',
        text: expect.stringContaining('Overdue task'),
      })
    );
  });

  it('falls back to clipboard if navigator.share is unavailable', async () => {
    Object.defineProperty(navigator, 'share', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      writable: true,
      configurable: true,
    });

    render(<ShareButton tasks={mockTasks} />);
    const button = screen.getByRole('button', { name: 'Share task list' });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith(expect.stringContaining('Today task'));
      expect(screen.getByText(/Copied to clipboard!/i)).toBeInTheDocument();
    });
  });
});
