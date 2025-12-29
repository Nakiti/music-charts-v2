import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

const SCRAPED_TRACKS_FILE = path.join(process.cwd(), 'scripts', 'scraped-tracks.json');

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

function loadTracks(): ScrapedTrack[] {
  if (!fs.existsSync(SCRAPED_TRACKS_FILE)) {
    return [];
  }

  try {
    const content = fs.readFileSync(SCRAPED_TRACKS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Error loading tracks:', error);
    return [];
  }
}

function saveTracks(tracks: ScrapedTrack[]): void {
  try {
    fs.writeFileSync(SCRAPED_TRACKS_FILE, JSON.stringify(tracks, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving tracks:', error);
    throw error;
  }
}

export async function GET(request: NextRequest) {
  try {
    const tracks = loadTracks();
    return NextResponse.json(tracks);
  } catch (error) {
    console.error('Error in GET /api/admin/scraped-tracks:', error);
    return NextResponse.json(
      { error: 'Failed to load tracks' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, ...updates } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    const tracks = loadTracks();
    const trackIndex = tracks.findIndex(t => t.url === url);

    if (trackIndex === -1) {
      return NextResponse.json(
        { error: 'Track not found' },
        { status: 404 }
      );
    }

    tracks[trackIndex] = {
      ...tracks[trackIndex],
      ...updates
    };

    saveTracks(tracks);

    return NextResponse.json({ success: true, track: tracks[trackIndex] });
  } catch (error) {
    console.error('Error in PATCH /api/admin/scraped-tracks:', error);
    return NextResponse.json(
      { error: 'Failed to update track' },
      { status: 500 }
    );
  }
}


