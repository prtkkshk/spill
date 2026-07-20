'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Audio3DVisualizer from './Audio3DVisualizer';
import { soundEngine } from '@/lib/audio-effects';
import { triggerHaptic } from '@/lib/haptics';
import { queueOfflineRecording, flushOfflineQueue } from '@/lib/offline-queue';

interface RecorderProps {
  onRecordingComplete: (result: { success: boolean; recording: any; tasks: any[] }) => void;
  onErrorToast?: (title: string, message?: string) => void;
  sessionToken?: string | null;
}

type RecordState = 'idle' | 'explaining' | 'recording' | 'uploading' | 'parsing' | 'success' | 'error';

export default function Recorder({ onRecordingComplete, onErrorToast, sessionToken }: RecorderProps) {
  const [state, setState] = useState<RecordState>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [secondsElapsed, setSecondsElapsed] = useState<number>(0);
  const [permissionState, setPermissionState] = useState<PermissionState | 'unknown'>('unknown');
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingCapSeconds = 180; // 3 minutes cap

  // Check microphone permission state and online status on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOfflineMode(!navigator.onLine);

      const handleOnline = () => {
        setIsOfflineMode(false);
        // Flush offline queue when connection restored
        flushOfflineQueue(async (item) => {
          const formData = new FormData();
          formData.append('audio', item.blob, `offline_recording.webm`);
          formData.append('duration', item.durationSeconds.toString());
          formData.append('clientTime', item.clientTime);

          const res = await fetch('/api/process-recording', {
            method: 'POST',
            body: formData,
          });
          const data = await res.json();
          if (res.ok && data.success) {
            onRecordingComplete({ success: true, recording: data.recording, tasks: data.tasks });
            return true;
          }
          return false;
        });
      };

      const handleOffline = () => setIsOfflineMode(true);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      if (navigator.permissions && navigator.permissions.query) {
        navigator.permissions
          .query({ name: 'microphone' as PermissionName })
          .then((result) => {
            setPermissionState(result.state);
            result.onchange = () => setPermissionState(result.state);
          })
          .catch(() => setPermissionState('unknown'));
      }

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, [onRecordingComplete]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleMicClick = async () => {
    if (state === 'recording') {
      stopRecording();
      return;
    }

    if (state === 'uploading' || state === 'parsing') {
      return;
    }

    if (permissionState !== 'granted') {
      setState('explaining');
    } else {
      startMediaRecorder();
    }
  };

  const startMediaRecorder = async () => {
    triggerHaptic([30, 50, 30]);
    soundEngine.playStartBeep();

    setState('recording');
    setErrorMessage('');
    setSecondsElapsed(0);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioStream(stream);

      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setAudioStream(null);
        await uploadAudio();
      };

      mediaRecorder.start(250);

      timerRef.current = setInterval(() => {
        setSecondsElapsed((prev) => {
          if (prev >= recordingCapSeconds - 1) {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
              mediaRecorderRef.current.stop();
            }
            if (timerRef.current) clearInterval(timerRef.current);
            return recordingCapSeconds;
          }
          return prev + 1;
        });
      }, 1000);

      setPermissionState('granted');
    } catch (err: any) {
      console.error('Failed to get mic stream:', err);
      setState('error');
      const msg = err.name === 'NotAllowedError'
        ? 'Microphone access denied. Please enable mic access in your browser.'
        : 'Could not access microphone.';
      setErrorMessage(msg);
      if (onErrorToast) onErrorToast('Microphone Error', msg);
    }
  };

  const stopRecording = () => {
    triggerHaptic(25);
    soundEngine.playStopBeep();

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const uploadAudio = async () => {
    setState('uploading');
    try {
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

      // Check if offline
      if (!navigator.onLine) {
        await queueOfflineRecording(audioBlob, secondsElapsed, new Date().toString());
        setState('success');
        if (onErrorToast) {
          onErrorToast('Offline Queue', 'Recording cached locally! Will auto-process when online.');
        }
        setTimeout(() => {
          setState('idle');
          setSecondsElapsed(0);
        }, 2000);
        return;
      }

      const formData = new FormData();
      formData.append('audio', audioBlob, `recording.${mimeType === 'audio/webm' ? 'webm' : 'mp4'}`);
      formData.append('duration', secondsElapsed.toString());
      formData.append('clientTime', new Date().toString());

      setState('parsing');

      const headers: Record<string, string> = {};
      if (sessionToken) {
        headers['Authorization'] = `Bearer ${sessionToken}`;
      }

      const response = await fetch('/api/process-recording', {
        method: 'POST',
        headers,
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Server processing failed');
      }

      soundEngine.playCheckoffChime();
      setState('success');
      onRecordingComplete({
        success: true,
        recording: data.recording,
        tasks: data.tasks,
      });

      setTimeout(() => {
        setState('idle');
        setSecondsElapsed(0);
      }, 1500);
    } catch (err: any) {
      console.error('Upload failed:', err);
      setState('error');
      const msg = err.message || 'Failed to process audio recording';
      setErrorMessage(msg);
      if (onErrorToast) onErrorToast('Processing Error', msg);
    }
  };

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center justify-center p-2 w-full max-w-md mx-auto relative">
      {isOfflineMode && (
        <div className="mb-4 px-3 py-1 bg-warning/20 border border-amber-500/40 rounded-full text-[10px] micro-label text-amber-400 flex items-center space-x-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span>Offline Mode — Recordings will auto-sync when online</span>
        </div>
      )}

      {state === 'explaining' ? (
        <div className="glass-panel glass-panel-specular rounded-3xl p-6 shadow-2xl w-full text-center space-y-4 mb-6 transition-all duration-300 z-20">
          <h3 className="text-lg font-bold text-text-primary">Microphone Permission</h3>
          <p className="text-xs text-text-secondary leading-relaxed">
            Spill transcribes and extracts action items from your audio brain-dump using AI.
            Audio is processed securely and privately.
          </p>
          <div className="flex space-x-3 pt-2">
            <button
              onClick={() => setState('idle')}
              className="flex-1 py-2.5 px-4 bg-glass-surface border border-glass-border/40 hover:bg-white/10 rounded-xl text-text-primary text-xs font-bold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={startMediaRecorder}
              className="flex-1 py-2.5 px-4 bg-accent hover:bg-accent-strong text-white rounded-xl text-xs font-bold transition shadow-md shadow-accent/25 cursor-pointer"
            >
              Allow Mic
            </button>
          </div>
        </div>
      ) : null}

      {/* Visual State Indicators */}
      <div className="text-center mb-2 h-14 flex flex-col justify-center transition-colors duration-500">
        {state === 'recording' && (
          <div className="flex flex-col items-center space-y-1">
            <div className="flex items-center space-x-2">
              <span className="h-2 w-2 rounded-full bg-danger animate-ping" />
              <span className="text-xs font-bold text-danger micro-label">Recording</span>
            </div>
            <span className="text-2xl font-extrabold tracking-tight text-text-primary font-mono tabular-nums">
              {formatTime(secondsElapsed)}
            </span>
          </div>
        )}

        {state === 'uploading' && (
          <span className="text-xs font-bold text-accent animate-pulse micro-label">
            Uploading audio stream...
          </span>
        )}

        {state === 'parsing' && (
          <span className="text-xs font-bold text-neon-purple animate-pulse micro-label">
            AI Organizing your thoughts...
          </span>
        )}

        {state === 'success' && (
          <span className="text-xs font-bold text-success micro-label flex items-center justify-center space-x-1.5">
            <span>✓ Tasks Extracted Successfully!</span>
          </span>
        )}

        {state === 'error' && (
          <div className="text-center max-w-sm px-4">
            <span className="text-[10px] font-bold text-danger micro-label block">Error</span>
            <span className="text-xs text-text-secondary line-clamp-2 mt-0.5">{errorMessage}</span>
          </div>
        )}

        {state === 'idle' && (
          <span className="text-xs font-medium text-text-secondary">
            Tap 3D fluid sphere to spill thoughts (up to 3 min)
          </span>
        )}
      </div>

      {/* 3D WebGL Audio Visualizer Orb */}
      <Audio3DVisualizer
        isRecording={state === 'recording'}
        isProcessing={state === 'uploading' || state === 'parsing'}
        audioStream={audioStream}
        onClick={handleMicClick}
        disabled={state === 'uploading' || state === 'parsing' || state === 'success'}
      />

      {state === 'error' && (
        <button
          onClick={() => setState('idle')}
          className="mt-4 text-xs text-accent hover:underline font-bold transition cursor-pointer micro-label"
        >
          Reset Recorder
        </button>
      )}
    </div>
  );
}
