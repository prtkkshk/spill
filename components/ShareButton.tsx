'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Task } from '@/lib/types';

interface ShareButtonProps {
  tasks: {
    overdue?: Task[];
    today: Task[];
    this_week: Task[];
    next_week: Task[];
    anytime: Task[];
  };
}

export default function ShareButton({ tasks }: ShareButtonProps) {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const generateMarkdown = () => {
    const totalCount =
      (tasks.overdue?.length || 0) +
      tasks.today.length +
      tasks.this_week.length +
      tasks.next_week.length +
      tasks.anytime.length;

    if (totalCount === 0) {
      return '📋 FocusFlow Tasks\n\n🎉 All clear! No pending tasks.';
    }

    const lines: string[] = ['📋 *FocusFlow Task List*\n'];

    if (tasks.overdue && tasks.overdue.length > 0) {
      lines.push('⚠️ *Overdue*');
      tasks.overdue.forEach((t) => lines.push(`- [ ] ${t.description}`));
      lines.push('');
    }
    if (tasks.today && tasks.today.length > 0) {
      lines.push('🎯 *Today*');
      tasks.today.forEach((t) => lines.push(`- [ ] ${t.description}`));
      lines.push('');
    }
    if (tasks.this_week && tasks.this_week.length > 0) {
      lines.push('📅 *This Week*');
      tasks.this_week.forEach((t) => lines.push(`- [ ] ${t.description}`));
      lines.push('');
    }
    if (tasks.next_week && tasks.next_week.length > 0) {
      lines.push('🚀 *Next Week*');
      tasks.next_week.forEach((t) => lines.push(`- [ ] ${t.description}`));
      lines.push('');
    }
    if (tasks.anytime && tasks.anytime.length > 0) {
      lines.push('☕ *Low-Energy / Anytime*');
      tasks.anytime.forEach((t) => lines.push(`- [ ] ${t.description}`));
      lines.push('');
    }

    return lines.join('\n').trim();
  };

  const handleShare = async () => {
    const text = generateMarkdown();

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'FocusFlow Task List',
          text: text,
        });
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }

    // Fallback to clipboard
    try {
      await navigator.clipboard.writeText(text);
      setToastMessage('Copied to clipboard!');
      setTimeout(() => setToastMessage(null), 2500);
    } catch (err) {
      console.error('Clipboard copy failed:', err);
      setToastMessage('Failed to copy to clipboard');
      setTimeout(() => setToastMessage(null), 2500);
    }
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={handleShare}
        aria-label="Share task list"
        className="p-2 rounded-xl bg-glass-surface/60 border border-glass-border/30 text-text-secondary hover:text-accent hover:bg-glass-surface/90 hover:border-glass-border/60 transition-all duration-300 backdrop-blur-md cursor-pointer flex items-center justify-center shadow-sm active:scale-95"
        title="Share list as Markdown"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 100-2.684 3 3 0 000 2.684zm0 9a3 3 0 100-2.684 3 3 0 000 2.684z"
          />
        </svg>
      </button>

      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-11 z-50 whitespace-nowrap px-3 py-1.5 rounded-xl bg-glass-surface/95 border border-glass-border/40 text-xs font-bold text-accent shadow-lg backdrop-blur-xl"
          >
            📋 {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
