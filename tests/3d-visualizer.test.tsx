import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Audio3DVisualizer from '@/components/Audio3DVisualizer';
import React from 'react';

// Mock WebGL and HTMLCanvasElement for jsdom environment
if (typeof window !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation((type) => {
    if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') {
      return {
        viewport: vi.fn(),
        clearColor: vi.fn(),
        clear: vi.fn(),
        enable: vi.fn(),
        disable: vi.fn(),
        blendFunc: vi.fn(),
        createBuffer: vi.fn(),
        bindBuffer: vi.fn(),
        bufferData: vi.fn(),
        createProgram: vi.fn(),
        createShader: vi.fn(),
        shaderSource: vi.fn(),
        compileShader: vi.fn(),
        attachShader: vi.fn(),
        linkProgram: vi.fn(),
        useProgram: vi.fn(),
        getAttribLocation: vi.fn(),
        enableVertexAttribArray: vi.fn(),
        vertexAttribPointer: vi.fn(),
        drawArrays: vi.fn(),
        getExtension: vi.fn().mockReturnValue(null),
        getParameter: vi.fn().mockReturnValue(16),
      };
    }
    return null;
  }) as any;
}

describe('Audio3DVisualizer Component', () => {
  it('renders without crashing in idle state', () => {
    const handleClick = vi.fn();
    const { container } = render(
      <Audio3DVisualizer
        isRecording={false}
        isProcessing={false}
        audioStream={null}
        onClick={handleClick}
      />
    );
    expect(container).toBeTruthy();
  });

  it('renders recording state indicator', () => {
    const handleClick = vi.fn();
    const { container } = render(
      <Audio3DVisualizer
        isRecording={true}
        isProcessing={false}
        audioStream={null}
        onClick={handleClick}
      />
    );
    expect(container.querySelector('.bg-danger')).toBeTruthy();
  });
});
