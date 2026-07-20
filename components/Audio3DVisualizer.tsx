'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface Audio3DVisualizerProps {
  isRecording: boolean;
  isProcessing: boolean;
  audioStream: MediaStream | null;
  onClick: () => void;
  disabled?: boolean;
}

export default function Audio3DVisualizer({
  isRecording,
  isProcessing,
  audioStream,
  onClick,
  disabled = false,
}: Audio3DVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // Performance tier state (auto-adjust detail level for 60fps mobile execution)
  const [tier, setTier] = useState<'high' | 'mobile'>('high');

  // Setup Three.js scene, camera, mesh, particles
  useEffect(() => {
    if (!containerRef.current) return;

    // Detect mobile device for initial tiering
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
    const detailLevel = isMobile ? 3 : 5; // Icosahedron detail
    const particleCount = isMobile ? 120 : 300;
    if (isMobile) setTier('mobile');

    const width = containerRef.current.clientWidth || 220;
    const height = containerRef.current.clientHeight || 220;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 4.2;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: !isMobile,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);

    containerRef.current.appendChild(renderer.domElement);

    // 1. Create Dynamic Fluid 3D Sphere Geometry
    const geometry = new THREE.IcosahedronGeometry(1.3, detailLevel);

    // Save original position attributes for vertex displacement
    const originalPositions = geometry.attributes.position.clone();

    // Material with custom wireframe + inner glow blend
    const material = new THREE.MeshPhongMaterial({
      color: 0x6366f1,
      emissive: 0x4338ca,
      emissiveIntensity: 0.4,
      wireframe: true,
      flatShading: true,
      transparent: true,
      opacity: 0.88,
    });

    const sphereMesh = new THREE.Mesh(geometry, material);
    scene.add(sphereMesh);

    // Inner glowing core
    const coreGeometry = new THREE.SphereGeometry(0.85, 24, 24);
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0x8b5cf6,
      transparent: true,
      opacity: 0.35,
    });
    const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
    scene.add(coreMesh);

    // 2. Surround Particle Field
    const particleGeometry = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 1.6 + Math.random() * 1.2;

      particlePos[i] = r * Math.sin(phi) * Math.cos(theta);
      particlePos[i + 1] = r * Math.sin(phi) * Math.sin(theta);
      particlePos[i + 2] = r * Math.cos(phi);
    }
    particleGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(particlePos, 3)
    );

    const particleMaterial = new THREE.PointsMaterial({
      color: 0xa5b4fc,
      size: 0.04,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });
    const particleField = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particleField);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x818cf8, 2, 10);
    pointLight.position.set(2, 3, 4);
    scene.add(pointLight);

    // 3. Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const dataArray = new Uint8Array(64);

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Basic rotation
      sphereMesh.rotation.y = elapsedTime * 0.25;
      sphereMesh.rotation.x = elapsedTime * 0.15;
      particleField.rotation.y = -elapsedTime * 0.12;

      // Audio Frequency Reactivity during Recording
      let audioFreqAvg = 0;
      if (analyserRef.current) {
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        audioFreqAvg = sum / dataArray.length;
      }

      const normAudio = audioFreqAvg / 255; // 0 to 1

      // Dynamic Vertex Deformation
      const positions = geometry.attributes.position;
      const origPos = originalPositions.array;

      for (let i = 0; i < positions.count; i++) {
        const vx = origPos[i * 3];
        const vy = origPos[i * 3 + 1];
        const vz = origPos[i * 3 + 2];

        // Perlin-like noise wave displacement based on audio amplitude + time
        const wave =
          Math.sin(vx * 3 + elapsedTime * 4) *
          Math.cos(vy * 3 + elapsedTime * 4) *
          Math.sin(vz * 3 + elapsedTime * 4);

        const displacement = 1 + normAudio * 0.45 + wave * (0.08 + normAudio * 0.15);

        positions.setXYZ(i, vx * displacement, vy * displacement, vz * displacement);
      }
      positions.needsUpdate = true;

      // Color and Glow Reactivity
      if (isRecording) {
        material.color.setHex(0xef4444); // Red recording accent
        material.emissive.setHex(0xdc2626);
        material.emissiveIntensity = 0.5 + normAudio * 0.6;
        coreMaterial.color.setHex(0xf87171);
        coreMesh.scale.setScalar(1 + normAudio * 0.4);
      } else if (isProcessing) {
        material.color.setHex(0x8b5cf6); // Purple processing accent
        material.emissive.setHex(0x7c3aed);
        material.emissiveIntensity = 0.4 + Math.sin(elapsedTime * 6) * 0.25;
        coreMaterial.color.setHex(0xc084fc);
        coreMesh.scale.setScalar(1 + Math.sin(elapsedTime * 5) * 0.15);
      } else {
        material.color.setHex(0x6366f1); // Indigo default accent
        material.emissive.setHex(0x4338ca);
        material.emissiveIntensity = 0.35 + Math.sin(elapsedTime * 2) * 0.1;
        coreMaterial.color.setHex(0x8b5cf6);
        coreMesh.scale.setScalar(1 + Math.sin(elapsedTime * 2) * 0.05);
      }

      renderer.render(scene, camera);
    };

    animate();

    // Handle window resize
    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth || 220;
      const h = containerRef.current.clientHeight || 220;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      coreGeometry.dispose();
      coreMaterial.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();
      renderer.dispose();
    };
  }, [isRecording, isProcessing]);

  // Connect Audio Stream to Web Audio API Analyser
  useEffect(() => {
    if (audioStream && isRecording) {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        audioContextRef.current = ctx;

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 128;
        analyserRef.current = analyser;

        const source = ctx.createMediaStreamSource(audioStream);
        source.connect(analyser);
        sourceRef.current = source;
      } catch (e) {
        console.warn('Could not connect Web Audio API analyser:', e);
      }
    } else {
      if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      analyserRef.current = null;
    }
  }, [audioStream, isRecording]);

  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={`relative w-56 h-56 flex items-center justify-center cursor-pointer transition-transform duration-300 active:scale-95 ${
        disabled ? 'opacity-50 pointer-events-none' : 'hover:scale-105'
      }`}
    >
      <div ref={containerRef} className="w-full h-full" />
      {/* Centered Technical Micro Overlay */}
      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-full border border-white/20 flex items-center justify-center backdrop-blur-md bg-black/20 shadow-lg">
          {isRecording ? (
            <div className="w-5 h-5 bg-danger rounded-sm animate-pulse" />
          ) : isProcessing ? (
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg
              className="w-7 h-7 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}
