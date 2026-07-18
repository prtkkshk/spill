'use client';

import React, { useState, useEffect } from 'react';
import { Task, FuzzyDeadline } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';

interface TaskListProps {
  initialTasks: {
    today: Task[];
    this_week: Task[];
    next_week: Task[];
    anytime: Task[];
  };
  onRefreshNeeded: () => void;
}

export default function TaskList({ initialTasks, onRefreshNeeded }: TaskListProps) {
  // Local state to manage tasks for optimistic UI updates
  const [localTasks, setLocalTasks] = useState(initialTasks);
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set());

  // Keep local tasks in sync when props change
  useEffect(() => {
    setLocalTasks(initialTasks);
  }, [initialTasks]);

  const handleToggleComplete = async (taskId: string, currentGroup: 'today' | 'this_week' | 'next_week' | 'anytime') => {
    // 1. Optimistic Update: Remove task from local list immediately
    const originalGroupList = localTasks[currentGroup];
    const taskToComplete = originalGroupList.find((t) => t.id === taskId);
    
    if (!taskToComplete) return;

    // Add to completing list for fade animation before removal
    setCompletingIds((prev) => {
      const next = new Set(prev);
      next.add(taskId);
      return next;
    });

    // We wait 300ms for check animation/fade before removing from UI
    setTimeout(async () => {
      setLocalTasks((prev) => {
        return {
          ...prev,
          [currentGroup]: prev[currentGroup].filter((t) => t.id !== taskId),
        };
      });
      setCompletingIds((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });

      try {
        // 2. Perform Network Call
        const response = await fetch('/api/tasks', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id: taskId }),
        });

        if (!response.ok) {
          throw new Error('Failed to update task on server');
        }

        // Trigger a silent background refresh to sync with DB
        onRefreshNeeded();
      } catch (error) {
        console.error('Failed to complete task, rolling back:', error);
        
        // 3. Rollback: Put task back in original place
        setLocalTasks((prev) => {
          // Check if already back (to avoid duplicates)
          if (prev[currentGroup].some((t) => t.id === taskId)) return prev;
          
          const updatedList = [...prev[currentGroup], taskToComplete].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          
          return {
            ...prev,
            [currentGroup]: updatedList,
          };
        });

        alert('Failed to check off task. Connecting to database failed — rolled back.');
      }
    }, 300);
  };

  const getEnergyBadge = (level: string) => {
    if (level === 'high_focus') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-focus-high/15 text-focus-high border border-focus-high/20 shadow-sm transition-colors duration-500">
          ⚡ High Focus
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-success/15 text-success border border-success/20 shadow-sm transition-colors duration-500">
        ☕ Low Focus
      </span>
    );
  };

  const hasTasks =
    localTasks.today.length > 0 ||
    localTasks.this_week.length > 0 ||
    localTasks.next_week.length > 0 ||
    localTasks.anytime.length > 0;

  const renderGroup = (groupKey: 'today' | 'this_week' | 'next_week' | 'anytime', title: string, subtitle: string) => {
    const list = localTasks[groupKey];
    if (list.length === 0) return null;

    return (
      <div className="space-y-4">
        <div className="flex flex-col px-1">
          <h3 className="text-xs font-extrabold text-text-secondary uppercase tracking-widest transition-colors duration-500">{title}</h3>
          <span className="text-[10px] text-text-secondary/70 transition-colors duration-500">{subtitle}</span>
        </div>
        <div className="space-y-3 relative">
          <AnimatePresence mode="popLayout">
            {list.map((task) => {
              const isCompleting = completingIds.has(task.id);
              return (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, x: 20 }}
                  transition={{ type: "spring", stiffness: 350, damping: 26 }}
                  className={`flex items-start space-x-4 bg-glass-surface/50 border border-glass-border/30 rounded-2xl p-4 shadow-sm hover:shadow-md backdrop-blur-md transition-all duration-300 hover:bg-glass-surface/80 hover:border-glass-border/50 group select-none ${
                    isCompleting ? 'opacity-35 scale-95 translate-x-2' : ''
                  }`}
                >
                  {/* Custom Checkbox target */}
                  <button
                    onClick={() => handleToggleComplete(task.id, groupKey)}
                    disabled={isCompleting}
                    className={`mt-0.5 flex-shrink-0 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 cursor-pointer ${
                      isCompleting 
                        ? 'border-success bg-success/20 text-success' 
                        : 'border-text-secondary/40 group-hover:border-accent hover:bg-accent/10 text-transparent'
                    }`}
                    aria-label="Mark task complete"
                  >
                    {isCompleting ? (
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 group-hover:text-accent transition-opacity duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>

                  {/* Card Content */}
                  <div className="flex-1 space-y-2 min-w-0">
                    <p className={`text-text-primary font-bold text-sm leading-relaxed break-words transition-colors duration-500 ${isCompleting ? 'line-through text-text-secondary/60' : ''}`}>
                      {task.description}
                    </p>
                    
                    {/* Metadata and Context */}
                    <div className="flex flex-wrap gap-2 items-center">
                      {getEnergyBadge(task.energy_level)}
                      
                      {task.specific_deadline && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-danger/15 text-danger border border-danger/20 shadow-sm transition-colors duration-500">
                          🗓️ {task.specific_deadline}
                        </span>
                      )}

                      {task.context && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-glass-surface/50 border border-glass-border/30 text-text-secondary shadow-sm transition-all duration-300 truncate max-w-[180px]" title={task.context}>
                          🏷️ {task.context}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-8 p-4">
      {!hasTasks ? (
        <div className="text-center py-14 px-6 bg-glass-surface/40 border border-glass-border/20 rounded-3xl space-y-4 backdrop-blur-md shadow-sm transition-all duration-300">
          <span className="text-5xl block animate-bounce" style={{ animationDuration: '3s' }}>🎉</span>
          <h3 className="text-lg font-extrabold text-text-primary transition-colors duration-500">All clear, you're doing great!</h3>
          <p className="text-xs text-text-secondary/80 max-w-xs mx-auto leading-relaxed transition-colors duration-500">
            No pending tasks left. Tap the microphone above to dump whatever is on your mind, and let's organize it together.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {renderGroup('today', 'Today', 'Crucial focus for today')}
          {renderGroup('this_week', 'This Week', 'Plan to tackle by Sunday')}
          {renderGroup('next_week', 'Next Week', 'Tackle starting next Monday')}
          {renderGroup('anytime', 'Low-Energy / Anytime', 'Backlog, low focus, or when free')}
        </div>
      )}
    </div>
  );
}
