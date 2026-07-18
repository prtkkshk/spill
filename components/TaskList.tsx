'use client';

import React, { useState, useEffect } from 'react';
import { Task, FuzzyDeadline } from '@/lib/types';

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
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
          ⚡ High Focus
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
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
      <div className="space-y-3">
        <div className="flex flex-col">
          <h3 className="text-md font-bold text-slate-100 uppercase tracking-wider">{title}</h3>
          <span className="text-xs text-slate-400">{subtitle}</span>
        </div>
        <div className="space-y-3">
          {list.map((task) => {
            const isCompleting = completingIds.has(task.id);
            return (
              <div
                key={task.id}
                className={`flex items-start space-x-4 bg-slate-800/60 hover:bg-slate-800/80 border border-slate-700/60 rounded-xl p-4 transition-all duration-300 ${
                  isCompleting ? 'opacity-30 scale-95 translate-x-2' : ''
                }`}
              >
                {/* Large Checkbox Target */}
                <button
                  onClick={() => handleToggleComplete(task.id, groupKey)}
                  disabled={isCompleting}
                  className="mt-0.5 flex-shrink-0 h-6 w-6 rounded-full border-2 border-slate-500 flex items-center justify-center hover:border-indigo-400 hover:bg-indigo-950/20 transition-all duration-150"
                  aria-label="Mark task complete"
                >
                  {isCompleting && (
                    <svg className="h-4 w-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>

                {/* Card Content */}
                <div className="flex-1 space-y-1.5 min-w-0">
                  <p className={`text-slate-100 font-medium text-sm leading-relaxed break-words ${isCompleting ? 'line-through text-slate-500' : ''}`}>
                    {task.description}
                  </p>
                  
                  {/* Metadata and Context */}
                  <div className="flex flex-wrap gap-2 items-center">
                    {getEnergyBadge(task.energy_level)}
                    
                    {task.specific_deadline && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        🗓️ {task.specific_deadline}
                      </span>
                    )}

                    {task.context && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-700 text-slate-300 truncate max-w-[200px]" title={task.context}>
                        🏷️ {task.context}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-8 p-4">
      {!hasTasks ? (
        <div className="text-center py-12 px-6 bg-slate-800/30 border border-dashed border-slate-700 rounded-2xl space-y-3">
          <span className="text-4xl">🎉</span>
          <h3 className="text-lg font-bold text-slate-200">No pending tasks!</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            You're all clear. Press the mic button and dump whatever is on your mind to create new ones.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {renderGroup('today', 'Today', 'Crucial focus for today')}
          {renderGroup('this_week', 'This Week', 'Plan to tackle by Sunday')}
          {renderGroup('next_week', 'Next Week', 'Tackle starting next Monday')}
          {renderGroup('anytime', 'Low-Energy / Anytime', 'Backlog, low focus, or when free')}
        </div>
      )}
    </div>
  );
}
