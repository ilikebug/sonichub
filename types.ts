export enum MusicPlatform {
  Spotify = 'Spotify',
  YouTube = 'YouTube',
  NetEase = 'NetEase',
  Bilibili = 'Bilibili',
  QQMusic = 'QQMusic'
}

export type ViewType = 'search' | 'explore' | 'radio' | 'artists' | 'favorites' | 'albums' | 'downloads';

export type PlayMode = 'sequential' | 'loop' | 'loop-one' | 'shuffle';

export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  coverUrl: string;
  audioUrl?: string;
  duration: string;
  platform: MusicPlatform;
  platformIcon?: string;
  spotifyUri?: string;      // Spotify URI for deep linking
  previewUrl?: string;      // Spotify 30-second preview URL
}

export interface PlayerState {
  currentSong: Song | null;
  isPlaying: boolean;
  volume: number;
  progress: number; // 0 to 100
  queue: Song[];
}

export interface SearchState {
  query: string;
  results: Song[];
  isLoading: boolean;
  error: string | null;
}