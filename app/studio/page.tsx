"use client";

import React, { useState, useEffect } from 'react';
import { useGenres } from '@/hooks/useGenres';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import ShareModal from '@/components/Studio/ShareModal';
import { useRouter } from 'next/navigation';
import { useTrackActions } from '@/hooks/useTrackActions';
import { validateTrackTitle, validateArtistName } from '@/lib/validation';
import { 
  Upload, Music, Link as LinkIcon, 
  Clock, CheckCircle2, AlertCircle, 
  Loader2, CloudLightning, X, Copy, Share2, Twitter
} from 'lucide-react';

const isValidSoundCloudUrl = (url: string) => {
  const pattern = /^https?:\/\/(soundcloud\.com|snd\.sc)\/(.*)$/;
  return pattern.test(url);
};

const parseTrackInfo = (url: string) => {
  const parts = url.split('/');
  let title = parts.pop() || '';
  title = title.split('?')[0];
  title = title.replace(/-/g, ' '); 
  return title.trim().length > 0 ? title : '';
};


export default function StudioPage() {
  const router = useRouter();
  const { genres, loading: genresLoading } = useGenres();
  const { uploadTrack, loading: uploadLoading } = useTrackActions();
  const {profile, user, loading: authLoading} = useCurrentUser()

  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState(profile?.username || ''); 
  const [selectedGenre, setSelectedGenre] = useState('');
  const [dropTime, setDropTime] = useState(0); 
  
  const [isValidLink, setIsValidLink] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [artistError, setArtistError] = useState<string | null>(null);

  const [showShareModal, setShowShareModal] = useState(false);
  const [uploadedTrackId, setUploadedTrackId] = useState<string | null>(null);
  const [uploadedTrackTitle, setUploadedTrackTitle] = useState<string>('');
  const [uploadedTrackSlug, setUploadedTrackSlug] = useState<string>('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
    if (user && user.displayName && !artist) {
      setArtist(user.displayName);
    }

    setArtist(profile?.username)
  }, [user, authLoading, router, artist, profile]);

  useEffect(() => {
    if (isValidSoundCloudUrl(url)) {
      setIsValidLink(true);
      setError(null);
      
      const parsedTitle = parseTrackInfo(url);
      if (parsedTitle && !title) {
          setTitle(parsedTitle);
      }
      
    } else if (url.length > 0) {
      setIsValidLink(false);
    } else {
      setIsValidLink(false);
    }
  }, [url, title]);

  // Validate title on change
  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (value.trim().length > 0) {
      const validation = validateTrackTitle(value);
      setTitleError(validation.valid ? null : validation.error || null);
    } else {
      setTitleError(null);
    }
  };

  // Validate artist on change
  const handleArtistChange = (value: string) => {
    setArtist(value);
    if (value.trim().length > 0) {
      const validation = validateArtistName(value);
      setArtistError(validation.valid ? null : validation.error || null);
    } else {
      setArtistError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Ensure user is authenticated before submitting
    if (!user) {
      setError("You must be logged in to upload tracks.");
      router.push('/login');
      return;
    }
    
    const trimmedUrl = url.trim();
    const trimmedTitle = title.trim();
    const trimmedArtist = artist.trim();

    if (!trimmedUrl) {
      setError("Please paste a SoundCloud link.");
      return;
    }

    if (!isValidSoundCloudUrl(trimmedUrl)) {
      setError("Please enter a valid SoundCloud URL (soundcloud.com or snd.sc).");
      return;
    }

    if (!trimmedTitle) {
      setError("Please enter a track title.");
      return;
    }

    // Validate track title
    const titleValidation = validateTrackTitle(trimmedTitle);
    if (!titleValidation.valid) {
      setError(titleValidation.error || "Invalid track title.");
      return;
    }

    if (!trimmedArtist) {
      setError("Please enter an artist name.");
      return;
    }

    // Validate artist name
    const artistValidation = validateArtistName(trimmedArtist);
    if (!artistValidation.valid) {
      setError(artistValidation.error || "Invalid artist name.");
      return;
    }

    if (!selectedGenre) {
      setError("Please select a genre for your track.");
      return;
    }

    if (dropTime < 0 || dropTime > 180) {
      setError("Drop time must be between 0 and 180 seconds.");
      return;
    }

    setError(null);

    try {
      const trackId = await uploadTrack({
        title: trimmedTitle,
        artist: trimmedArtist || 'Unknown Artist',
        genre: selectedGenre,
        cover: '', 
        provider: 'SOUNDCLOUD',
        externalId: trimmedUrl, 
        dropTime: Math.floor(dropTime), 
      });
      
      setUploadedTrackId(trackId);
      setUploadedTrackTitle(title);
      // Note: We don't have the slug here directly, so ShareModal will generate it
      setShowShareModal(true);
      
      setUrl('');
      setTitle('');
      setSelectedGenre('');
      
    } catch (err: any) {
      console.error("Upload failed", err);
      setError(err.message || "Failed to launch track. Please check the console.");
    }
  };

  if (authLoading || genresLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
      </div>
    );
  }

  // If not authenticated after loading, show nothing (redirect is happening)
  if (!authLoading && !user) {
    return null;
  }

  const embedSrc = isValidLink 
    ? `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23ff5500&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=true&visual=true#t=${dropTime * 1000}` // #t=milliseconds for seeking
    : '';

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-sky-500/30 pb-20">
      <div className="max-w-6xl mx-auto px-6 mt-0 grid grid-cols-1 lg:grid-cols-2 gap-16">
        <div className="space-y-8 animate-in slide-in-from-left-4 fade-in duration-500">
          <div>
            <h1 className="text-5xl font-black tracking-tighter mb-2 text-white">Upload Track</h1>
            <p className="text-zinc-400 text-lg">Submit your SoundCloud heat to the Arena.</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-8">            
            <div className="space-y-3">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">SoundCloud Link</label>
              <div className={`flex items-center gap-4 bg-zinc-900 border ${isValidLink ? 'border-sky-500/50' : 'border-zinc-800'} rounded-2xl px-5 py-4 focus-within:border-sky-500 transition-all shadow-inner`}>
                <LinkIcon className={`w-5 h-5 ${isValidLink ? 'text-sky-500' : 'text-zinc-500'}`} />
                <input 
                  type="text" 
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://soundcloud.com/artist/track"
                  className="bg-transparent border-none outline-none text-white w-full font-medium placeholder-zinc-600 text-lg"
                  required
                />
                {isValidLink && <CheckCircle2 className="w-6 h-6 text-green-500 animate-in zoom-in duration-300" />}
              </div>
              {!isValidLink && url.length > 0 && (
                <p className="text-xs text-red-400 pl-2">Please enter a valid SoundCloud URL.</p>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Track Title (Auto-Filled)</label>
                <input 
                  type="text" 
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="e.g. Coffee Whiskey"
                  className={`w-full bg-zinc-900 border rounded-2xl px-5 py-4 text-white outline-none transition-colors ${
                    titleError ? 'border-red-500 focus:border-red-500' : 'border-zinc-800 focus:border-sky-500'
                  }`}
                  required
                />
                {titleError && (
                  <p className="text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {titleError}
                  </p>
                )}
                <p className="text-xs text-zinc-500">
                  Letters, numbers, spaces, and basic punctuation only
                </p>
              </div>
              <div className="space-y-3">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Artist Name</label>
                <input 
                  type="text" 
                  value={artist}
                  onChange={(e) => handleArtistChange(e.target.value)}
                  placeholder="e.g. M83"
                  className={`w-full bg-zinc-900 border rounded-2xl px-5 py-4 text-white outline-none transition-colors ${
                    artistError ? 'border-red-500 focus:border-red-500' : 'border-zinc-800 focus:border-sky-500'
                  }`}
                  required
                />
                {artistError && (
                  <p className="text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {artistError}
                  </p>
                )}
                <p className="text-xs text-zinc-500">
                  Letters, numbers, spaces, and basic punctuation only
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Genre</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {genres.map((g: any) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setSelectedGenre(g.id)}
                    className={`px-4 py-3 rounded-xl text-sm font-bold border transition-all hover:scale-105 active:scale-95 ${
                      selectedGenre === g.id 
                      ? 'bg-white text-black border-white shadow-lg' 
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600 hover:text-white'
                    }`}
                  >
                    {g.title}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-4 pt-6 border-t border-white/5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                  <Clock className="w-4 h-4 text-sky-500" /> Start Time (The Drop)
                </label>
                <span className="text-sky-400 font-mono text-sm bg-sky-500/10 px-2 py-1 rounded border border-sky-500/20">{dropTime}s</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="180" 
                value={dropTime} 
                onChange={(e) => setDropTime(parseInt(e.target.value))}
                className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-sky-500 hover:accent-sky-400 transition-all"
              />
              <p className="text-xs text-zinc-500 leading-relaxed">
                Pick the exact moment the energy hits. Voters in the Arena will start listening from this point.
              </p>
            </div>
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-sm text-red-400">
                <AlertCircle className="w-5 h-5 shrink-0" /> {error}
              </div>
            )}
            <button 
              type="submit" 
              disabled={!isValidLink || !title || !artist || !selectedGenre || uploadLoading || !!titleError || !!artistError}
              className="w-full py-5 bg-gradient-to-r from-white to-sky-500 hover:from-white hover:to-sky-400 text-black font-black text-xl uppercase tracking-widest rounded-2xl shadow-xl shadow-sky-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] mt-4"
            >
              {uploadLoading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : 'Launch Track'}
            </button>
          </form>
        </div>
        <div className="hidden lg:block pt-20">
          <div className="sticky top-32 space-y-6">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest text-center">Live Preview</h3>
            <div className="relative aspect-video w-full bg-zinc-900 rounded-3xl border border-white/10 overflow-hidden shadow-2xl flex flex-col items-center justify-center group hover:border-white/20 transition-colors">
              {isValidLink ? (
                <iframe
                  key={url} 
                  width="100%"
                  height="100%"
                  scrolling="no"
                  frameBorder="no"
                  allow="autoplay"
                  src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23ff5500&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=true&visual=true`}
                  className="w-full h-full"
                ></iframe>
              ) : (
                <div className="flex flex-col items-center justify-center text-zinc-700 p-8 text-center animate-pulse">
                  <CloudLightning className="w-24 h-24 mb-6 opacity-20" />
                  <p className="font-bold text-lg text-zinc-600">No Track Selected</p>
                  <p className="text-sm mt-2 max-w-xs">Paste a valid SoundCloud link to generate the preview card.</p>
                </div>
              )}
            </div>
            {isValidLink && (
               <div className="text-center space-y-2">
                 <p className="text-white font-bold">{title || "Track Title"}</p>
                 <p className="text-zinc-500 text-sm">{artist || "Artist Name"}</p>
                 <div className="inline-block px-3 py-1 bg-zinc-900 rounded-full text-xs font-mono text-sky-500 border border-sky-500/20 mt-2">
                    Starts at {dropTime}s
                 </div>
               </div>
            )}
          </div>
        </div>
      </div>
      
        {showShareModal && uploadedTrackId && (
          <ShareModal 
              trackId={uploadedTrackId} 
              trackTitle={uploadedTrackTitle}
              uploaderUsername={profile?.username || 'unknown-user'}
              onClose={() => setShowShareModal(false)}
          />
      )}
    </div>
  );
}