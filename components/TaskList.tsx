'use client';

import React, { useState, useEffect } from 'react';
import { Task } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import TaskCard from './TaskCard';

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
  activeFilter?: 'all' | 'high_focus' | 'low_focus';
  sessionToken?: string | null;
}

export default function TaskList({
  initialTasks,
  onRefreshNeeded,
  activeFilter = 'all',
  sessionToken,
}: TaskListProps) {
  const [localTasks, setLocalTasks] = useState(initialTasks);
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLocalTasks(initialTasks);
  }, [initialTasks]);

  // Inline Edit states
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
      fuzzy_deadline: editDeadline as any,
      energy_level: editEnergy as any,
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
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`;

      const response = await fetch('/api/tasks', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          id: taskId,
          description: editDesc.trim(),
          fuzzy_deadline: editDeadline,
          energy_level: editEnergy,
        }),
      });

      if (!response.ok) throw new Error('Failed to save task edits');
      onRefreshNeeded();
    } catch (error) {
      console.error('Failed to save edit:', error);
      onRefreshNeeded();
    }
  };

  const handleDelete = async (taskId: string, currentGroup: GroupKey) => {
    const originalGroupList = localTasks[currentGroup];
    const taskToDelete = originalGroupList.find((t) => t.id === taskId);
    if (!taskToDelete) return;

    if (!confirm('Are you sure you want to delete this task?')) return;

    setLocalTasks((prev) => ({
      ...prev,
      [currentGroup]: prev[currentGroup].filter((t) => t.id !== taskId),
    }));

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`;

      const response = await fetch('/api/tasks', {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ id: taskId }),
      });

      if (!response.ok) throw new Error('Failed to delete task');
      onRefreshNeeded();
    } catch (error) {
      console.error('Failed to delete task:', error);
      onRefreshNeeded();
    }
  };

  const handleClearCompleted = async () => {
    if (!isClearingCompleted) {
      setIsClearingCompleted(true);
      setTimeout(() => setIsClearingCompleted(false), 4000);
      return;
    }

    setLocalTasks((prev) => ({ ...prev, completed: [] }));
    setIsClearingCompleted(false);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`;

      const response = await fetch('/api/tasks', {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ scope: 'completed' }),
      });
      if (!response.ok) throw new Error('Failed to clear completed tasks');
      onRefreshNeeded();
    } catch (error) {
      console.error('Failed to clear completed:', error);
      onRefreshNeeded();
    }
  };

  const handleToggleComplete = async (taskId: string, currentGroup: GroupKey) => {
    const originalGroupList = localTasks[currentGroup] || [];
    const taskToToggle = originalGroupList.find((t) => t.id === taskId);
    if (!taskToToggle) return;

    const isUndoing = currentGroup === 'completed';

    if (isUndoing) {
      let targetGroup = taskToToggle.fuzzy_deadline as GroupKey;
      const pendingTask = {
        ...taskToToggle,
        status: 'pending' as const,
        completed_at: null,
      };

      setLocalTasks((prev) => ({
        ...prev,
        completed: prev.completed.filter((t) => t.id !== taskId),
        [targetGroup]: [...(prev[targetGroup] || []), pendingTask],
      }));

      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`;

        await fetch('/api/tasks', {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ id: taskId, status: 'pending' }),
        });
        onRefreshNeeded();
      } catch (e) {
        onRefreshNeeded();
      }
    } else {
      setCompletingIds((prev) => new Set(prev).add(taskId));

      setTimeout(async () => {
        const completedTask = {
          ...taskToToggle,
          status: 'completed' as const,
          completed_at: new Date().toISOString(),
        };

        setLocalTasks((prev) => ({
          ...prev,
          [currentGroup]: prev[currentGroup].filter((t) => t.id !== taskId),
          completed: [completedTask, ...(prev.completed || [])].slice(0, 10),
        }));

        setCompletingIds((prev) => {
          const next = new Set(prev);
          next.delete(taskId);
          return next;
        });

        try {
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`;

          await fetch('/api/tasks', {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ id: taskId, status: 'completed' }),
          });
          onRefreshNeeded();
        } catch (e) {
          onRefreshNeeded();
        }
      }, 300);
    }
  };

  const hasTasks =
    (localTasks.overdue?.length || 0) > 0 ||
    localTasks.today.length > 0 ||
    localTasks.this_week.length > 0 ||
    localTasks.next_week.length > 0 ||
    localTasks.anytime.length > 0;

  const renderGroup = (groupKey: GroupKey, title: string, subtitle: string) => {
    let list = localTasks[groupKey] || [];

    // Filter by active energy level if specified
    if (activeFilter !== 'all') {
      list = list.filter((t) => t.energy_level === activeFilter);
    }

    if (list.length === 0) return null;

    const isOverdue = groupKey === 'overdue';

    return (
      <div className="space-y-3">
        <div className="flex flex-col px-0.5">
          <h3
            className={`text-xs micro-label font-bold tracking-wider transition-colors duration-300 ${
              isOverdue ? 'text-danger' : 'text-text-secondary'
            }`}
          >
            {title}
          </h3>
          <span className="text-[11px] text-text-secondary/70">{subtitle}</span>
        </div>

        <div className="space-y-3 relative">
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
                    className="flex flex-col space-y-3 glass-panel glass-panel-specular rounded-2xl p-4 shadow-xl border border-accent/50"
                  >
                    <textarea
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      className="w-full bg-bg-base border border-glass-border/40 rounded-xl p-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/40 min-h-[75px] resize-none font-medium"
                      placeholder="Task description..."
                    />

                    <div className="flex flex-col space-y-1 px-0.5">
                      <span className="text-[10px] micro-label text-text-secondary font-bold">
                        Fuzzy Deadline
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {(['today', 'this_week', 'next_week', 'anytime'] as const).map((dl) => (
                          <button
                            key={dl}
                            type="button"
                            onClick={() => setEditDeadline(dl)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] micro-label transition cursor-pointer ${
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
                      <span className="text-[10px] micro-label text-text-secondary font-bold">
                        Energy Level
                      </span>
                      <div className="flex space-x-1.5">
                        {(['high_focus', 'low_focus'] as const).map((ef) => (
                          <button
                            key={ef}
                            type="button"
                            onClick={() => setEditEnergy(ef)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] micro-label transition cursor-pointer ${
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
                        className="px-3 py-1.5 rounded-lg text-[10px] micro-label bg-glass-surface border border-glass-border/40 text-text-primary cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => saveEdit(task.id, groupKey)}
                        disabled={!editDesc.trim()}
                        className="px-3.5 py-1.5 rounded-lg text-[10px] micro-label bg-accent text-white cursor-pointer shadow-sm disabled:opacity-40"
                      >
                        Save
                      </button>
                    </div>
                  </motion.div>
                );
              }

              return (
                <TaskCard
                  key={task.id}
                  task={task}
                  isOverdue={isOverdue}
                  isCompleting={isCompleting}
                  onToggleComplete={(id) => handleToggleComplete(id, groupKey)}
                  onEdit={startEdit}
                  onDelete={(id) => handleDelete(id, groupKey)}
                />
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
        <div className="text-center py-12 px-6 glass-panel rounded-3xl space-y-3 backdrop-blur-md shadow-xs">
          <span className="text-4xl block animate-bounce" style={{ animationDuration: '3s' }}>
            🎉
          </span>
          <h3 className="text-base font-bold text-text-primary">All clear, you're doing great!</h3>
          <p className="text-xs text-text-secondary max-w-xs mx-auto leading-relaxed">
            No pending tasks left. Tap the 3D fluid visualizer above to spill your thoughts.
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
              className="flex items-center space-x-2 text-text-secondary hover:text-text-primary transition-all duration-200 font-bold text-xs micro-label cursor-pointer"
            >
              <span>Recently Completed ({localTasks.completed.length})</span>
              <svg
                className={`h-3.5 w-3.5 transition-transform duration-300 ${
                  isCompletedExpanded ? 'rotate-180' : ''
                }`}
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
              className={`text-[10px] micro-label px-2 py-1 rounded-lg border transition-all cursor-pointer ${
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
                  className="flex items-center space-x-3.5 glass-panel rounded-2xl p-3.5 opacity-70 hover:opacity-100 transition-opacity"
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
