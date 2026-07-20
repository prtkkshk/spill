'use client';

import React, { useState, useRef } from 'react';
import { Task } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { downloadICS, getGoogleCalendarUrl } from '@/lib/calendar';
import { soundEngine } from '@/lib/audio-effects';
import { triggerHaptic } from '@/lib/haptics';

interface TaskCardProps {
  task: Task;
  isOverdue?: boolean;
  isCompleting?: boolean;
  onToggleComplete: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}

export default function TaskCard({
  task,
  isOverdue = false,
  isCompleting = false,
  onToggleComplete,
  onEdit,
  onDelete,
}: TaskCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [subSteps, setSubSteps] = useState<string[]>([]);
  const [completedSubSteps, setCompletedSubSteps] = useState<Set<number>>(new Set());
  const [isDeconstructing, setIsDeconstructing] = useState(false);
  const [showCalendarMenu, setShowCalendarMenu] = useState(false);

  // 3D Card Tilt Effect on Hover
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rX = ((y - centerY) / centerY) * -6;
    const rY = ((x - centerX) / centerX) * 6;

    setRotateX(rX);
    setRotateY(rY);

    cardRef.current.style.setProperty('--mouse-x', `${x}px`);
    cardRef.current.style.setProperty('--mouse-y', `${y}px`);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  const handleDeconstruct = async () => {
    if (subSteps.length > 0) {
      setSubSteps([]);
      return;
    }

    setIsDeconstructing(true);
    triggerHaptic(20);
    soundEngine.playMagicChime();

    try {
      const response = await fetch('/api/tasks/deconstruct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: task.description }),
      });

      const data = await response.json();
      if (data.success && Array.isArray(data.subSteps)) {
        setSubSteps(data.subSteps);
      }
    } catch (err) {
      console.error('Failed to deconstruct task:', err);
    } finally {
      setIsDeconstructing(false);
    }
  };

  const toggleSubStep = (index: number) => {
    triggerHaptic(12);
    setCompletedSubSteps((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleCompleteClick = () => {
    triggerHaptic(15);
    soundEngine.playCheckoffChime();
    onToggleComplete(task.id);
  };

  const getEnergyBadge = (level: string) => {
    if (level === 'high_focus') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] micro-label bg-focus-high/20 text-focus-high border border-focus-high/30 shadow-xs">
          ⚡ High Focus
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] micro-label bg-success/20 text-success border border-success/30 shadow-xs">
        ☕ Low Focus
      </span>
    );
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transformStyle: 'preserve-3d',
        transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
      }}
      className={`spotlight-card glass-panel glass-panel-specular rounded-2xl p-4 transition-all duration-200 group relative ${
        isOverdue
          ? 'border-danger/30 bg-danger/5 hover:border-danger/50'
          : 'border-glass-border/50 bg-bg-elevated/80 hover:border-glass-border/80 hover:bg-bg-elevated'
      } ${isCompleting ? 'opacity-40 scale-95 translate-x-2' : ''}`}
    >
      <div className="flex items-start space-x-3.5">
        <button
          onClick={handleCompleteClick}
          disabled={isCompleting}
          className={`mt-0.5 flex-shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 cursor-pointer ${
            isCompleting
              ? 'border-success bg-success/30 text-success'
              : 'border-text-secondary/40 group-hover:border-accent hover:bg-accent/15 text-transparent'
          }`}
          aria-label="Mark task complete"
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </button>

        <div className="flex-1 space-y-2 min-w-0">
          <div className="flex items-start justify-between space-x-2">
            <p
              className={`text-text-primary font-medium text-sm leading-relaxed break-words ${
                isCompleting ? 'line-through text-text-secondary/60' : ''
              }`}
            >
              {task.description}
            </p>

            {!isCompleting && (
              <div className="flex space-x-1 opacity-50 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0">
                <button
                  onClick={handleDeconstruct}
                  disabled={isDeconstructing}
                  aria-label="AI Deconstruct"
                  title="AI Deconstruct (3 sub-steps)"
                  className="p-1.5 rounded-lg text-text-secondary hover:text-neon-purple hover:bg-neon-purple/15 transition cursor-pointer"
                >
                  {isDeconstructing ? (
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-neon-purple border-t-transparent animate-spin" />
                  ) : (
                    <span>✨</span>
                  )}
                </button>

                <div className="relative">
                  <button
                    onClick={() => setShowCalendarMenu(!showCalendarMenu)}
                    aria-label="Export / Calendar Sync"
                    title="Export / Calendar Sync"
                    className="p-1.5 rounded-lg text-text-secondary hover:text-accent hover:bg-accent/15 transition cursor-pointer"
                  >
                    📅
                  </button>

                  {showCalendarMenu && (
                    <div className="absolute right-0 top-8 z-30 w-36 glass-panel rounded-xl p-1 shadow-2xl text-[10px] micro-label space-y-1">
                      <button
                        onClick={() => {
                          downloadICS(task);
                          setShowCalendarMenu(false);
                        }}
                        className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-accent/20 text-text-primary transition"
                      >
                        Download .ics
                      </button>
                      <a
                        href={getGoogleCalendarUrl(task)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setShowCalendarMenu(false)}
                        className="block w-full text-left px-2 py-1.5 rounded-lg hover:bg-accent/20 text-text-primary transition"
                      >
                        Google Calendar
                      </a>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => onEdit(task)}
                  aria-label="Edit task"
                  title="Edit task"
                  className="p-1.5 rounded-lg text-text-secondary hover:text-accent hover:bg-accent/15 transition cursor-pointer"
                >
                  ✏️
                </button>

                <button
                  onClick={() => onDelete(task.id)}
                  aria-label="Delete task"
                  title="Delete task"
                  className="p-1.5 rounded-lg text-text-secondary hover:text-danger hover:bg-danger/15 transition cursor-pointer"
                >
                  🗑️
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5 items-center">
            {getEnergyBadge(task.energy_level)}

            {task.specific_deadline && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] micro-label bg-danger/15 text-danger border border-danger/25">
                🗓️ {task.specific_deadline}
              </span>
            )}

            {task.context && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] micro-label bg-glass-surface border border-glass-border/40 text-text-secondary">
                🏷️ {task.context}
              </span>
            )}
          </div>

          {subSteps.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 pt-3 border-t border-glass-border/30 space-y-1.5"
            >
              <span className="text-[10px] micro-label text-neon-purple font-bold block">
                ✨ AI DECONSTRUCTED SUB-STEPS:
              </span>
              {subSteps.map((step, idx) => {
                const isChecked = completedSubSteps.has(idx);
                return (
                  <div
                    key={idx}
                    onClick={() => toggleSubStep(idx)}
                    className="flex items-center space-x-2 px-2 py-1 rounded-lg hover:bg-glass-surface/80 cursor-pointer transition"
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-md border flex items-center justify-center transition ${
                        isChecked
                          ? 'bg-neon-purple border-neon-purple text-white'
                          : 'border-glass-border/60'
                      }`}
                    >
                      {isChecked && <span className="text-[9px]">✓</span>}
                    </div>
                    <span
                      className={`text-xs text-text-secondary ${
                        isChecked ? 'line-through opacity-50' : ''
                      }`}
                    >
                      {step}
                    </span>
                  </div>
                );
              })}
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
