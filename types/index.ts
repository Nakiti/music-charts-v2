export interface Track {
    id: string;
    title: string;
    artist: string;
    cover: string;
    genre: string;
    status: 'ACTIVE' | 'PENDING' | 'BANNED';
    uploaderId: string;
    createdAt: any;
    slug?: string; // URL-friendly slug for the track (unique per user)
    stats: {
      votesFire: number;
      votesPass: number;
      totalVotes: number;
      wilsonScore: number;
      trendScore: number;
    };
    meta?: {
      title: string;
      artist: string;
      cover: string;
      genre: string;
      provider?: 'YOUTUBE' | 'SOUNDCLOUD';
      externalId?: string;
      dropTime?: number;
    };
    metadata?: {
      provider: 'YOUTUBE' | 'SOUNDCLOUD';
      externalId: string;
      dropTime: number;
      cover: string;
    };
    chart?: any;
    displayStats?: any;
    peak?: number;
    streak?: string;
    movement?: number;
    velocity?: string;
    uploaderUsername?: string;
}
  
export interface ChartData {
    period: string;
    genre: string;
    tracks: Track[];
}

export interface Genre {
    id: string;
    title: string;
    description?: string;
    order: number;
    theme: {
      color: string; // e.g. "from-purple-500 to-blue-500"
      icon?: string;
    };
}