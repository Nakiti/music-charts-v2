"use client";

import React from 'react';
import Link from 'next/link';
import { Music2 } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-black border-t border-white/5 mt-auto">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-zinc-500 text-sm">
            © {currentYear} SoundBoard. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm">
            <Link 
              href="/contact" 
              className="text-zinc-400 hover:text-white transition-colors"
            >
              Contact
            </Link>
            <div className="flex items-center gap-2 text-zinc-500">
              <Music2 className="w-4 h-4" />
              <span>Made with ♥ for artists</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
