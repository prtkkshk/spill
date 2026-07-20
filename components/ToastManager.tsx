'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ToastMessage {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
}

interface ToastManagerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export default function ToastManager({ toasts, onDismiss }: ToastManagerProps) {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      <AnimatePresence>
        {toasts.map((toast) => {
          const isError = toast.type === 'error';
          const isSuccess = toast.type === 'success';

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className={`pointer-events-auto glass-panel glass-panel-specular rounded-2xl p-4 shadow-xl border flex items-start justify-between space-x-3 ${
                isError
                  ? 'border-danger/40 bg-danger/10 text-text-primary'
                  : isSuccess
                  ? 'border-success/40 bg-success/10 text-text-primary'
                  : 'border-glass-border/60 bg-bg-elevated/90 text-text-primary'
              }`}
            >
              <div className="flex items-start space-x-3 min-w-0">
                <span className="text-base mt-0.5">
                  {isError ? '⚠️' : isSuccess ? '✅' : 'ℹ️'}
                </span>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold leading-tight truncate">
                    {toast.title}
                  </span>
                  {toast.message && (
                    <span className="text-[11px] text-text-secondary line-clamp-2 mt-0.5 leading-snug">
                      {toast.message}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => onDismiss(toast.id)}
                className="text-text-secondary hover:text-text-primary p-1 rounded-md transition cursor-pointer flex-shrink-0"
              >
                ✕
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
