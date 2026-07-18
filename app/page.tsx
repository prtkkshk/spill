'use client';

import React, { useState, useEffect } from 'react';
import Recorder from '@/components/Recorder';
import TaskList from '@/components/TaskList';
import ThemeToggle from '@/components/ThemeToggle';
import { Task } from '@/lib/types';

export default function Home() {
  const [tasks, setTasks] = useState<{
    today: Task[];
    this_week: Task[];
    next_week: Task[];
    anytime: Task[];
  }>({
    today: [],
    this_week: [],
    next_week: [],
    anytime: [],
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [currentDateText, setCurrentDateText] = useState<string>('');

  // Live Clock Display
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const text = now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }) + ' • ' + now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      setCurrentDateText(text);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000 * 30); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Fetch tasks from /api/tasks
  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/tasks');
      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }
      const data = await response.json();
      if (data.success) {
        setTasks(data.tasks);
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [refreshKey]);

  // Register Service Worker and Push Notifications
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('Service Worker registered with scope:', reg.scope);
          // Dynamically import client push registration to avoid server-side build issues
          import('@/lib/push-register').then(({ subscribeUserToPush }) => {
            setTimeout(subscribeUserToPush, 1500);
          });
        })
        .catch((err) => console.error('Service Worker registration failed:', err));
    }
  }, []);

  // Document Title Badge Fallback
  useEffect(() => {
    const todayCount = tasks.today.length;
    if (todayCount > 0) {
      document.title = `(${todayCount}) FocusFlow`;
    } else {
      document.title = 'FocusFlow';
    }
  }, [tasks]);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleRecordingComplete = (result: { success: boolean; recording: any; tasks: any[] }) => {
    if (result.success) {
      handleRefresh();
    }
  };

  const totalPending = tasks.today.length + tasks.this_week.length + tasks.next_week.length + tasks.anytime.length;

  return (
    <div className="min-h-screen bg-bg-base text-text-primary flex flex-col font-sans select-none pb-12 relative overflow-hidden transition-colors duration-500">
      {/* Dynamic Ambient Background Layer (Phase 2) */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[70vw] h-[70vw] rounded-full bg-orb-1 opacity-[0.18] dark:opacity-[0.25] blur-[100px] sm:blur-[140px] animate-blob-drift transition-colors duration-500" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[80vw] h-[80vw] rounded-full bg-orb-2 opacity-[0.18] dark:opacity-[0.25] blur-[100px] sm:blur-[140px] animate-blob-drift-delayed transition-colors duration-500" />
        <div className="absolute inset-0 noise-overlay" />
      </div>
      {/* Header / Premium Glassmorphic Top Nav */}
      <header className="sticky top-0 z-10 w-full bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="h-4 w-4 bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
          <h1 className="text-xl font-bold tracking-tight text-slate-100">FocusFlow</h1>
        </div>
        
        {/* Simple Badge Dashboard with Theme Toggle */}
        <div className="flex items-center space-x-3">
          <ThemeToggle />
          {totalPending > 0 ? (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-600/30 text-indigo-400 border border-indigo-500/20">
              {totalPending} pending
            </span>
          ) : (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-600/30 text-emerald-400 border border-emerald-500/20">
              All Clear
            </span>
          )}
        </div>
      </header>

      {/* Main Layout container */}
      <main className="flex-1 w-full max-w-md mx-auto flex flex-col items-center justify-start px-4 pt-8 space-y-8">
        
        {/* Live Date/Time Display */}
        <div className="w-full text-center py-2.5 px-4 bg-slate-900/40 border border-slate-800/40 rounded-xl backdrop-blur-sm">
          <span className="text-xs font-semibold text-indigo-300 tracking-wider">
            🗓️ {currentDateText || 'Loading current time...'}
          </span>
        </div>

        {/* Quick Stats Panel */}
        {totalPending > 0 && (
          <div className="w-full bg-slate-900/40 border border-slate-800/50 rounded-2xl p-4 flex justify-between items-center text-center backdrop-blur-sm">
            <div className="flex-1 border-r border-slate-800">
              <span className="block text-2xl font-bold text-slate-100">{tasks.today.length}</span>
              <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Today</span>
            </div>
            <div className="flex-1 border-r border-slate-800">
              <span className="block text-2xl font-bold text-slate-100">{tasks.this_week.length}</span>
              <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">This Week</span>
            </div>
            <div className="flex-1 border-r border-slate-800">
              <span className="block text-2xl font-bold text-slate-100">{tasks.next_week.length}</span>
              <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Next Week</span>
            </div>
            <div className="flex-1">
              <span className="block text-2xl font-bold text-slate-100">{tasks.anytime.length}</span>
              <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Anytime</span>
            </div>
          </div>
        )}

        {/* Voice Recorder Block (Phase 2) */}
        <section className="w-full flex justify-center py-4">
          <Recorder onRecordingComplete={handleRecordingComplete} />
        </section>

        {/* Divider / Section separator */}
        <div className="w-full border-t border-slate-800/60" />

        {/* Task List Block (Phase 3) */}
        <section className="w-full flex-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <div className="h-8 w-8 rounded-full border-4 border-t-indigo-500 border-indigo-500/20 animate-spin" />
              <span className="text-xs text-slate-400">Loading your tasks...</span>
            </div>
          ) : (
            <TaskList initialTasks={tasks} onRefreshNeeded={fetchTasks} />
          )}
        </section>

      </main>
    </div>
  );
}
