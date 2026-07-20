import '@testing-library/jest-dom';
import { vi } from 'vitest';
import React from 'react';

// Mock Web Audio API & Sound Engine
vi.mock('@/lib/audio-effects', () => ({
  soundEngine: {
    playStartBeep: vi.fn(),
    playStopBeep: vi.fn(),
    playCheckoffChime: vi.fn(),
    playMagicChime: vi.fn(),
    playSwoosh: vi.fn(),
  },
}));

vi.mock('@/lib/haptics', () => ({
  triggerHaptic: vi.fn(),
}));

// Proxy Mock for framer-motion filtering animation-only props
vi.mock('framer-motion', () => {
  const motionProxy = new Proxy(
    {},
    {
      get: (_target, prop: string) => {
        return React.forwardRef(({ children, className, style, onClick, layout, initial, animate, exit, transition, whileHover, whileTap, ...props }: any, ref: any) => {
          return React.createElement(
            prop,
            { ref, className, style, onClick, ...props },
            children
          );
        });
      },
    }
  );

  return {
    motion: motionProxy,
    AnimatePresence: ({ children }: any) => React.createElement(React.Fragment, null, children),
  };
});

// Mock Three.js for JSDOM unit tests
vi.mock('three', () => {
  return {
    Scene: class { add() {} remove() {} },
    PerspectiveCamera: class { position = { z: 0 }; aspect = 1; updateProjectionMatrix() {} },
    WebGLRenderer: class {
      domElement = document.createElement('canvas');
      setPixelRatio() {}
      setSize() {}
      render() {}
      dispose() {}
    },
    IcosahedronGeometry: class { attributes = { position: { clone: () => ({ array: new Float32Array() }) } }; dispose() {} },
    SphereGeometry: class { dispose() {} },
    BufferGeometry: class { setAttribute() {} dispose() {} },
    BufferAttribute: class {},
    MeshPhongMaterial: class { color = { setHex() {} }; emissive = { setHex() {} }; dispose() {} },
    MeshBasicMaterial: class { color = { setHex() {} }; dispose() {} },
    PointsMaterial: class { dispose() {} },
    Mesh: class { rotation = { x: 0, y: 0 }; scale = { setScalar() {} } },
    Points: class { rotation = { y: 0 } },
    AmbientLight: class {},
    PointLight: class { position = { set() {} } },
    Clock: class { getElapsedTime() { return 0; } },
    AdditiveBlending: 1,
  };
});
