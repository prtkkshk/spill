'use client';

import React, { useState, useEffect } from 'react';
import Recorder from '@/components/Recorder';
import TaskList from '@/components/TaskList';
import ThemeToggle from '@/components/ThemeToggle';
import { Task } from '@/lib/types';
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 }
  }
};

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
  const [isScrolled, setIsScrolled] = useState(false);

  // Scroll listener to condense header
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 12);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
      {/* Header / Premium Glassmorphic Top Nav (Phase 3) */}
      <header className={`sticky top-0 z-50 w-full border-b backdrop-blur-xl flex items-center justify-between transition-all duration-300 ${
        isScrolled 
          ? 'px-6 py-2.5 bg-glass-surface/85 border-glass-border/70 shadow-lg' 
          : 'px-6 py-4 bg-glass-surface/50 border-glass-border/30 shadow-sm'
      }`}>
        <div className="flex items-center space-x-2.5">
          <span className="h-3 w-3 bg-accent rounded-full shadow-[0_0_10px_var(--accent)] animate-pulse" />
          <h1 className="text-xl font-extrabold tracking-tight text-text-primary transition-colors duration-500">FocusFlow</h1>
        </div>
        
        {/* Simple Badge Dashboard with Theme Toggle */}
        <div className="flex items-center space-x-3">
          <ThemeToggle />
          {totalPending > 0 ? (
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-accent-soft text-accent border border-accent/20 shadow-sm transition-colors duration-500">
              <span className="h-1.5 w-1.5 bg-accent rounded-full animate-ping" />
              <span>{totalPending} pending</span>
            </span>
          ) : (
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-success/15 text-success border border-success/20 shadow-sm transition-colors duration-500">
              <span>All Clear</span>
            </span>
          )}
        </div>
      </header>

      {/* Main Layout container with fade-in slide-up (Phase 7) */}
      <motion.main
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="flex-1 w-full max-w-md mx-auto flex flex-col items-center justify-start px-4 pt-8 space-y-8 relative z-10"
      >
        
        {/* Live Date/Time Display */}
        <div className="w-full text-center py-2.5 px-4 bg-glass-surface/50 border border-glass-border/30 rounded-2xl backdrop-blur-md shadow-sm transition-all duration-300">
          <span className="text-xs font-extrabold text-text-secondary tracking-wider transition-colors duration-500">
            🗓️ {currentDateText || 'Loading current time...'}
          </span>
        </div>

        {/* Quick Stats Panel (Phase 4) */}
        {totalPending > 0 && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="w-full grid grid-cols-4 gap-3 select-none"
          >
            {/* Today */}
            <motion.div
              variants={itemVariants}
              whileHover={{ scale: 1.025 }}
              className="bg-glass-surface/60 border border-glass-border/30 rounded-2xl p-3 flex flex-col items-center justify-center backdrop-blur-md shadow-sm transition-all duration-300 border-t-2 border-t-danger/70 hover:bg-glass-surface/85 cursor-default"
            >
              <span className="text-2xl font-extrabold tracking-tight text-text-primary tabular-nums transition-colors duration-500">
                {tasks.today.length}
              </span>
              <span className="text-[9px] text-text-secondary uppercase font-extrabold tracking-wider mt-1 transition-colors duration-500">
                Today
              </span>
            </motion.div>
            {/* This Week */}
            <motion.div
              variants={itemVariants}
              whileHover={{ scale: 1.025 }}
              className="bg-glass-surface/60 border border-glass-border/30 rounded-2xl p-3 flex flex-col items-center justify-center backdrop-blur-md shadow-sm transition-all duration-300 border-t-2 border-t-accent/70 hover:bg-glass-surface/85 cursor-default"
            >
              <span className="text-2xl font-extrabold tracking-tight text-text-primary tabular-nums transition-colors duration-500">
                {tasks.this_week.length}
              </span>
              <span className="text-[9px] text-text-secondary uppercase font-extrabold tracking-wider mt-1 transition-colors duration-500">
                This Week
              </span>
            </motion.div>
            {/* Next Week */}
            <motion.div
              variants={itemVariants}
              whileHover={{ scale: 1.025 }}
              className="bg-glass-surface/60 border border-glass-border/30 rounded-2xl p-3 flex flex-col items-center justify-center backdrop-blur-md shadow-sm transition-all duration-300 border-t-2 border-t-focus-high/70 hover:bg-glass-surface/85 cursor-default"
            >
              <span className="text-2xl font-extrabold tracking-tight text-text-primary tabular-nums transition-colors duration-500">
                {tasks.next_week.length}
              </span>
              <span className="text-[9px] text-text-secondary uppercase font-extrabold tracking-wider mt-1 transition-colors duration-500">
                Next Week
              </span>
            </motion.div>
            {/* Anytime */}
            <motion.div
              variants={itemVariants}
              whileHover={{ scale: 1.025 }}
              className="bg-glass-surface/60 border border-glass-border/30 rounded-2xl p-3 flex flex-col items-center justify-center backdrop-blur-md shadow-sm transition-all duration-300 border-t-2 border-t-text-secondary/35 hover:bg-glass-surface/85 cursor-default"
            >
              <span className="text-2xl font-extrabold tracking-tight text-text-primary tabular-nums transition-colors duration-500">
                {tasks.anytime.length}
              </span>
              <span className="text-[9px] text-text-secondary uppercase font-extrabold tracking-wider mt-1 transition-colors duration-500">
                Anytime
              </span>
            </motion.div>
          </motion.div>
        )}

        {/* Voice Recorder Block (Phase 2) */}
        <section className="w-full flex justify-center py-4">
          <Recorder onRecordingComplete={handleRecordingComplete} />
        </section>

        {/* Divider / Section separator */}
        <div className="w-full border-t border-slate-800/60" />

        {/* Task List Block */}
        <section className="w-full flex-1">
          {isLoading ? (
            <div className="space-y-4 p-4 animate-pulse">
              <div className="h-3.5 w-24 bg-glass-border/40 rounded-lg mb-2" />
              <div className="h-20 bg-glass-surface/30 border border-glass-border/15 rounded-2xl" />
              <div className="h-20 bg-glass-surface/30 border border-glass-border/15 rounded-2xl" />
            </div>
          ) : (
            <TaskList initialTasks={tasks} onRefreshNeeded={fetchTasks} />
          )}
        </section>

      </motion.main>
    </div>
  );
}
