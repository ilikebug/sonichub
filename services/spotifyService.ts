import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import { Song, MusicPlatform } from '../types';
import { audioEvents } from '../lib/audioEvents';

// Helper function to format duration from milliseconds to MM:SS
function formatDuration(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Helper function to convert Spotify Track to Song
function convertTrackToSong(track: any): Song {
    return {
        id: track.id,
        title: track.name,
        artist: track.artists.map((a: any) => a.name).join(', '),
        album: track.album.name,
        coverUrl: track.album.images[0]?.url || `https://picsum.photos/seed/${track.id}/300/300`,
        duration: formatDuration(track.duration_ms),
        platform: MusicPlatform.Spotify,
        audioUrl: '', // 将在播放时从 YouTube 获取
        spotifyUri: track.uri,
        previewUrl: track.preview_url || undefined
    };
}

class SpotifyService {
    private api: SpotifyApi | null = null;
    private initPromise: Promise<void> | null = null;

    constructor() {
        this.initPromise = this.initialize();
    }

    private async initialize() {
        try {
            // 优先使用运行时环境变量（不带 NEXT_PUBLIC_ 前缀），然后再尝试构建时变量
            const clientId = process.env.SPOTIFY_CLIENT_ID || process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
            const clientSecret = process.env.SPOTIFY_CLIENT_SECRET || process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_SECRET;

            if (!clientId || !clientSecret) {
                console.error('Spotify credentials not found in environment variables');
                console.error('Please set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET');
                return;
            }

            console.log('✅ Spotify credentials found, initializing API...');
            this.api = SpotifyApi.withClientCredentials(clientId, clientSecret);
        } catch (error) {
            console.error('Failed to initialize Spotify API:', error);
        }
    }

    private async ensureInitialized() {
        if (this.initPromise) {
            await this.initPromise;
        }
        if (!this.api) {
            throw new Error('Spotify API not initialized. Please check your credentials.');
        }
    }

    /**
     * Search for music tracks, artists, or albums
     */
    async searchMusic(query: string, limit: number = 20, offset: number = 0): Promise<Song[]> {
        if (!query.trim()) return [];

        try {
            await this.ensureInitialized();

            const results = await this.api!.search(query, ['track'], undefined, Math.min(limit, 50) as any, offset);

            if (!results.tracks?.items) {
                return [];
            }

            return results.tracks.items.map(convertTrackToSong);
        } catch (error) {
            console.error('Spotify Search Error:', error);
            throw new Error('Failed to search music. Please check your API credentials.');
        }
    }

    /**
   * Get new releases for Explore view
   */
    async getNewReleases(limit: number = 20, offset: number = 0): Promise<Song[]> {
        try {
            await this.ensureInitialized();

            // Use search with trending keywords as fallback
            const trendingQueries = ['trending 2024', 'top hits', 'new music', 'popular now'];
            const randomQuery = trendingQueries[Math.floor(Math.random() * trendingQueries.length)];

            const results = await this.api!.search(randomQuery, ['track'], undefined, Math.min(limit, 50) as any, offset);

            if (!results.tracks?.items) {
                return [];
            }

            return results.tracks.items.map(convertTrackToSong);
        } catch (error) {
            console.error('Get New Releases Error:', error);
            return [];
        }
    }

    /**
     * Get recommendations for Radio view
     */
    async getRecommendations(limit: number = 20, offset: number = 0): Promise<Song[]> {
        try {
            await this.ensureInitialized();

            // Use genre-based searches for radio-style content
            const genres = ['lo-fi', 'jazz', 'rock', 'electronic', 'pop', 'indie', 'classical'];
            const randomGenre = genres[Math.floor(Math.random() * genres.length)];

            const results = await this.api!.search(`${randomGenre} music`, ['track'], undefined, Math.min(limit, 50) as any, offset);

            if (!results.tracks?.items) {
                return [];
            }

            return results.tracks.items.map(convertTrackToSong);
        } catch (error) {
            console.error('Get Recommendations Error:', error);
            return [];
        }
    }

    /**
     * Get featured content for Artists view
     */
    async getFeaturedPlaylists(limit: number = 20, offset: number = 0): Promise<Song[]> {
        try {
            await this.ensureInitialized();

            // Search for popular artists
            const artists = ['Taylor Swift', 'The Weeknd', 'Ed Sheeran', 'Billie Eilish', 'Drake'];
            const randomArtist = artists[Math.floor(Math.random() * artists.length)];

            const results = await this.api!.search(randomArtist, ['track'], undefined, Math.min(limit, 50) as any, offset);

            if (!results.tracks?.items) {
                return [];
            }

            return results.tracks.items.map(convertTrackToSong);
        } catch (error) {
            console.error('Get Featured Content Error:', error);
            return [];
        }
    }

    /**
     * Check if a track is available (returns Spotify link)
     */
    async checkAvailability(song: Song): Promise<string> {
        return `Available on Spotify: https://open.spotify.com/track/${song.id}`;
    }

    /**
     * Get YouTube audio URL for a song (完整版，带缓存检查和重试)
     */
    async getAudioUrl(song: Song, retryCount: number = 0): Promise<{ url: string, isPreview: boolean, error?: string }> {
        const maxRetries = 2; // 最多重试2次
        
        try {
            // 首次尝试时，先检查缓存
            if (retryCount === 0) {
                console.log('🔍 Checking cache first...');
                
                try {
                    const cacheResponse = await fetch(
                        `/api/youtube/check-cache?title=${encodeURIComponent(song.title)}&artist=${encodeURIComponent(song.artist)}`,
                        { signal: AbortSignal.timeout(5000) }
                    );
                    
                    if (cacheResponse.ok) {
                        const cacheData = await cacheResponse.json();
                        
                        if (cacheData.cached) {
                            console.log('✅ Found in cache! Using cached audio');
                            return { url: cacheData.audioUrl, isPreview: false };
                        }
                        
                        console.log('⚠️ Not in cache, searching YouTube...');
                    }
                } catch (cacheError) {
                    console.warn('⚠️ Cache check failed, proceeding to YouTube search');
                }
            }
            
            console.log(`🎵 Fetching audio from YouTube (attempt ${retryCount + 1}/${maxRetries + 1})...`);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 25000); // 25秒超时
            
            const response = await fetch(
                `/api/youtube/audio?title=${encodeURIComponent(song.title)}&artist=${encodeURIComponent(song.artist)}`,
                { signal: controller.signal }
            );
            
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            if (data.audioUrl) {
                console.log('✅ Got full audio from YouTube');
                return { url: data.audioUrl, isPreview: false };
            }
            
            throw new Error('No audio URL in response');
            
        } catch (error: any) {
            console.error(`❌ Attempt ${retryCount + 1} failed:`, error.message);
            
            // 如果还有重试次数，则重试
            if (retryCount < maxRetries) {
                const waitSeconds = (retryCount + 1) * 2;
                const message = `获取失败，${waitSeconds}秒后重试 (${retryCount + 1}/${maxRetries})...`;
                console.log(`🔄 ${message}`);
                audioEvents.emit('retry', { attempt: retryCount + 1, maxRetries, waitSeconds });
                
                await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000));
                return this.getAudioUrl(song, retryCount + 1);
            }
            
            // 所有重试都失败，降级到预览
            console.warn('⚠️ All attempts failed, using Spotify preview (30s)');
            if (song.previewUrl) {
                return { 
                    url: song.previewUrl, 
                    isPreview: true,
                    error: `YouTube unavailable: ${error.message}`
                };
            }
            
            return { 
                url: '', 
                isPreview: false,
                error: `No audio available: ${error.message}`
            };
        }
    }
}

export const spotifyService = new SpotifyService();
