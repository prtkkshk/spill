'use client';

import React, { useState, useEffect } from 'react';
import Recorder from '@/components/Recorder';
import TaskList from '@/components/TaskList';
import ThemeToggle from '@/components/ThemeToggle';
import ShareButton from '@/components/ShareButton';
import CommandPalette from '@/components/CommandPalette';
import AuthModal from '@/components/AuthModal';
import ToastManager, { ToastMessage } from '@/components/ToastManager';
import { Task } from '@/lib/types';
import { User } from '@supabase/supabase-js';
import { motion } from 'framer-motion';
import { downloadICS } from '@/lib/calendar';

import { supabase } from '@/lib/supabase';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
  },
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

  // Modals & UI States
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'high_focus' | 'low_focus'>('all');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Listen for Supabase Auth changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setUser(null);
        setSessionToken(null);
      } else {
        setUser(session.user);
        setSessionToken(session.access_token);
      }
    });

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error || !session) {
        setUser(null);
        setSessionToken(null);
        if (error) {
          supabase.auth.signOut();
        }
      } else {
        setUser(session.user);
        setSessionToken(session.access_token);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const addToast = (type: 'info' | 'success' | 'warning' | 'error', title: string, message?: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Scroll tracking
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Live date/time display
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const text =
        now.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        }) +
        ' • ' +
        now.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
      setCurrentDateText(text);
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch tasks
  const fetchTasks = async () => {
    try {
      const clientTimeParam = encodeURIComponent(new Date().toString());
      const headers: Record<string, string> = {};
      if (sessionToken) {
        headers['Authorization'] = `Bearer ${sessionToken}`;
      }

      const response = await fetch(`/api/tasks?clientTime=${clientTimeParam}`, { headers });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server status ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        setTasks(data.tasks);
      }
    } catch (err: any) {
      console.error('Error fetching tasks:', err);
      addToast('error', 'Sync Warning', err.message || 'Could not sync tasks with server.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [refreshKey, sessionToken]);

  // Service worker registration
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('PWA Service Worker registered:', reg.scope);
        })
        .catch((err) => console.error('PWA Service Worker failed:', err));
    }
  }, []);

  // Document title badge
  useEffect(() => {
    const todayCount = tasks.today.length + tasks.overdue.length;
    document.title = todayCount > 0 ? `(${todayCount}) Spill` : 'Spill';
  }, [tasks]);

  const [quickTaskText, setQuickTaskText] = useState('');
  const [isSubmittingQuickTask, setIsSubmittingQuickTask] = useState(false);

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTaskText.trim()) return;

    setIsSubmittingQuickTask(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (sessionToken) {
        headers['Authorization'] = `Bearer ${sessionToken}`;
      }

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          description: quickTaskText.trim(),
          fuzzy_deadline: 'today',
          energy_level: 'low_focus',
        }),
      });

      if (!response.ok) throw new Error('Failed to save manual task');

      setQuickTaskText('');
      addToast('success', 'Task Added', 'Manual task saved successfully.');
      handleRefresh();
    } catch (err) {
      console.error('Quick add failed:', err);
      addToast('error', 'Save Failed', 'Check database connection.');
    } finally {
      setIsSubmittingQuickTask(false);
    }
  };

  const handleRefresh = () => setRefreshKey((prev) => prev + 1);

  const handleRecordingComplete = (result: { success: boolean; recording: any; tasks: any[] }) => {
    if (result.success) {
      addToast('success', 'Voice Brain-Dump Parsed', `${result.tasks?.length || 0} tasks extracted.`);
      handleRefresh();
    }
  };

  // Command palette action dispatcher
  const handleCommandAction = (action: string, payload?: any) => {
    if (action === 'open_command_palette') {
      setIsCommandPaletteOpen(true);
    } else if (action === 'filter_quick_win') {
      setActiveFilter('low_focus');
      addToast('info', 'Filter Applied', 'Showing Low-Focus Quick Wins');
    } else if (action === 'filter_deep_work') {
      setActiveFilter('high_focus');
      addToast('info', 'Filter Applied', 'Showing High-Focus Deep Work');
    } else if (action === 'filter_all') {
      setActiveFilter('all');
      addToast('info', 'Filter Reset', 'Showing All Pending Tasks');
    } else if (action === 'sync_calendar') {
      const allPending = [
        ...tasks.overdue,
        ...tasks.today,
        ...tasks.this_week,
        ...tasks.next_week,
        ...tasks.anytime,
      ];
      if (allPending.length > 0) {
        downloadICS(allPending[0]);
        addToast('success', 'Calendar Export', 'Downloaded task iCal file.');
      } else {
        addToast('info', 'Calendar Export', 'No pending tasks to export.');
      }
    } else if (action === 'toggle_theme') {
      const themeToggleBtn = document.getElementById('theme-toggle-btn');
      themeToggleBtn?.click();
    }
  };

  const totalPending =
    tasks.overdue.length +
    tasks.today.length +
    tasks.this_week.length +
    tasks.next_week.length +
    tasks.anytime.length;

  return (
    <div className="min-h-screen bg-bg-base text-text-primary flex flex-col font-sans pb-16 relative overflow-hidden transition-colors duration-500 pt-[env(safe-area-inset-top)]">
      {/* Toast Manager */}
      <ToastManager toasts={toasts} onDismiss={dismissToast} />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        user={user}
        onUserChange={setUser}
      />

      {/* Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onSelectAction={handleCommandAction}
      />

      {/* Dynamic Ambient Background Layer */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[75vw] h-[75vw] rounded-full bg-orb-1 opacity-[0.14] blur-[120px] animate-blob-drift transition-colors duration-500" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[85vw] h-[85vw] rounded-full bg-orb-2 opacity-[0.14] blur-[120px] animate-blob-drift-delayed transition-colors duration-500" />
        <div className="absolute inset-0 noise-overlay" />
      </div>

      {/* Header / Premium Top Nav */}
      <header
        className={`sticky top-0 z-40 w-full border-b backdrop-blur-2xl flex items-center justify-between transition-all duration-300 ${
          isScrolled
            ? 'px-6 py-3 glass-panel border-glass-border/70 shadow-lg'
            : 'px-6 py-4 glass-panel border-glass-border/30 shadow-xs'
        }`}
      >
        <div className="flex items-center space-x-3">
          <span className="h-3 w-3 bg-accent rounded-full shadow-[0_0_12px_var(--accent)] animate-pulse" />
          <h1 className="text-xl font-extrabold tracking-tight text-text-primary">Spill</h1>
          <span className="text-[10px] micro-label bg-accent-soft text-accent px-2 py-0.5 rounded-md border border-accent/20">
            PWA 3D
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Cmd + K Search trigger */}
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className="p-2 glass-panel rounded-xl text-text-secondary hover:text-text-primary transition flex items-center space-x-1.5 cursor-pointer text-xs"
            title="Command Palette (Cmd + K)"
          >
            <span>🔍</span>
            <span className="hidden sm:inline font-mono text-[10px]">Cmd+K</span>
          </button>

          <ShareButton tasks={tasks} />
          <ThemeToggle />

          {/* Auth Button */}
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="p-2 glass-panel rounded-xl text-text-secondary hover:text-accent transition cursor-pointer text-xs"
            title="Account Auth"
          >
            {user ? '👤' : '🔑'}
          </button>

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
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="flex-1 w-full max-w-lg mx-auto flex flex-col items-center justify-start px-4 pt-6 space-y-6 relative z-10"
      >
        {/* Live Date/Time Display */}
        <div className="w-full text-center py-2 px-4 glass-panel glass-panel-specular rounded-2xl backdrop-blur-md shadow-xs">
          <span className="text-xs font-semibold text-text-secondary tracking-wide font-mono">
            🗓️ {currentDateText || 'Loading live time...'}
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
              whileHover={{ scale: 1.03 }}
              className="glass-panel glass-panel-specular rounded-2xl p-3 flex flex-col items-center justify-center border-t-2 border-t-danger/70 hover:bg-bg-elevated cursor-default"
            >
              <span className="text-xl font-bold tracking-tight text-text-primary tabular-nums font-mono">
                {tasks.today.length + tasks.overdue.length}
              </span>
              <span className="text-[10px] micro-label text-text-secondary mt-1">Today</span>
            </motion.div>

            <motion.div
              variants={itemVariants}
              whileHover={{ scale: 1.03 }}
              className="glass-panel glass-panel-specular rounded-2xl p-3 flex flex-col items-center justify-center border-t-2 border-t-accent/70 hover:bg-bg-elevated cursor-default"
            >
              <span className="text-xl font-bold tracking-tight text-text-primary tabular-nums font-mono">
                {tasks.this_week.length}
              </span>
              <span className="text-[10px] micro-label text-text-secondary mt-1">This Week</span>
            </motion.div>

            <motion.div
              variants={itemVariants}
              whileHover={{ scale: 1.03 }}
              className="glass-panel glass-panel-specular rounded-2xl p-3 flex flex-col items-center justify-center border-t-2 border-t-focus-high/70 hover:bg-bg-elevated cursor-default"
            >
              <span className="text-xl font-bold tracking-tight text-text-primary tabular-nums font-mono">
                {tasks.next_week.length}
              </span>
              <span className="text-[10px] micro-label text-text-secondary mt-1">Next Week</span>
            </motion.div>

            <motion.div
              variants={itemVariants}
              whileHover={{ scale: 1.03 }}
              className="glass-panel glass-panel-specular rounded-2xl p-3 flex flex-col items-center justify-center border-t-2 border-t-text-secondary/40 hover:bg-bg-elevated cursor-default"
            >
              <span className="text-xl font-bold tracking-tight text-text-primary tabular-nums font-mono">
                {tasks.anytime.length}
              </span>
              <span className="text-[10px] micro-label text-text-secondary mt-1">Anytime</span>
            </motion.div>
          </motion.div>
        )}

        {/* 3D Voice Recorder Block */}
        <section className="w-full flex justify-center py-2">
          <Recorder
            onRecordingComplete={handleRecordingComplete}
            onErrorToast={(t, m) => addToast('error', t, m)}
            sessionToken={sessionToken}
          />
        </section>

        {/* Filter Indicator Banner */}
        {activeFilter !== 'all' && (
          <div className="w-full flex items-center justify-between px-3 py-1.5 bg-accent/10 border border-accent/30 rounded-xl text-xs">
            <span className="micro-label text-accent">
              Active Filter: {activeFilter === 'high_focus' ? '⚡ High Focus (Deep Work)' : '☕ Low Focus (Quick Wins)'}
            </span>
            <button
              onClick={() => setActiveFilter('all')}
              className="text-[10px] micro-label text-text-secondary hover:text-text-primary cursor-pointer underline"
            >
              Clear Filter
            </button>
          </div>
        )}

        {/* Quick Add Inline Form */}
        <form onSubmit={handleQuickAdd} className="w-full">
          <div className="relative flex items-center glass-panel rounded-2xl p-1.5 focus-within:ring-2 focus-within:ring-accent/40 transition-all duration-300 shadow-xs">
            <input
              type="text"
              value={quickTaskText}
              onChange={(e) => setQuickTaskText(e.target.value)}
              disabled={isSubmittingQuickTask}
              placeholder="Type a quick task..."
              className="flex-1 bg-transparent px-3 py-1.5 text-sm text-text-primary placeholder-text-secondary/60 focus:outline-none disabled:opacity-50 font-medium"
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

        <div className="w-full border-t border-glass-border/30" />

        {/* Task List Block */}
        <section className="w-full flex-1">
          {isLoading ? (
            <div className="space-y-4 p-4 animate-pulse">
              <div className="h-3.5 w-24 bg-glass-border/40 rounded-lg mb-2" />
              <div className="h-20 glass-panel rounded-2xl" />
              <div className="h-20 glass-panel rounded-2xl" />
            </div>
          ) : (
            <TaskList
              initialTasks={tasks}
              onRefreshNeeded={fetchTasks}
              activeFilter={activeFilter}
              sessionToken={sessionToken}
            />
          )}
        </section>
      </motion.main>
    </div>
  );
}
