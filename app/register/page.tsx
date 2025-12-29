"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, ArrowRight, Chrome, User, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { validateUsername } from '@/lib/validation';

export default function RegisterPage() {
    const router = useRouter();
    const { loginWithGoogle, registerWithEmail } = useAuth();

    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [usernameError, setUsernameError] = useState<string | null>(null);

    // Validate username on change
    const handleUsernameChange = (value: string) => {
        setUsername(value);
        if (value.length > 0) {
            const validation = validateUsername(value);
            setUsernameError(validation.valid ? null : validation.error || null);
        } else {
            setUsernameError(null);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Final validation before submit
        const usernameValidation = validateUsername(username);
        if (!usernameValidation.valid) {
            setError(usernameValidation.error || 'Invalid username');
            return;
        }

        setIsLoading(true);

        try {
            await registerWithEmail(email, password, username.trim());
            router.push('/charts');
        } catch (err: any) {
        console.error('Register failed', err);
        
        let msg = 'Registration failed.';
        if (err.message.includes('Username is already taken')) {
            msg = 'That username is already taken.';
        } else if (err.code === 'auth/email-already-in-use') {
            msg = 'Email is already in use.';
        } else if (err.code === 'auth/weak-password') {
            msg = 'Password should be at least 6 characters.';
        }
        setError(msg);
        } finally {
        setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-sky-500/30 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-br from-white/10 to-sky-600/20 blur-[120px] rounded-full pointer-events-none" />
            <div className="w-full max-w-md bg-zinc-900/80 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl relative z-10 animate-in fade-in zoom-in duration-500">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-black tracking-tight mb-2">Create Account</h1>
                <p className="text-zinc-400 text-sm">Join the community. Break the charts.</p>
            </div>
            <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider ml-1">Username</label>
                    <div className="relative group">
                    <User className="absolute left-3 top-3.5 w-5 h-5 text-zinc-500 group-focus-within:text-white transition-colors" />
                    <input 
                        type="text" 
                        value={username}
                        onChange={(e) => handleUsernameChange(e.target.value)}
                        className={`w-full bg-zinc-950/50 border rounded-xl py-3 pl-10 pr-4 text-white placeholder-zinc-600 focus:outline-none transition-all ${
                            usernameError 
                                ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500' 
                                : 'border-white/10 focus:border-sky-500 focus:ring-1 focus:ring-sky-500'
                        }`}
                        placeholder="cool_artist_123"
                        required
                    />
                    </div>
                    {usernameError && (
                        <p className="text-xs text-red-400 ml-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {usernameError}
                        </p>
                    )}
                    <p className="text-xs text-zinc-500 ml-1">
                        3-20 characters, letters, numbers, _ and - only
                    </p>
                </div>
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
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider ml-1">Password</label>
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
                    <p className="text-sm text-red-400 mt-1 ml-1">{error}</p>
                )}
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-white to-sky-500 hover:from-white hover:to-sky-400 text-black py-3.5 rounded-xl font-bold active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4 shadow-lg shadow-sky-900/20 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                    <>Create Account <ArrowRight className="w-4 h-4" /></>
                    )}
                </button>
            </form>
            <p className="mt-8 text-center text-sm text-zinc-500">
                Already have an account?{' '}
                <Link href="/login" className="text-white font-bold hover:underline">
                    Sign In
                </Link>
            </p>
        </div>
        </div>
    );
}