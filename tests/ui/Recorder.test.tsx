import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Recorder from '@/components/Recorder';

describe('Recorder Component Tests', () => {
  const mockOnRecordingComplete = vi.fn();
  
  // Mock MediaRecorder
  let stopCallback: (() => void) | null = null;
  let dataCallback: ((event: any) => void) | null = null;

  class MockMediaRecorder {
    static isTypeSupported = vi.fn().mockReturnValue(true);
    state = 'inactive';
    start = vi.fn().mockImplementation(() => {
      this.state = 'recording';
    });
    stop = vi.fn().mockImplementation(() => {
      this.state = 'inactive';
      if (stopCallback) stopCallback();
    });
    
    addEventListener = vi.fn().mockImplementation((event, callback) => {
      if (event === 'stop') stopCallback = callback;
      if (event === 'dataavailable') dataCallback = callback;
    });

    set onstop(cb: () => void) {
      stopCallback = cb;
    }
    set ondataavailable(cb: (event: any) => void) {
      dataCallback = cb;
    }
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Assign mock MediaRecorder to global scope
    global.MediaRecorder = MockMediaRecorder as any;

    // Mock getUserMedia
    const mockStream = {
      getTracks: () => [
        {
          stop: vi.fn(),
        },
      ],
    };

    navigator.mediaDevices = {
      getUserMedia: vi.fn().mockResolvedValue(mockStream),
    } as any;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders initial idle state with instructions', () => {
    render(<Recorder onRecordingComplete={mockOnRecordingComplete} />);
    
    expect(screen.getByText(/Tap mic to spill your thoughts/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start recording' })).toBeInTheDocument();
  });

  it('displays the microphone permission explainer on first click if not already granted', async () => {
    render(<Recorder onRecordingComplete={mockOnRecordingComplete} />);
    
    const micButton = screen.getByRole('button', { name: 'Start recording' });
    fireEvent.click(micButton);

    // Explainer title should display
    expect(screen.getByText('Microphone Permission')).toBeInTheDocument();
    expect(screen.getByText(/Spill transcribes and extracts/i)).toBeInTheDocument();
  });

  it('starts recording and triggers live timer after permission is accepted', async () => {
    render(<Recorder onRecordingComplete={mockOnRecordingComplete} />);
    
    // 1. Click to trigger explainer
    const micButton = screen.getByRole('button', { name: 'Start recording' });
    fireEvent.click(micButton);

    // 2. Click Allow Mic
    const allowButton = screen.getByText('Allow Mic');
    await act(async () => {
      fireEvent.click(allowButton);
    });

    // Should switch to recording state
    expect(screen.getByText('Recording')).toBeInTheDocument();
    expect(screen.getByText('0:00')).toBeInTheDocument();

    // Advance timer by 5 seconds
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByText('0:05')).toBeInTheDocument();
  });
});
