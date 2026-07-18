'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface RecorderProps {
  onRecordingComplete: (result: { success: boolean; recording: any; tasks: any[] }) => void;
}

type RecordState = 'idle' | 'explaining' | 'recording' | 'uploading' | 'parsing' | 'success' | 'error';

export default function Recorder({ onRecordingComplete }: RecorderProps) {
  const [state, setState] = useState<RecordState>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [secondsElapsed, setSecondsElapsed] = useState<number>(0);
  const [permissionState, setPermissionState] = useState<PermissionState | 'unknown'>('unknown');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingCapSeconds = 180; // 3 minutes cap

  // Check microphone permission state on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: 'microphone' as PermissionName })
        .then((result) => {
          setPermissionState(result.state);
          result.onchange = () => {
            setPermissionState(result.state);
          };
        })
        .catch(() => {
          setPermissionState('unknown');
        });
    }
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Start recording process
  const handleMicClick = async () => {
    if (state === 'recording') {
      stopRecording();
      return;
    }

    if (state === 'uploading' || state === 'parsing') {
      return; // busy
    }

    // If permission has not been granted yet, show the friendly explainer first
    if (permissionState !== 'granted') {
      setState('explaining');
    } else {
      startMediaRecorder();
    }
  };

  const startMediaRecorder = async () => {
    setState('recording');
    setErrorMessage('');
    setSecondsElapsed(0);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Feature-detect correct MIME type (Safari iOS does not support webm, fallback to mp4)
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      console.log(`Using recording MIME type: ${mimeType}`);
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all audio tracks to release the mic
        stream.getTracks().forEach((track) => track.stop());
        await uploadAudio();
      };

      mediaRecorder.start(250); // Slice data every 250ms

      // Start visible, persistent timer
      timerRef.current = setInterval(() => {
        setSecondsElapsed((prev) => {
          if (prev >= recordingCapSeconds - 1) {
            // Auto stop at cap
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
              mediaRecorderRef.current.stop();
            }
            if (timerRef.current) clearInterval(timerRef.current);
            return recordingCapSeconds;
          }
          return prev + 1;
        });
      }, 1000);

      // Set permission state to granted since we succeeded
      setPermissionState('granted');
    } catch (err: any) {
      console.error('Failed to get mic stream:', err);
      setState('error');
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionState('denied');
        setErrorMessage('Microphone access denied. Please enable mic access in your browser settings to record.');
      } else {
        setErrorMessage('Could not access microphone. Ensure it is connected and enabled.');
      }
    }
  };

  const stopRecording = () => {
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
      
      const formData = new FormData();
      formData.append('audio', audioBlob, `recording.${mimeType === 'audio/webm' ? 'webm' : 'mp4'}`);
      formData.append('duration', secondsElapsed.toString());
      formData.append('clientTime', new Date().toString());

      setState('parsing');
      
      const response = await fetch('/api/process-recording', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Server processing failed');
      }

      setState('success');
      onRecordingComplete({
        success: true,
        recording: data.recording,
        tasks: data.tasks,
      });

      // Reset back to idle after a brief showing of success
      setTimeout(() => {
        setState('idle');
        setSecondsElapsed(0);
      }, 1500);

    } catch (err: any) {
      console.error('Upload failed:', err);
      setState('error');
      setErrorMessage(err.message || 'Failed to process audio recording');
    }
  };

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 w-full max-w-md mx-auto">
      {state === 'explaining' ? (
        <div className="bg-glass-surface/85 border border-glass-border/30 backdrop-blur-xl rounded-3xl p-6 shadow-xl w-full text-center space-y-4 mb-6 transition-all duration-300">
          <h3 className="text-xl font-extrabold text-text-primary">Microphone Permission</h3>
          <p className="text-sm text-text-secondary leading-relaxed">
            FocusFlow transcribes and extracts action items from your audio brain-dump.
            We need microphone access to record your thoughts. Your audio is processed privately by Gemini.
          </p>
          <div className="flex space-x-3 pt-2">
            <button
              onClick={() => setState('idle')}
              className="flex-1 py-2.5 px-4 bg-glass-surface border border-glass-border/40 hover:bg-accent/10 rounded-xl text-text-primary text-sm font-bold transition duration-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={startMediaRecorder}
              className="flex-1 py-2.5 px-4 bg-accent hover:bg-accent-strong text-white rounded-xl text-sm font-bold transition duration-200 shadow-md shadow-accent/25 cursor-pointer"
            >
              Allow Mic
            </button>
          </div>
        </div>
      ) : null}

      {/* Visual State Indicators */}
      <div className="text-center mb-6 h-14 flex flex-col justify-center transition-colors duration-500">
        {state === 'recording' && (
          <div className="flex flex-col items-center space-y-1">
            <div className="flex items-center space-x-2">
              <span className="h-2 w-2 rounded-full bg-danger animate-ping" />
              <span className="text-xs font-bold text-danger uppercase tracking-widest">Recording</span>
            </div>
            <span className="text-2xl font-extrabold tracking-tight text-text-primary tabular-nums">
              {formatTime(secondsElapsed)}
            </span>
          </div>
        )}

        {state === 'uploading' && (
          <span className="text-xs font-extrabold text-accent animate-pulse uppercase tracking-wider">
            Uploading raw audio...
          </span>
        )}

        {state === 'parsing' && (
          <span className="text-xs font-extrabold text-accent animate-pulse uppercase tracking-wider">
            Gemini is extracting tasks...
          </span>
        )}

        {state === 'success' && (
          <span className="text-xs font-extrabold text-success uppercase tracking-wider flex items-center justify-center space-x-1.5">
            <span>✓ Tasks Parsed Successfully!</span>
          </span>
        )}

        {state === 'error' && (
          <div className="text-center max-w-sm px-4">
            <span className="text-[10px] font-extrabold text-danger uppercase tracking-wider block">Error</span>
            <span className="text-xs text-text-secondary line-clamp-2 mt-0.5">{errorMessage}</span>
          </div>
        )}

        {state === 'idle' && (
          <span className="text-xs font-medium text-text-secondary">
            Tap mic to dump your thoughts (up to 3 min)
          </span>
        )}
      </div>

      {/* Main Mic Button with Ambient Concentric Pulse (Phase 4) */}
      <div className="relative flex items-center justify-center">
        <AnimatePresence>
          {state === 'recording' && (
            <>
              <motion.div
                initial={{ scale: 0.9, opacity: 0.5 }}
                animate={{ scale: 1.4, opacity: 0 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                className="absolute h-36 w-36 rounded-full border border-danger/40 bg-danger/5 pointer-events-none"
              />
              <motion.div
                initial={{ scale: 0.9, opacity: 0.6 }}
                animate={{ scale: 1.7, opacity: 0 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeOut', delay: 0.5 }}
                className="absolute h-36 w-36 rounded-full border border-danger/35 bg-danger/5 pointer-events-none"
              />
            </>
          )}
        </AnimatePresence>

        <motion.div
          animate={state === 'idle' ? {
            scale: [1, 1.03, 1],
            transition: { duration: 3, repeat: Infinity, ease: "easeInOut" }
          } : {}}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          className="relative z-10"
        >
          <button
            onClick={handleMicClick}
            disabled={state === 'uploading' || state === 'parsing' || state === 'success'}
            className={`h-36 w-36 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-accent/30 ${
              state === 'recording'
                ? 'bg-gradient-to-tr from-danger to-danger/80 shadow-[0_0_30px_rgba(225,79,90,0.45)] scale-110'
                : 'bg-gradient-to-tr from-accent to-accent-strong shadow-[0_0_25px_rgba(124,108,255,0.25)] hover:shadow-accent/40'
            } disabled:opacity-40 disabled:scale-100 disabled:shadow-none cursor-pointer border-4 border-glass-border/30 backdrop-blur-md`}
            aria-label={state === 'recording' ? 'Stop recording' : 'Start recording'}
          >
            {state === 'recording' ? (
              // Stop icon (square)
              <div className="h-7 w-7 bg-white rounded-md animate-pulse" />
            ) : state === 'uploading' || state === 'parsing' ? (
              // Spinner
              <div className="h-8 w-8 rounded-full border-4 border-t-white border-white/20 animate-spin" />
            ) : (
              // Mic icon
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-14 w-14 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.75}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
            )}
          </button>
        </motion.div>
      </div>

      {/* Back to normal link if error */}
      {state === 'error' && (
        <button
          onClick={() => setState('idle')}
          className="mt-5 text-xs text-accent hover:underline hover:text-accent-strong font-bold transition cursor-pointer"
        >
          Reset Recorder
        </button>
      )}
    </div>
  );
}
