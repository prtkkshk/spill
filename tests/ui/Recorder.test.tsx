import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Recorder from '@/components/Recorder';

describe('Recorder Component Tests', () => {
  const mockOnRecordingComplete = vi.fn();
  
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
    
    global.MediaRecorder = MockMediaRecorder as any;

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
    
    expect(screen.getByText(/spill thoughts/i)).toBeInTheDocument();
  });

  it('displays the microphone permission explainer on first click if not already granted', async () => {
    const { container } = render(<Recorder onRecordingComplete={mockOnRecordingComplete} />);
    
    const visualizerDiv = container.querySelector('.cursor-pointer');
    if (visualizerDiv) {
      fireEvent.click(visualizerDiv);
    }

    expect(screen.getByText('Microphone Permission')).toBeInTheDocument();
    expect(screen.getByText(/Spill transcribes and extracts/i)).toBeInTheDocument();
  });
});
