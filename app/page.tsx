'use client';

import React, { useState, useEffect } from 'react';
import Recorder from '@/components/Recorder';
import TaskList from '@/components/TaskList';
import ThemeToggle from '@/components/ThemeToggle';
import ShareButton from '@/components/ShareButton';
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
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 }
  }
};

export default function Home() {
  const [tasks, setTasks] = useState<{
    overdue: Task[];
    today: Task[];
    this_week: Task[];
    next_week: Task[];
    anytime: Task[];
    completed: Task[];
  }>({
    overdue: [],
    today: [],
    this_week: [],
    next_week: [],
    anytime: [],
    completed: [],
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [currentDateText, setCurrentDateText] = useState<string>('');
  const [isScrolled, setIsScrolled] = useState<boolean>(false);

  // Track scroll position for header blur refinement
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 15) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Update current date/time text dynamically
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const text = now.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      }) + ' • ' + now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      setCurrentDateText(text);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000 * 30);
    return () => clearInterval(interval);
  }, []);

  // Fetch tasks from /api/tasks
  const fetchTasks = async () => {
    try {
      const clientTimeParam = encodeURIComponent(new Date().toString());
      const response = await fetch(`/api/tasks?clientTime=${clientTimeParam}`);
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
          import('@/lib/push-register').then(({ subscribeUserToPush }) => {
            setTimeout(subscribeUserToPush, 1500);
          });
        })
        .catch((err) => console.error('Service Worker registration failed:', err));
    }
  }, []);

  // Document Title Badge Fallback
  useEffect(() => {
    const todayCount = tasks.today.length + tasks.overdue.length;
    if (todayCount > 0) {
      document.title = `(${todayCount}) Spill`;
    } else {
      document.title = 'Spill';
    }
  }, [tasks]);

  const [quickTaskText, setQuickTaskText] = useState('');
  const [isSubmittingQuickTask, setIsSubmittingQuickTask] = useState(false);

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTaskText.trim()) return;

    setIsSubmittingQuickTask(true);
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: quickTaskText.trim(),
          fuzzy_deadline: 'today',
          energy_level: 'low_focus',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save manual task');
      }

      setQuickTaskText('');
      handleRefresh();
    } catch (err) {
      console.error('Quick add failed:', err);
      alert('Failed to add task. Please check database connection.');
    } finally {
      setIsSubmittingQuickTask(false);
    }
  };

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleRecordingComplete = (result: { success: boolean; recording: any; tasks: any[] }) => {
    if (result.success) {
      handleRefresh();
    }
  };

  const totalPending = tasks.overdue.length + tasks.today.length + tasks.this_week.length + tasks.next_week.length + tasks.anytime.length;

  return (
    <div className="min-h-screen bg-bg-base text-text-primary flex flex-col font-sans pb-12 relative overflow-hidden transition-colors duration-500">
      {/* Dynamic Ambient Background Layer */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[70vw] h-[70vw] rounded-full bg-orb-1 opacity-[0.12] dark:opacity-[0.18] blur-[100px] sm:blur-[140px] animate-blob-drift transition-colors duration-500" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[80vw] h-[80vw] rounded-full bg-orb-2 opacity-[0.12] dark:opacity-[0.18] blur-[100px] sm:blur-[140px] animate-blob-drift-delayed transition-colors duration-500" />
        <div className="absolute inset-0 noise-overlay" />
      </div>

      {/* Header / Premium Top Nav */}
      <header className={`sticky top-0 z-50 w-full border-b backdrop-blur-xl flex items-center justify-between transition-all duration-300 ${
        isScrolled 
          ? 'px-6 py-3 bg-glass-surface border-glass-border/70 shadow-md' 
          : 'px-6 py-4 bg-glass-surface/60 border-glass-border/30 shadow-xs'
      }`}>
        <div className="flex items-center space-x-2.5">
          <span className="h-2.5 w-2.5 bg-accent rounded-full shadow-[0_0_8px_var(--accent)]" />
          <h1 className="text-xl font-bold tracking-tight text-text-primary transition-colors duration-500">Spill</h1>
        </div>
        
        <div className="flex items-center space-x-2">
          <ShareButton tasks={tasks} />
          <ThemeToggle />
          {totalPending > 0 ? (
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-accent-soft text-accent border border-accent/20 shadow-xs">
              <span className="h-1.5 w-1.5 bg-accent rounded-full" />
              <span>{totalPending} pending</span>
            </span>
          ) : (
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-success/15 text-success border border-success/20 shadow-xs">
              <span>All Clear</span>
            </span>
          )}
        </div>
      </header>

      {/* Main Layout container */}
      <motion.main
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex-1 w-full max-w-lg mx-auto flex flex-col items-center justify-start px-4 pt-6 space-y-6 relative z-10"
      >
        
        {/* Live Date/Time Display */}
        <div className="w-full text-center py-2 px-4 bg-bg-elevated/70 border border-glass-border/30 rounded-2xl backdrop-blur-md shadow-xs">
          <span className="text-xs font-semibold text-text-secondary tracking-wide">
            🗓️ {currentDateText || 'Loading current time...'}
          </span>
        </div>

        {/* Quick Stats Panel */}
        {totalPending > 0 && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="w-full grid grid-cols-4 gap-2.5"
          >
            <motion.div
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
              className="bg-bg-elevated/80 border border-glass-border/30 rounded-2xl p-3 flex flex-col items-center justify-center backdrop-blur-md shadow-xs border-t-2 border-t-danger/70 hover:bg-bg-elevated cursor-default"
            >
              <span className="text-xl font-bold tracking-tight text-text-primary tabular-nums">
                {tasks.today.length + tasks.overdue.length}
              </span>
              <span className="text-[10px] text-text-secondary uppercase font-semibold tracking-wider mt-1">
                Today
              </span>
            </motion.div>

            <motion.div
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
              className="bg-bg-elevated/80 border border-glass-border/30 rounded-2xl p-3 flex flex-col items-center justify-center backdrop-blur-md shadow-xs border-t-2 border-t-accent/70 hover:bg-bg-elevated cursor-default"
            >
              <span className="text-xl font-bold tracking-tight text-text-primary tabular-nums">
                {tasks.this_week.length}
              </span>
              <span className="text-[10px] text-text-secondary uppercase font-semibold tracking-wider mt-1">
                This Week
              </span>
            </motion.div>

            <motion.div
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
              className="bg-bg-elevated/80 border border-glass-border/30 rounded-2xl p-3 flex flex-col items-center justify-center backdrop-blur-md shadow-xs border-t-2 border-t-focus-high/70 hover:bg-bg-elevated cursor-default"
            >
              <span className="text-xl font-bold tracking-tight text-text-primary tabular-nums">
                {tasks.next_week.length}
              </span>
              <span className="text-[10px] text-text-secondary uppercase font-semibold tracking-wider mt-1">
                Next Week
              </span>
            </motion.div>

            <motion.div
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
              className="bg-bg-elevated/80 border border-glass-border/30 rounded-2xl p-3 flex flex-col items-center justify-center backdrop-blur-md shadow-xs border-t-2 border-t-text-secondary/35 hover:bg-bg-elevated cursor-default"
            >
              <span className="text-xl font-bold tracking-tight text-text-primary tabular-nums">
                {tasks.anytime.length}
              </span>
              <span className="text-[10px] text-text-secondary uppercase font-semibold tracking-wider mt-1">
                Anytime
              </span>
            </motion.div>
          </motion.div>
        )}

        {/* Voice Recorder Block */}
        <section className="w-full flex justify-center py-2">
          <Recorder onRecordingComplete={handleRecordingComplete} />
        </section>

        {/* Quick Add Inline Form */}
        <form onSubmit={handleQuickAdd} className="w-full px-0.5">
          <div className="relative flex items-center bg-bg-elevated/80 border border-glass-border/40 rounded-2xl p-1.5 focus-within:ring-2 focus-within:ring-accent/30 focus-within:border-glass-border/60 transition-all duration-300 shadow-xs">
            <input
              type="text"
              value={quickTaskText}
              onChange={(e) => setQuickTaskText(e.target.value)}
              disabled={isSubmittingQuickTask}
              placeholder="Type a quick task..."
              className="flex-1 bg-transparent px-3 py-1.5 text-sm text-text-primary placeholder-text-secondary/60 focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isSubmittingQuickTask || !quickTaskText.trim()}
              className="h-9 w-9 rounded-xl bg-accent text-white flex items-center justify-center transition-all duration-200 hover:bg-accent-strong disabled:opacity-30 cursor-pointer shadow-xs"
              aria-label="Add task manually"
            >
              {isSubmittingQuickTask ? (
                <div className="h-4 w-4 rounded-full border-2 border-t-transparent border-white animate-spin" />
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              )}
            </button>
          </div>
        </form>

        {/* Theme-aware divider */}
        <div className="w-full border-t border-glass-border/30" />

        {/* Task List Block */}
        <section className="w-full flex-1">
          {isLoading ? (
            <div className="space-y-4 p-4 animate-pulse">
              <div className="h-3.5 w-24 bg-glass-border/40 rounded-lg mb-2" />
              <div className="h-20 bg-bg-elevated/40 border border-glass-border/20 rounded-2xl" />
              <div className="h-20 bg-bg-elevated/40 border border-glass-border/20 rounded-2xl" />
            </div>
          ) : (
            <TaskList initialTasks={tasks} onRefreshNeeded={fetchTasks} />
          )}
        </section>

      </motion.main>
    </div>
  );
}
