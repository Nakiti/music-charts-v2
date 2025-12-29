"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Upload, LayoutGrid, Compass, User, Zap } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const {user, profile, loading} = useCurrentUser()

  console.log("user ", profile)

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname === href || pathname.startsWith(href + '/');
  };

  const navBaseClasses =
    'flex items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-full transition-all';

  const navActiveClasses = 'text-white bg-white/10 shadow-sm';
  const navInactiveClasses = 'text-zinc-400 hover:text-white hover:bg-white/5';

  const handleLoginClick = () => {
    setProfileOpen(false);
    router.push('/login');
  };

  const handleLogoutClick = async () => {
    setProfileOpen(false);
    try {
      await logout();
    } catch (err) {
      console.error('Failed to logout', err);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-20 bg-black backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-6 md:px-12">
      {/* Left: Brand */}
      <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-gradient-to-br from-white to-sky-500 rounded-lg flex items-center justify-center transform group-hover:rotate-12 transition-transform shadow-lg shadow-sky-900/20">
            <Zap className="w-5 h-5 text-black fill-current" />
          </div>
          <span className="text-xl font-black tracking-tighter text-white">
            SOUND
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-sky-400">
              BOARD
            </span>
          </span>
        </Link>

      {/* Middle: Navigation Links */}
      {/* Hidden on mobile, visible on md+ */}
      <nav className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:flex items-center p-1 bg-white/5 rounded-full border border-white/5 backdrop-blur-md shadow-xl">
        <Link
          href="/charts"
          className={`${navBaseClasses} ${
            isActive('/charts') ? navActiveClasses : navInactiveClasses
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          Charts
        </Link>
        <Link
          href="/discover"
          className={`${navBaseClasses} ${
            isActive('/discover') ? navActiveClasses : navInactiveClasses
          }`}
        >
          <Compass className="w-4 h-4" />
          Discover
        </Link>
        <Link
          href={`/u/${profile && profile.username}`}
          className={`${navBaseClasses} ${
            isActive('/u') ? navActiveClasses : navInactiveClasses
          }`}
        >
          <User className="w-4 h-4" />
          Profile
        </Link>
      </nav>

      {/* Right: Upload Action + Profile */}
      <div className="flex items-center gap-4">
        <Link
          href="/studio"
          className="flex items-center gap-2 px-3 md:px-5 py-2.5 bg-white text-black rounded-full text-sm font-bold hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] group"
        >
          <Upload className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
          <span className="hidden md:inline">Upload Track</span>
        </Link>

        <div className="relative">
          <button
            type="button"
            onClick={() => setProfileOpen((open) => !open)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10 transition-colors"
          >
            <User className="w-4 h-4" />
          </button>
          {profileOpen && (
            <div className="absolute right-0 mt-2 w-32 rounded-lg border border-white/10 bg-zinc-900/95 shadow-lg backdrop-blur-md py-1">
              {user ? (
                <button
                  type="button"
                  onClick={handleLogoutClick}
                  className="block w-full px-3 py-1.5 text-left text-sm text-zinc-100 hover:bg-white/10"
                >
                  Logout
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleLoginClick}
                  className="block w-full px-3 py-1.5 text-left text-sm text-zinc-100 hover:bg-white/10"
                >
                  Login
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
