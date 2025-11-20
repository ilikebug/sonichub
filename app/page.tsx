'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Player } from '@/components/Player';
import { Icons } from '@/components/Icons';
import { SongCard } from '@/components/SongCard';
import { Song, ViewType } from '@/types';
import { spotifyService } from '@/services/spotifyService';

// Toast helper component within App
const Toast = ({ message, onClose }: { message: string, onClose: () => void }) => (
    <div className="fixed top-6 right-6 bg-gray-900 border border-purple-500/30 text-white px-4 py-3 rounded-lg shadow-2xl shadow-purple-500/10 flex items-center gap-3 animate-fade-in-down z-[60]">
        <Icons.CheckCircle className="text-green-400" size={20} />
        <span className="text-sm font-medium">{message}</span>
    </div>
);

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [currentView, setCurrentView] = useState<ViewType>('explore'); // Default to Explore
  const [query, setQuery] = useState('');
  
  // Content State
  const [songs, setSongs] = useState<Song[]>([]);
  const [likedSongs, setLikedSongs] = useState<Song[]>([]);
  const [downloadedSongs, setDownloadedSongs] = useState<Song[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 本地存储 key
  const FAVORITES_KEY = 'sonichub_favorites';

  // 从 localStorage 加载收藏
  const loadFavorites = () => {
    try {
      const stored = localStorage.getItem(FAVORITES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load favorites:', error);
      return [];
    }
  };

  // 确保只在客户端渲染
  useEffect(() => {
    setMounted(true);
    // 加载收藏列表
    setLikedSongs(loadFavorites());

    // 监听 storage 事件，当 Player 组件改变收藏时同步更新
    const handleStorageChange = () => {
      setLikedSongs(loadFavorites());
    };
    
    window.addEventListener('storage', handleStorageChange);
    // 自定义事件用于同一页面内的更新
    window.addEventListener('favoritesChanged', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('favoritesChanged', handleStorageChange);
    };
  }, []);

  // Handle View Switching
  const handleViewChange = async (newView: ViewType) => {
    setCurrentView(newView);
    setQuery(''); // Clear search when switching tabs

    if (newView === 'favorites') {
      setSongs(likedSongs);
      return;
    }
    
    if (newView === 'downloads') {
      setSongs(downloadedSongs);
      return;
    }

    if (newView === 'albums') {
        setSongs([]); // Placeholder
        return;
    }

    // Fetch content from Gemini for discovery views
    if (['explore', 'radio', 'artists'].includes(newView)) {
      setIsLoading(true);
      try {
        // Call appropriate Spotify service method based on view
        let results: Song[] = [];
        if (newView === 'explore') {
          results = await spotifyService.getNewReleases();
        } else if (newView === 'radio') {
          results = await spotifyService.getRecommendations();
        } else if (newView === 'artists') {
          results = await spotifyService.getFeaturedPlaylists();
        }
        setSongs(results || []);
      } catch (error) {
        console.error(error);
        setToastMessage("Could not load content.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Initial Load (Trending) - 只在客户端挂载后执行
  useEffect(() => {
    if (mounted) {
      handleViewChange('explore');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  // Handle search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setCurrentView('search');
    setIsLoading(true);
    try {
      const results = await spotifyService.searchMusic(query);
      setSongs(results);
    } catch (error) {
      console.error(error);
      setToastMessage("Search failed. Check API Key or connection.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Play
  const handlePlay = (song: Song) => {
    if (currentSong?.id === song.id) {
      setIsPlaying(!isPlaying);
    } else {
      setCurrentSong(song);
      setIsPlaying(true);
      setToastMessage(`正在播放: ${song.title}`);
    }
  };

  // Handle Like
  const handleToggleLike = (song: Song) => {
    const favorites = loadFavorites();
    const index = favorites.findIndex((s: Song) => s.id === song.id);
    
    if (index >= 0) {
        // 已收藏，移除
        favorites.splice(index, 1);
        setToastMessage("已取消收藏");
    } else {
        // 未收藏，添加
        favorites.push(song);
        setToastMessage("已添加到收藏");
    }
    
    // 保存到 localStorage
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    // 更新状态
    setLikedSongs(favorites);
    // 触发事件通知其他组件
    window.dispatchEvent(new Event('favoritesChanged'));
  };

  // Handle Download
  const handleDownload = async (song: Song) => {
    setToastMessage(`Resolving download link for ${song.title}...`);
    
    // Simulate processing delay
    setTimeout(async () => {
        const status = await spotifyService.checkAvailability(song);
        // Check if already downloaded
        if (!downloadedSongs.some(s => s.id === song.id)) {
            setDownloadedSongs(prev => [song, ...prev]);
        }
        setToastMessage(`Download started: ${status}`);
    }, 1000);
  };

  // Auto-hide toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const getHeaderTitle = () => {
      switch(currentView) {
          case 'search': return `Search Results: "${query}"`;
          case 'explore': return 'Trending Now';
          case 'radio': return 'AI Radio Station';
          case 'artists': return 'Featured Artists';
          case 'favorites': return 'Your Favorites';
          case 'downloads': return 'Downloaded Tracks';
          case 'albums': return 'Albums';
          default: return 'SonicHub';
      }
  };

  // 在客户端挂载前显示加载状态
  if (!mounted) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-[#09090b] to-[#111115]">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gradient-to-br from-[#09090b] to-[#111115]">
      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}
      
      <Sidebar currentView={currentView} onChangeView={handleViewChange} />

      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Header / Search Bar */}
        <header className="sticky top-0 z-40 h-20 flex items-center px-8 bg-[#09090b]/80 backdrop-blur-xl border-b border-white/5 gap-6">
            {/* Mobile Menu Button (Hidden on Desktop) */}
            <button className="md:hidden text-gray-400">
                <Icons.ListMusic />
            </button>

            <div className="flex-1 flex justify-center">
                <div className="w-full max-w-2xl">
                    <form onSubmit={handleSearch} className="relative group">
                        <Icons.Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-purple-400 transition-colors" size={20} />
                        <input 
                            type="text" 
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search song, artist, or paste URL..."
                            className="w-full bg-white/5 border border-white/10 rounded-full py-3 pl-12 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
                        />
                    </form>
                </div>
            </div>
            
            <div className="ml-auto flex items-center gap-4">
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/10">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs font-medium text-gray-300">Online</span>
                </div>
            </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 pb-32 scroll-smooth">
            
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-white tracking-tight">{getHeaderTitle()}</h2>
                {!isLoading && (
                     <span className="text-xs text-gray-500 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                        {songs.length} tracks
                     </span>
                )}
            </div>

            {/* Empty States */}
            {!isLoading && songs.length === 0 && (
                <div className="h-64 flex flex-col items-center justify-center text-center opacity-60">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4">
                        {currentView === 'favorites' ? <Icons.Heart size={32} className="text-gray-500"/> : 
                         currentView === 'downloads' ? <Icons.Download size={32} className="text-gray-500"/> :
                         <Icons.Music size={32} className="text-gray-500" />}
                    </div>
                    <p className="text-gray-400">
                        {currentView === 'favorites' ? "No favorite songs yet." : 
                         currentView === 'downloads' ? "No downloads yet." : 
                         "No music found."}
                    </p>
                    {currentView === 'favorites' && <button onClick={() => handleViewChange('explore')} className="mt-4 text-purple-400 text-sm hover:underline">Go Explore</button>}
                </div>
            )}

            {/* Loading State */}
            {isLoading && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 animate-pulse">
                   {[...Array(10)].map((_, i) => (
                       <div key={i} className="bg-white/5 rounded-xl p-3 h-64">
                           <div className="bg-white/10 w-full aspect-square rounded-lg mb-3"></div>
                           <div className="h-4 bg-white/10 rounded w-3/4 mb-2"></div>
                           <div className="h-3 bg-white/10 rounded w-1/2"></div>
                       </div>
                   ))}
                </div>
            )}

            {/* Results Grid */}
            {!isLoading && songs.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {songs.map(song => (
                        <SongCard 
                            key={song.id} 
                            song={song} 
                            isActive={currentSong?.id === song.id}
                            isLiked={likedSongs.some(s => s.id === song.id)}
                            onPlay={handlePlay}
                            onDownload={handleDownload}
                            onToggleLike={handleToggleLike}
                        />
                    ))}
                </div>
            )}
        </div>

        {/* Floating Player */}
        <div className="absolute bottom-0 left-0 right-0 z-50">
            <Player 
                currentSong={currentSong} 
                isPlaying={isPlaying}
                onPlayPause={() => setIsPlaying(!isPlaying)}
                onNext={() => {}}
                onPrev={() => {}}
            />
        </div>
      </main>
    </div>
  );
}

