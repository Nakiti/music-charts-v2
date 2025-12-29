"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, ArrowRight, Chrome } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const router = useRouter();
  const { loginWithGoogle, loginWithEmail } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await loginWithEmail(email, password);
      router.push('/charts');
    } catch (err) {
      console.error('Email login failed', err);
      setError('Unable to sign in with email and password. Please check your credentials and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setIsLoading(true);

    try {
      await loginWithGoogle();
      router.push('/charts');
    } catch (err) {
      console.error('Google login failed', err);
      setError('Google sign-in failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-sky-500/30 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-br from-white/10 to-sky-600/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="w-full max-w-md bg-zinc-900/80 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl relative z-10 animate-in fade-in zoom-in duration-500">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black tracking-tight mb-2">Welcome Back</h1>
          <p className="text-zinc-400 text-sm">Enter the arena and start voting.</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider ml-1">Email</label>
            <div className="relative group">
              <Mail className="absolute left-3 top-3.5 w-5 h-5 text-zinc-500 group-focus-within:text-white transition-colors" />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-950/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-zinc-600 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
                placeholder="name@example.com"
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center ml-1">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Password</label>
              <Link href="/forgot-password" className="text-xs text-sky-400 hover:text-sky-300 font-medium">Forgot?</Link>
            </div>
            <div className="relative group">
              <Lock className="absolute left-3 top-3.5 w-5 h-5 text-zinc-500 group-focus-within:text-white transition-colors" />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-950/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-zinc-600 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
                placeholder="••••••••"
                required
              />
            </div>
          </div>
          {error && (
            <p className="text-sm text-red-400 mt-1 ml-1">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-white text-black py-3.5 rounded-xl font-bold hover:bg-zinc-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              <>
                Sign In <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
        <p className="mt-8 text-center text-sm text-zinc-500">
          Don't have an account?{' '}
          <Link href="/register" className="text-white font-bold hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}