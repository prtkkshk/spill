'use client';

import React, { useState, useEffect } from 'react';
import { Task } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';

type GroupKey = 'overdue' | 'today' | 'this_week' | 'next_week' | 'anytime' | 'completed';

interface TaskListProps {
  initialTasks: {
    overdue: Task[];
    today: Task[];
    this_week: Task[];
    next_week: Task[];
    anytime: Task[];
    completed: Task[];
  };
  onRefreshNeeded: () => void;
}

export default function TaskList({ initialTasks, onRefreshNeeded }: TaskListProps) {
  const [localTasks, setLocalTasks] = useState(initialTasks);
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLocalTasks(initialTasks);
  }, [initialTasks]);

  // Inline Edit, Delete, and Clear states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const [editDeadline, setEditDeadline] = useState<string>('');
  const [editEnergy, setEditEnergy] = useState<string>('');
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(false);
  const [isClearingCompleted, setIsClearingCompleted] = useState(false);

  const startEdit = (task: Task) => {
    setEditingId(task.id);
    setEditDesc(task.description);
    setEditDeadline(task.fuzzy_deadline);
    setEditEnergy(task.energy_level);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (taskId: string, currentGroup: GroupKey) => {
    if (!editDesc.trim()) return;

    const originalGroupList = localTasks[currentGroup];
    const originalTask = originalGroupList.find((t) => t.id === taskId);
    if (!originalTask) return;

    const targetGroup = editDeadline as GroupKey;

    const updatedTask = {
      ...originalTask,
      description: editDesc.trim(),
      fuzzy_deadline: editDeadline,
      energy_level: editEnergy,
    };

    setLocalTasks((prev) => {
      if (currentGroup !== targetGroup) {
        return {
          ...prev,
          [currentGroup]: prev[currentGroup].filter((t) => t.id !== taskId),
          [targetGroup]: [...prev[targetGroup], updatedTask].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          ),
        };
      } else {
        return {
          ...prev,
          [currentGroup]: prev[currentGroup].map((t) => (t.id === taskId ? updatedTask : t)),
        };
      }
    });

    setEditingId(null);

    try {
      const response = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: taskId,
          description: editDesc.trim(),
          fuzzy_deadline: editDeadline,
          energy_level: editEnergy,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save task edits on server');
      }

      onRefreshNeeded();
    } catch (error) {
      console.error('Failed to save task edit, rolling back:', error);

      setLocalTasks((prev) => {
        if (currentGroup !== targetGroup) {
          return {
            ...prev,
            [targetGroup]: prev[targetGroup].filter((t) => t.id !== taskId),
            [currentGroup]: [...prev[currentGroup], originalTask].sort(
              (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            ),
          };
        } else {
          return {
            ...prev,
            [currentGroup]: prev[currentGroup].map((t) => (t.id === taskId ? originalTask : t)),
          };
        }
      });

      alert('Failed to save task edits. Connection error.');
    }
  };

  const handleDelete = async (taskId: string, currentGroup: GroupKey) => {
    const originalGroupList = localTasks[currentGroup];
    const taskToDelete = originalGroupList.find((t) => t.id === taskId);
    if (!taskToDelete) return;

    if (!confirm('Are you sure you want to delete this task?')) return;

    setLocalTasks((prev) => {
      return {
        ...prev,
        [currentGroup]: prev[currentGroup].filter((t) => t.id !== taskId),
      };
    });

    try {
      const response = await fetch('/api/tasks', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: taskId }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete task on server');
      }

      onRefreshNeeded();
    } catch (error) {
      console.error('Failed to delete task, rolling back:', error);

      setLocalTasks((prev) => {
        if (prev[currentGroup].some((t) => t.id === taskId)) return prev;
        const updatedList = [...prev[currentGroup], taskToDelete].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        return {
          ...prev,
          [currentGroup]: updatedList,
        };
      });

      alert('Failed to delete task. Connection error.');
    }
  };

  const handleClearCompleted = async () => {
    if (!isClearingCompleted) {
      setIsClearingCompleted(true);
      setTimeout(() => setIsClearingCompleted(false), 4000);
      return;
    }

    const previousCompleted = localTasks.completed || [];
    setLocalTasks((prev) => ({ ...prev, completed: [] }));
    setIsClearingCompleted(false);

    try {
      const response = await fetch('/api/tasks', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'completed' }),
      });

      if (!response.ok) {
        throw new Error('Failed to clear completed tasks');
      }

      onRefreshNeeded();
    } catch (error) {
      console.error('Failed to clear completed tasks:', error);
      setLocalTasks((prev) => ({ ...prev, completed: previousCompleted }));
      alert('Failed to clear completed tasks. Connection error.');
    }
  };

  const handleToggleComplete = async (taskId: string, currentGroup: GroupKey) => {
    const originalGroupList = localTasks[currentGroup] || [];
    const taskToToggle = originalGroupList.find((t) => t.id === taskId);
    
    if (!taskToToggle) return;

    const isUndoing = currentGroup === 'completed';

    if (isUndoing) {
      let targetGroup = taskToToggle.fuzzy_deadline as GroupKey;
      if (targetGroup === 'today') {
        const taskDate = new Date(taskToToggle.created_at);
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        if (taskDate < todayStart) {
          targetGroup = 'overdue';
        }
      } else if (targetGroup === 'this_week') {
        const taskDate = new Date(taskToToggle.created_at);
        const currentWeekStart = new Date();
        const day = currentWeekStart.getDay();
        const diff = currentWeekStart.getDate() - day + (day === 0 ? -6 : 1);
        currentWeekStart.setDate(diff);
        currentWeekStart.setHours(0, 0, 0, 0);
        if (taskDate < currentWeekStart) {
          targetGroup = 'overdue';
        }
      }

      const pendingTask = {
        ...taskToToggle,
        status: 'pending' as const,
        completed_at: null,
      };

      setLocalTasks((prev) => {
        return {
          ...prev,
          completed: prev.completed.filter((t) => t.id !== taskId),
          [targetGroup]: [...(prev[targetGroup] || []), pendingTask].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          ),
        };
      });

      try {
        const response = await fetch('/api/tasks', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id: taskId, status: 'pending' }),
        });

        if (!response.ok) {
          throw new Error('Failed to revert task status on server');
        }

        onRefreshNeeded();
      } catch (error) {
        console.error('Failed to undo task completion, rolling back:', error);

        setLocalTasks((prev) => {
          return {
            ...prev,
            [targetGroup]: (prev[targetGroup] || []).filter((t) => t.id !== taskId),
            completed: [...prev.completed, taskToToggle].sort(
              (a, b) => new Date(b.completed_at || '').getTime() - new Date(a.completed_at || '').getTime()
            ),
          };
        });

        alert('Failed to undo task completion. Connection error.');
      }
    } else {
      setCompletingIds((prev) => {
        const next = new Set(prev);
        next.add(taskId);
        return next;
      });

      setTimeout(async () => {
        const completedTask = {
          ...taskToToggle,
          status: 'completed' as const,
          completed_at: new Date().toISOString(),
        };

        setLocalTasks((prev) => {
          return {
            ...prev,
            [currentGroup]: prev[currentGroup].filter((t) => t.id !== taskId),
            completed: [completedTask, ...(prev.completed || [])].slice(0, 10),
          };
        });

        setCompletingIds((prev) => {
          const next = new Set(prev);
          next.delete(taskId);
          return next;
        });

        try {
          const response = await fetch('/api/tasks', {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id: taskId, status: 'completed' }),
          });

          if (!response.ok) {
            throw new Error('Failed to mark task completed on server');
          }

          onRefreshNeeded();
        } catch (error) {
          console.error('Failed to complete task, rolling back:', error);

          setLocalTasks((prev) => {
            return {
              ...prev,
              completed: (prev.completed || []).filter((t) => t.id !== taskId),
              [currentGroup]: [...prev[currentGroup], taskToToggle].sort(
                (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              ),
            };
          });

          alert('Failed to complete task. Connection error.');
        }
      }, 300);
    }
  };

  const getEnergyBadge = (level: string) => {
    if (level === 'high_focus') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-focus-high/15 text-focus-high border border-focus-high/25 shadow-xs">
          ⚡ High Focus
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-success/15 text-success border border-success/25 shadow-xs">
        ☕ Low Focus
      </span>
    );
  };

  const hasTasks =
    (localTasks.overdue?.length || 0) > 0 ||
    localTasks.today.length > 0 ||
    localTasks.this_week.length > 0 ||
    localTasks.next_week.length > 0 ||
    localTasks.anytime.length > 0;

  const renderGroup = (groupKey: GroupKey, title: string, subtitle: string) => {
    const list = localTasks[groupKey] || [];
    if (list.length === 0) return null;

    const isOverdue = groupKey === 'overdue';

    return (
      <div className="space-y-3">
        <div className="flex flex-col px-0.5">
          <h3 className={`text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${
            isOverdue ? 'text-danger' : 'text-text-secondary'
          }`}>{title}</h3>
          <span className="text-[11px] text-text-secondary/70">{subtitle}</span>
        </div>
        <div className="space-y-2.5 relative">
          <AnimatePresence mode="popLayout">
            {list.map((task) => {
              const isCompleting = completingIds.has(task.id);
              const isEditing = editingId === task.id;

              if (isEditing) {
                return (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ type: "spring", stiffness: 350, damping: 26 }}
                    className="flex flex-col space-y-3 bg-bg-elevated border border-accent/40 rounded-2xl p-4 shadow-lg"
                  >
                    <textarea
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      className="w-full bg-bg-base border border-glass-border/40 rounded-xl p-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/40 min-h-[75px] resize-none font-medium"
                      placeholder="Task description..."
                    />

                    <div className="flex flex-col space-y-1 px-0.5">
                      <span className="text-[10px] uppercase tracking-wider text-text-secondary font-bold">Fuzzy Deadline</span>
                      <div className="flex flex-wrap gap-1.5">
                        {(['today', 'this_week', 'next_week', 'anytime'] as const).map((dl) => (
                          <button
                            key={dl}
                            type="button"
                            onClick={() => setEditDeadline(dl)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide transition cursor-pointer ${
                              editDeadline === dl
                                ? 'bg-accent text-white shadow-xs'
                                : 'bg-glass-surface border border-glass-border/30 text-text-secondary hover:bg-accent/10'
                            }`}
                          >
                            {dl.replace('_', ' ')}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col space-y-1 px-0.5">
                      <span className="text-[10px] uppercase tracking-wider text-text-secondary font-bold">Energy Level</span>
                      <div className="flex space-x-1.5">
                        {(['high_focus', 'low_focus'] as const).map((ef) => (
                          <button
                            key={ef}
                            type="button"
                            onClick={() => setEditEnergy(ef)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide transition cursor-pointer ${
                              editEnergy === ef
                                ? ef === 'high_focus'
                                  ? 'bg-focus-high text-white shadow-xs'
                                  : 'bg-success text-white shadow-xs'
                                : 'bg-glass-surface border border-glass-border/30 text-text-secondary hover:bg-accent/10'
                            }`}
                          >
                            {ef === 'high_focus' ? '⚡ High Focus' : '☕ Low Focus'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex space-x-2 pt-1 justify-end">
                      <button
                        onClick={cancelEdit}
                        className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase bg-glass-surface border border-glass-border/40 text-text-primary hover:bg-glass-surface/80 transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => saveEdit(task.id, groupKey)}
                        disabled={!editDesc.trim()}
                        className="px-3.5 py-1.5 rounded-lg text-[10px] font-bold uppercase bg-accent text-white hover:bg-accent-strong disabled:opacity-30 transition cursor-pointer shadow-sm"
                      >
                        Save
                      </button>
                    </div>
                  </motion.div>
                );
              }

              return (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, x: 20 }}
                  transition={{ type: "spring", stiffness: 350, damping: 26 }}
                  className={`flex items-start space-x-3.5 border rounded-2xl p-4 transition-all duration-300 group ${
                    isOverdue 
                      ? 'bg-danger/5 border-danger/25 hover:border-danger/45' 
                      : 'bg-bg-elevated/90 border-glass-border/40 hover:border-glass-border/70 hover:bg-bg-elevated'
                  } ${
                    isCompleting ? 'opacity-35 scale-95 translate-x-2' : ''
                  }`}
                >
                  <button
                    onClick={() => handleToggleComplete(task.id, groupKey)}
                    disabled={isCompleting}
                    className={`mt-0.5 flex-shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 cursor-pointer ${
                      isCompleting 
                        ? 'border-success bg-success/20 text-success' 
                        : 'border-text-secondary/40 group-hover:border-accent hover:bg-accent/10 text-transparent'
                    }`}
                    aria-label="Mark task complete"
                  >
                    {isCompleting ? (
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="h-3 w-3 opacity-0 group-hover:opacity-100 group-hover:text-accent transition-opacity duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>

                  <div className="flex-1 space-y-2 min-w-0">
                    <div className="flex items-start justify-between space-x-2">
                      <p className={`text-text-primary font-medium text-sm leading-relaxed break-words ${isCompleting ? 'line-through text-text-secondary/60' : ''}`}>
                        {task.description}
                      </p>
                      
                      {!isCompleting && (
                        <div className="flex space-x-1 opacity-45 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0">
                          <button
                            onClick={() => startEdit(task)}
                            className="p-1 rounded-lg text-text-secondary hover:text-accent hover:bg-accent/10 transition cursor-pointer"
                            aria-label="Edit task"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(task.id, groupKey)}
                            className="p-1 rounded-lg text-text-secondary hover:text-danger hover:bg-danger/10 transition cursor-pointer"
                            aria-label="Delete task"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {getEnergyBadge(task.energy_level)}
                      
                      {task.specific_deadline && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-danger/15 text-danger border border-danger/25 shadow-xs">
                          🗓️ {task.specific_deadline}
                        </span>
                      )}

                      {task.context && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-glass-surface border border-glass-border/40 text-text-secondary leading-snug break-words max-w-full" title={task.context}>
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
        <div className="text-center py-12 px-6 bg-bg-elevated/60 border border-glass-border/30 rounded-3xl space-y-3 backdrop-blur-md shadow-xs">
          <span className="text-4xl block animate-bounce" style={{ animationDuration: '3s' }}>🎉</span>
          <h3 className="text-base font-bold text-text-primary">All clear, you're doing great!</h3>
          <p className="text-xs text-text-secondary max-w-xs mx-auto leading-relaxed">
            No pending tasks left. Tap the microphone above to spill whatever is on your mind, and let's organize it.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {renderGroup('overdue', 'Overdue Today', 'Pending tasks from prior days')}
          {renderGroup('today', 'Today', 'Crucial focus for today')}
          {renderGroup('this_week', 'This Week', 'Plan to tackle by Sunday')}
          {renderGroup('next_week', 'Next Week', 'Tackle starting next Monday')}
          {renderGroup('anytime', 'Low-Energy / Anytime', 'Backlog, low focus, or when free')}
        </div>
      )}

      {/* Collapsible Completed Section with Clear All */}
      {localTasks.completed && localTasks.completed.length > 0 && (
        <div className="pt-6 border-t border-glass-border/30">
          <div className="flex items-center justify-between px-1 mb-2">
            <button
              onClick={() => setIsCompletedExpanded(!isCompletedExpanded)}
              className="flex items-center space-x-2 text-text-secondary hover:text-text-primary transition-all duration-200 font-bold text-xs uppercase tracking-wider cursor-pointer"
            >
              <span>Recently Completed ({localTasks.completed.length})</span>
              <svg
                className={`h-3.5 w-3.5 transition-transform duration-300 ${isCompletedExpanded ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <button
              onClick={handleClearCompleted}
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                isClearingCompleted
                  ? 'bg-danger text-white border-danger animate-pulse'
                  : 'text-text-secondary hover:text-danger border-glass-border/40 hover:border-danger/40'
              }`}
            >
              {isClearingCompleted ? 'Confirm Clear All?' : 'Clear all'}
            </button>
          </div>

          {isCompletedExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 space-y-2"
            >
              {localTasks.completed.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center space-x-3.5 bg-bg-elevated/50 border border-glass-border/20 rounded-2xl p-3.5 opacity-70 hover:opacity-100 transition-opacity"
                >
                  <button
                    onClick={() => handleToggleComplete(task.id, 'completed')}
                    className="flex-shrink-0 h-5 w-5 rounded-full border-2 border-success bg-success/20 text-success flex items-center justify-center cursor-pointer"
                    aria-label="Mark task pending"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  <span className="flex-1 text-xs text-text-secondary line-through break-words">
                    {task.description}
                  </span>
                </div>
              ))}
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
