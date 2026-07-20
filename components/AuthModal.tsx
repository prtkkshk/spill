'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onUserChange: (user: User | null) => void;
}

export default function AuthModal({
  isOpen,
  onClose,
  user,
  onUserChange,
}: AuthModalProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    // Listen to Supabase auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      onUserChange(session?.user || null);
    });

    // Fetch current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      onUserChange(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, [onUserChange]);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
      },
    });

    setLoading(false);
    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'Magic link sent! Check your email inbox.' });
      setEmail('');
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
      },
    });

    if (error) {
      setLoading(false);
      setMessage({ type: 'error', text: error.message });
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    onUserChange(null);
    setLoading(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-sm glass-panel glass-panel-specular rounded-3xl p-6 relative space-y-5 shadow-2xl"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-text-secondary hover:text-text-primary p-1 rounded-full hover:bg-white/10 transition cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="text-center space-y-1">
            <h3 className="text-lg font-bold text-text-primary tracking-tight">
              {user ? 'Account Settings' : 'Sign In to Spill'}
            </h3>
            <p className="text-xs text-text-secondary">
              {user
                ? `Signed in as ${user.email}`
                : 'Sync your voice tasks across all your mobile & desktop devices.'}
            </p>
          </div>

          {user ? (
            <div className="space-y-3 pt-2">
              <div className="p-3 bg-bg-elevated/70 border border-glass-border/40 rounded-2xl text-xs space-y-1">
                <div className="flex justify-between text-text-secondary">
                  <span>User ID:</span>
                  <span className="font-mono text-[10px]">{user.id.slice(0, 12)}...</span>
                </div>
                <div className="flex justify-between text-text-secondary">
                  <span>Auth Method:</span>
                  <span className="capitalize">{user.app_metadata.provider || 'Magic Link'}</span>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                disabled={loading}
                className="w-full py-2.5 bg-danger/20 border border-danger/40 hover:bg-danger/30 text-danger rounded-xl text-xs font-bold transition duration-200 cursor-pointer"
              >
                {loading ? 'Signing out...' : 'Sign Out'}
              </button>
            </div>
          ) : (
            <div className="space-y-4 pt-1">
              {/* Google OAuth */}
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-2.5 px-4 bg-white text-gray-900 hover:bg-gray-100 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition shadow-md cursor-pointer disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.25 21.3 7.31 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.17 0 9.99 0 12s.46 3.83 1.26 5.42l4.02-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="relative flex items-center justify-center my-2">
                <div className="border-t border-glass-border/30 w-full" />
                <span className="bg-bg-elevated px-2 text-[10px] text-text-secondary uppercase font-mono tracking-widest absolute">
                  OR
                </span>
              </div>

              {/* Magic Link */}
              <form onSubmit={handleMagicLink} className="space-y-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full bg-bg-elevated border border-glass-border/40 rounded-xl p-3 text-xs text-text-primary placeholder-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full py-2.5 bg-accent hover:bg-accent-strong text-white rounded-xl text-xs font-bold transition shadow-md shadow-accent/20 cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Sending link...' : 'Send Magic Link'}
                </button>
              </form>

              {message && (
                <div
                  className={`p-3 rounded-xl text-xs text-center border ${
                    message.type === 'success'
                      ? 'bg-success/15 border-success/30 text-success'
                      : 'bg-danger/15 border-danger/30 text-danger'
                  }`}
                >
                  {message.text}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
