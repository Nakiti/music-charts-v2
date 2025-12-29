'use client';

import { useState, useEffect } from 'react';
import { Check, X, Play, ExternalLink, Download, Upload } from 'lucide-react';

interface ScrapedTrack {
  url: string;
  title: string;
  artist: string;
  genre: string;
  thumbnail: string;
  duration: number;
  playCount: number;
  likes: number;
  scrapedAt: string;
  approved?: boolean;
  rejected?: boolean;
  rejectionReason?: string;
  imported?: boolean;
  importedAt?: string;
}

export default function ReviewTracksPage() {
  const [tracks, setTracks] = useState<ScrapedTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingAll, setApprovingAll] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadTracks();
  }, []);

  const loadTracks = async () => {
    try {
      const response = await fetch('/api/admin/scraped-tracks');
      if (response.ok) {
        const data = await response.json();
        setTracks(data);
      } else {
        console.error('Failed to load tracks');
      }
    } catch (error) {
      console.error('Error loading tracks:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateTrack = async (url: string, updates: Partial<ScrapedTrack>) => {
    try {
      const response = await fetch('/api/admin/scraped-tracks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, ...updates })
      });

      if (response.ok) {
        // Update local state
        setTracks(prev => prev.map(track => 
          track.url === url ? { ...track, ...updates } : track
        ));
      }
    } catch (error) {
      console.error('Error updating track:', error);
    }
  };

  const approveTrack = (track: ScrapedTrack) => {
    updateTrack(track.url, { 
      approved: true, 
      rejected: false, 
      rejectionReason: undefined 
    });
  };

  const rejectTrack = (track: ScrapedTrack, reason?: string) => {
    updateTrack(track.url, { 
      approved: false, 
      rejected: true, 
      rejectionReason: reason || 'Rejected by reviewer' 
    });
  };

  const approveAllPending = async () => {
    const pendingTracks = tracks.filter(t => !t.approved && !t.rejected);
    
    if (pendingTracks.length === 0) {
      alert('No pending tracks to approve.');
      return;
    }

    const confirmed = confirm(
      `Are you sure you want to approve all ${pendingTracks.length} pending track${pendingTracks.length !== 1 ? 's' : ''}?`
    );

    if (!confirmed) return;

    setApprovingAll(true);

    try {
      // Batch approve all pending tracks
      const updates = pendingTracks.map(track => 
        updateTrack(track.url, { 
          approved: true, 
          rejected: false, 
          rejectionReason: undefined 
        })
      );

      await Promise.all(updates);
    } finally {
      setApprovingAll(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Filter tracks
  const filteredTracks = tracks.filter(track => {
    // Status filter
    if (filter === 'pending' && (track.approved !== undefined || track.rejected)) return false;
    if (filter === 'approved' && !track.approved) return false;
    if (filter === 'rejected' && !track.rejected) return false;

    // Genre filter
    if (selectedGenre !== 'all' && track.genre !== selectedGenre) return false;

    // Search filter
    if (searchTerm && !track.title.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !track.artist.toLowerCase().includes(searchTerm.toLowerCase())) return false;

    return true;
  });

  const genres = Array.from(new Set(tracks.map(t => t.genre))).sort();
  const pendingCount = tracks.filter(t => !t.approved && !t.rejected).length;
  const approvedCount = tracks.filter(t => t.approved).length;
  const rejectedCount = tracks.filter(t => t.rejected).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading tracks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Review Scraped Tracks</h1>
          <p className="text-gray-600">
            Review and approve tracks before importing them to Firestore
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-600">Total Tracks</div>
            <div className="text-2xl font-bold text-gray-900">{tracks.length}</div>
          </div>
          <div className="bg-yellow-50 rounded-lg shadow-sm p-4 border border-yellow-200">
            <div className="text-sm text-yellow-700">Pending</div>
            <div className="text-2xl font-bold text-yellow-900">{pendingCount}</div>
          </div>
          <div className="bg-green-50 rounded-lg shadow-sm p-4 border border-green-200">
            <div className="text-sm text-green-700">Approved</div>
            <div className="text-2xl font-bold text-green-900">{approvedCount}</div>
          </div>
          <div className="bg-red-50 rounded-lg shadow-sm p-4 border border-red-200">
            <div className="text-sm text-red-700">Rejected</div>
            <div className="text-2xl font-bold text-red-900">{rejectedCount}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status Filter
              </label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Tracks</option>
                <option value="pending">Pending Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Genre
              </label>
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Genres</option>
                {genres.map(genre => (
                  <option key={genre} value={genre}>{genre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by title or artist..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          {/* Approve All Button */}
          {pendingCount > 0 && (
            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={approveAllPending}
                disabled={approvingAll}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {approvingAll ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Approving...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Approve All Pending ({pendingCount})
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Tracks List */}
        <div className="space-y-4">
          {filteredTracks.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <p className="text-gray-500 text-lg">No tracks found matching your filters.</p>
            </div>
          ) : (
            filteredTracks.map((track) => (
              <div
                key={track.url}
                className={`bg-white rounded-lg shadow-sm p-6 ${
                  track.approved ? 'border-l-4 border-green-500' : 
                  track.rejected ? 'border-l-4 border-red-500' : 
                  'border-l-4 border-yellow-500'
                }`}
              >
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Thumbnail */}
                  <div className="flex-shrink-0">
                    {track.thumbnail ? (
                      <img
                        src={track.thumbnail}
                        alt={track.title}
                        className="w-32 h-32 object-cover rounded-lg"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/placeholder-cover.png';
                        }}
                      />
                    ) : (
                      <div className="w-32 h-32 bg-gray-200 rounded-lg flex items-center justify-center">
                        <Play className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Track Info */}
                  <div className="flex-grow">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">{track.title}</h3>
                        <p className="text-gray-600">{track.artist}</p>
                      </div>
                      <div className="flex gap-2">
                        {track.approved && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                            Approved
                          </span>
                        )}
                        {track.rejected && (
                          <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded">
                            Rejected
                          </span>
                        )}
                        {track.imported && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                            Imported
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                      <div>
                        <span className="text-gray-500">Genre:</span>
                        <span className="ml-2 font-medium">{track.genre}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Duration:</span>
                        <span className="ml-2 font-medium">{formatDuration(track.duration)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Plays:</span>
                        <span className="ml-2 font-medium">{formatNumber(track.playCount)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Likes:</span>
                        <span className="ml-2 font-medium">{formatNumber(track.likes)}</span>
                      </div>
                    </div>

                    {track.rejectionReason && (
                      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-sm text-red-800">
                          <strong>Rejection Reason:</strong> {track.rejectionReason}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center gap-4">
                      <a
                        href={track.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Open on SoundCloud
                      </a>
                      {!track.approved && !track.rejected && (
                        <>
                          <button
                            onClick={() => approveTrack(track)}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
                          >
                            <Check className="w-4 h-4" />
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              const reason = prompt('Rejection reason (optional):');
                              rejectTrack(track, reason || undefined);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition"
                          >
                            <X className="w-4 h-4" />
                            Reject
                          </button>
                        </>
                      )}
                      {track.approved && !track.rejected && (
                        <button
                          onClick={() => updateTrack(track.url, { approved: false, rejected: false })}
                          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition"
                        >
                          Undo Approval
                        </button>
                      )}
                      {track.rejected && (
                        <button
                          onClick={() => updateTrack(track.url, { rejected: false, rejectionReason: undefined })}
                          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition"
                        >
                          Undo Rejection
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Actions */}
        {approvedCount > 0 && (
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-blue-900 mb-1">
                  Ready to Import
                </h3>
                <p className="text-blue-700 text-sm">
                  {approvedCount} track{approvedCount !== 1 ? 's' : ''} approved and ready for import
                </p>
              </div>
              <div className="text-sm text-blue-600">
                Run: <code className="bg-blue-100 px-2 py-1 rounded">npm run import-approved-tracks</code>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


