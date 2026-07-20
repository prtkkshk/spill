'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction: (action: string, payload?: any) => void;
}

export default function CommandPalette({
  isOpen,
  onClose,
  onSelectAction,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  // Global keydown listener for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else onSelectAction('open_command_palette');
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onSelectAction]);

  if (!isOpen) return null;

  const actions = [
    {
      id: 'start_record',
      label: 'Start Voice Recording',
      category: 'Voice',
      icon: '🎙️',
      shortcut: 'Space',
    },
    {
      id: 'filter_quick_win',
      label: 'Filter: Quick Wins (Low Focus)',
      category: 'Filter',
      icon: '☕',
      shortcut: 'Alt+1',
    },
    {
      id: 'filter_deep_work',
      label: 'Filter: Deep Work (High Focus)',
      category: 'Filter',
      icon: '⚡',
      shortcut: 'Alt+2',
    },
    {
      id: 'filter_all',
      label: 'Show All Tasks',
      category: 'Filter',
      icon: '📋',
      shortcut: 'Alt+0',
    },
    {
      id: 'add_manual',
      label: 'Add Manual Task',
      category: 'Actions',
      icon: '➕',
      shortcut: 'Enter',
    },
    {
      id: 'sync_calendar',
      label: 'Export Calendar (.ics)',
      category: 'Productivity',
      icon: '📅',
      shortcut: 'Alt+C',
    },
    {
      id: 'toggle_theme',
      label: 'Toggle Dark / Light Theme',
      category: 'Preferences',
      icon: '🌓',
      shortcut: 'Alt+T',
    },
  ];

  const filteredActions = actions.filter((act) =>
    act.label.toLowerCase().includes(query.toLowerCase()) ||
    act.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -10 }}
          className="w-full max-w-lg glass-panel glass-panel-specular rounded-3xl overflow-hidden shadow-2xl border border-glass-border/60"
        >
          {/* Command Search Input */}
          <div className="flex items-center px-4 border-b border-glass-border/40 bg-bg-elevated/80">
            <span className="text-text-secondary text-sm mr-3">🔍</span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type a command or search tasks (Cmd + K)..."
              className="w-full bg-transparent py-4 text-sm text-text-primary placeholder-text-secondary/60 focus:outline-none font-medium"
            />
            <button
              onClick={onClose}
              className="text-[10px] micro-label bg-glass-surface px-2 py-1 rounded-md text-text-secondary hover:text-text-primary cursor-pointer border border-glass-border/30"
            >
              ESC
            </button>
          </div>

          {/* Action List */}
          <div className="max-h-80 overflow-y-auto p-2 space-y-1">
            {filteredActions.length === 0 ? (
              <div className="py-8 text-center text-xs text-text-secondary">
                No matching commands found.
              </div>
            ) : (
              filteredActions.map((act) => (
                <button
                  key={act.id}
                  onClick={() => {
                    onSelectAction(act.id, query);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl hover:bg-accent/15 text-left transition duration-150 cursor-pointer group"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-base">{act.icon}</span>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-text-primary group-hover:text-accent transition-colors">
                        {act.label}
                      </span>
                      <span className="text-[10px] micro-label text-text-secondary/70">
                        {act.category}
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono text-text-secondary/60 bg-glass-surface px-2 py-0.5 rounded-md border border-glass-border/20">
                    {act.shortcut}
                  </span>
                </button>
              ))
            )}
          </div>

          {/* Footer micro label */}
          <div className="px-4 py-2 bg-bg-elevated/90 border-t border-glass-border/30 flex justify-between items-center text-[10px] text-text-secondary font-mono">
            <span>SPILL COMMAND PALETTE</span>
            <span>PROD v2.0</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
