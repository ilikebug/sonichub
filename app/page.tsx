'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { MobileSidebar } from '@/components/MobileSidebar';
import { Player } from '@/components/Player';
import { PlayQueue } from '@/components/PlayQueue';
import { Pagination } from '@/components/Pagination';
import { Icons } from '@/components/Icons';
import { SongCard } from '@/components/SongCard';
import { SearchHistory } from '@/components/SearchHistory';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Song, ViewType, PlayMode } from '@/types';
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
  const [playMode, setPlayMode] = useState<PlayMode>('loop'); // 默认列表循环
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showSearchHistory, setShowSearchHistory] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const ITEMS_PER_PAGE = 20;

  // 本地存储 key
  const FAVORITES_KEY = 'sonichub_favorites';
  const DOWNLOADS_KEY = 'sonichub_downloads';
  const PLAY_MODE_KEY = 'sonichub_playmode';
  const SEARCH_HISTORY_KEY = 'sonichub_search_history';
  const MAX_HISTORY_ITEMS = 10; // 最多保存10条搜索历史

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

  // 从 localStorage 加载搜索历史
  const loadSearchHistory = () => {
    try {
      const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load search history:', error);
      return [];
    }
  };

  // 保存搜索历史到 localStorage
  const saveSearchHistory = (history: string[]) => {
    try {
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Failed to save search history:', error);
    }
  };

  // 添加搜索记录
  const addSearchHistory = (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    const history = loadSearchHistory();
    // 移除重复项
    const filteredHistory = history.filter((item: string) => item !== searchQuery);
    // 添加到开头
    const newHistory = [searchQuery, ...filteredHistory].slice(0, MAX_HISTORY_ITEMS);
    
    setSearchHistory(newHistory);
    saveSearchHistory(newHistory);
  };

  // 清除搜索历史
  const clearSearchHistory = () => {
    setSearchHistory([]);
    saveSearchHistory([]);
    setShowSearchHistory(false);
  };

  // 确保只在客户端渲染
  useEffect(() => {
    setMounted(true);
    // 加载收藏列表
    setLikedSongs(loadFavorites());

    // 从本地存储加载下载历史
    try {
      const storedDownloads = localStorage.getItem(DOWNLOADS_KEY);
      if (storedDownloads) {
        setDownloadedSongs(JSON.parse(storedDownloads));
      }
    } catch (error) {
      console.error('Failed to load downloads:', error);
    }

    // 从本地存储加载播放模式
    try {
      const storedPlayMode = localStorage.getItem(PLAY_MODE_KEY);
      if (storedPlayMode) {
        setPlayMode(storedPlayMode as PlayMode);
      }
    } catch (error) {
      console.error('Failed to load play mode:', error);
    }

    // 从本地存储加载搜索历史
    setSearchHistory(loadSearchHistory());

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

  // 点击外部关闭搜索历史
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        // 检查是否点击在搜索历史弹窗内
        const target = event.target as HTMLElement;
        const isSearchHistory = target.closest('[data-search-history]');
        if (!isSearchHistory) {
          setShowSearchHistory(false);
        }
      }
    };

    if (showSearchHistory) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSearchHistory]);

  // Handle View Switching
  const handleViewChange = async (newView: ViewType, page: number = 1) => {
    setCurrentView(newView);
    setQuery(''); // Clear search when switching tabs
    setCurrentPage(page);

    if (newView === 'favorites') {
      setSongs(likedSongs);
      setTotalPages(Math.ceil(likedSongs.length / ITEMS_PER_PAGE));
      return;
    }
    
    if (newView === 'downloads') {
      setSongs(downloadedSongs);
      setTotalPages(Math.ceil(downloadedSongs.length / ITEMS_PER_PAGE));
      return;
    }

    if (newView === 'albums') {
        setSongs([]); // Placeholder
        setTotalPages(1);
        return;
    }

    // Fetch content from Spotify for discovery views
    if (['explore', 'radio', 'artists'].includes(newView)) {
      setIsLoading(true);
      try {
        const offset = (page - 1) * ITEMS_PER_PAGE;
        // Call appropriate Spotify service method based on view
        let results: Song[] = [];
        if (newView === 'explore') {
          results = await spotifyService.getNewReleases(ITEMS_PER_PAGE, offset);
        } else if (newView === 'radio') {
          results = await spotifyService.getRecommendations(ITEMS_PER_PAGE, offset);
        } else if (newView === 'artists') {
          results = await spotifyService.getFeaturedPlaylists(ITEMS_PER_PAGE, offset);
        }
        setSongs(results || []);
        // Spotify API 通常有限制，我们假设最多5页
        setTotalPages(5);
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
  const handleSearch = async (e?: React.FormEvent, searchQuery?: string, page: number = 1) => {
    e?.preventDefault();
    const queryToSearch = searchQuery || query;
    if (!queryToSearch.trim()) return;

    // 添加到搜索历史
    if (page === 1) {
      addSearchHistory(queryToSearch);
    }
    setShowSearchHistory(false);

    // 如果是从历史记录中选择的，更新输入框
    if (searchQuery) {
      setQuery(searchQuery);
    }

    setCurrentView('search');
    setCurrentPage(page);
    setIsLoading(true);
    try {
      const offset = (page - 1) * ITEMS_PER_PAGE;
      const results = await spotifyService.searchMusic(queryToSearch, ITEMS_PER_PAGE, offset);
      setSongs(results);
      // Spotify 搜索结果通常很多，假设最多10页
      setTotalPages(10);
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

  // Handle Remove Song from Queue
  const handleRemoveSongFromQueue = (songId: string) => {
    const updatedSongs = songs.filter(s => s.id !== songId);
    setSongs(updatedSongs);
    
    // 如果删除的是当前播放的歌曲，自动播放下一首
    if (currentSong?.id === songId) {
      if (updatedSongs.length > 0) {
        setCurrentSong(updatedSongs[0]);
        setIsPlaying(true);
      } else {
        setCurrentSong(null);
        setIsPlaying(false);
      }
    }
    setToastMessage('已从队列中移除');
  };

  // Handle Clear Queue
  const handleClearQueue = () => {
    setSongs([]);
    setCurrentSong(null);
    setIsPlaying(false);
    setIsQueueOpen(false);
    setToastMessage('队列已清空');
  };

  // Handle Page Change
  const handlePageChange = (newPage: number) => {
    if (newPage === currentPage || newPage < 1 || newPage > totalPages) return;
    
    // 滚动到顶部
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // 根据当前视图重新加载数据
    if (currentView === 'search') {
      handleSearch(undefined, query, newPage);
    } else if (['explore', 'radio', 'artists'].includes(currentView)) {
      handleViewChange(currentView, newPage);
    } else {
      // 对于本地数据（收藏、下载），只需要更新页码
      setCurrentPage(newPage);
    }
  };

  // Handle Next
  const handleNext = () => {
    if (songs.length === 0) return;
    
    // 单曲循环模式，重新播放当前歌曲
    if (playMode === 'loop-one' && currentSong) {
      setCurrentSong({ ...currentSong }); // 触发重新加载
      setIsPlaying(true);
      return;
    }
    
    const currentIndex = songs.findIndex(s => s.id === currentSong?.id);
    let nextSong: Song | null = null;
    
    if (playMode === 'shuffle') {
      // 随机播放：随机选一首不是当前歌曲的
      const availableSongs = songs.filter(s => s.id !== currentSong?.id);
      if (availableSongs.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableSongs.length);
        nextSong = availableSongs[randomIndex];
      }
    } else if (playMode === 'loop') {
      // 列表循环：到末尾后回到第一首
      const nextIndex = (currentIndex + 1) % songs.length;
      nextSong = songs[nextIndex];
    } else {
      // 顺序播放：到末尾就停止
      if (currentIndex < songs.length - 1) {
        nextSong = songs[currentIndex + 1];
      } else {
        setIsPlaying(false);
        return;
      }
    }
    
    if (nextSong) {
      setCurrentSong(nextSong);
      setIsPlaying(true);
      setToastMessage(`正在播放: ${nextSong.title}`);
    }
  };

  // Handle Previous
  const handlePrev = () => {
    if (songs.length === 0) return;
    
    // 单曲循环模式，重新播放当前歌曲
    if (playMode === 'loop-one' && currentSong) {
      setCurrentSong({ ...currentSong }); // 触发重新加载
      setIsPlaying(true);
      return;
    }
    
    const currentIndex = songs.findIndex(s => s.id === currentSong?.id);
    let prevSong: Song | null = null;
    
    if (playMode === 'shuffle') {
      // 随机播放：随机选一首不是当前歌曲的
      const availableSongs = songs.filter(s => s.id !== currentSong?.id);
      if (availableSongs.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableSongs.length);
        prevSong = availableSongs[randomIndex];
      }
    } else if (playMode === 'loop') {
      // 列表循环：到开头后回到最后一首
      const prevIndex = currentIndex <= 0 ? songs.length - 1 : currentIndex - 1;
      prevSong = songs[prevIndex];
    } else {
      // 顺序播放：到开头就停止
      if (currentIndex > 0) {
        prevSong = songs[currentIndex - 1];
      } else {
        setIsPlaying(false);
        return;
      }
    }
    
    if (prevSong) {
      setCurrentSong(prevSong);
      setIsPlaying(true);
      setToastMessage(`正在播放: ${prevSong.title}`);
    }
  };

  // Toggle Play Mode
  const handleTogglePlayMode = () => {
    const modes: PlayMode[] = ['loop', 'loop-one', 'shuffle', 'sequential'];
    const currentModeIndex = modes.indexOf(playMode);
    const nextMode = modes[(currentModeIndex + 1) % modes.length];
    setPlayMode(nextMode);
    
    const modeNames = {
      'loop': '列表循环',
      'loop-one': '单曲循环',
      'shuffle': '随机播放',
      'sequential': '顺序播放'
    };
    setToastMessage(`播放模式: ${modeNames[nextMode]}`);
    
    // 保存到 localStorage
    localStorage.setItem(PLAY_MODE_KEY, nextMode);
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
    setToastMessage(`正在准备下载: ${song.title}`);

    try {
      // 1. 先获取 videoId（如果还没有搜索过）
      const result = await spotifyService.getAudioUrl(song);

      if (!result.url) {
        setToastMessage('下载失败：无法获取音频链接');
        return;
      }

      // 2. 从 URL 中提取 videoId
      const videoIdMatch = result.url.match(/videoId=([^&]+)/);
      if (!videoIdMatch) {
        setToastMessage('下载失败：无法解析视频ID');
        return;
      }

      const videoId = videoIdMatch[1];
      const filename = `${song.artist} - ${song.title}`;

      // 3. 使用下载 API
      const downloadUrl = `/api/youtube/download?videoId=${videoId}&filename=${encodeURIComponent(filename)}`;

      // 4. 创建隐藏的 a 标签触发下载
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 5. 添加到已下载列表并保存到 localStorage
      if (!downloadedSongs.some(s => s.id === song.id)) {
        const updatedDownloads = [song, ...downloadedSongs];
        setDownloadedSongs(updatedDownloads);
        localStorage.setItem(DOWNLOADS_KEY, JSON.stringify(updatedDownloads));
      }

      setToastMessage(`开始下载: ${song.title}`);
    } catch (error) {
      console.error('Download error:', error);
      setToastMessage('下载失败，请稍后重试');
    }
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
    <div className="flex h-screen w-full overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#09090b] dark:to-[#111115] transition-colors duration-300">
      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}
      
      {/* Desktop Sidebar */}
      <Sidebar currentView={currentView} onChangeView={handleViewChange} />
      
      {/* Mobile Sidebar */}
      <MobileSidebar
        currentView={currentView}
        onChangeView={handleViewChange}
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* Play Queue */}
      <PlayQueue
        songs={songs}
        currentSong={currentSong}
        isOpen={isQueueOpen}
        onClose={() => setIsQueueOpen(false)}
        onPlaySong={handlePlay}
        onRemoveSong={handleRemoveSongFromQueue}
        onClearQueue={handleClearQueue}
      />

      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Header / Search Bar */}
        <header className="sticky top-0 z-40 h-20 flex items-center px-4 md:px-8 bg-white/80 dark:bg-[#09090b]/80 backdrop-blur-xl border-b border-gray-200 dark:border-white/5 gap-3 md:gap-6 transition-colors duration-300">
            {/* Mobile Menu Button (Hidden on Desktop) */}
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
                <Icons.Menu size={24} />
            </button>

            <div className="flex-1 flex justify-center relative">
                <div className="w-full max-w-2xl relative">
                    <form onSubmit={handleSearch} className="relative group">
                        <Icons.Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-purple-400 transition-colors" size={20} />
                        <input 
                            ref={searchInputRef}
                            type="text" 
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onFocus={() => setShowSearchHistory(true)}
                            placeholder="Search song, artist, or paste URL..."
                            className="w-full bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-full py-3 pl-12 pr-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
                        />
                    </form>
                    
                    {/* Search History Dropdown */}
                    {showSearchHistory && (
                        <SearchHistory
                            history={searchHistory}
                            onSelectHistory={(item) => handleSearch(undefined, item)}
                            onClearHistory={clearSearchHistory}
                            onClose={() => setShowSearchHistory(false)}
                        />
                    )}
                </div>
            </div>
            
            <div className="ml-auto flex items-center gap-4">
                <ThemeToggle />
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-200 dark:bg-white/5 rounded-full border border-gray-300 dark:border-white/10">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Online</span>
                </div>
            </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-8 pb-24 sm:pb-28 md:pb-32 scroll-smooth">
            
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{getHeaderTitle()}</h2>
                {!isLoading && (
                     <span className="text-xs text-gray-600 dark:text-gray-500 bg-gray-200 dark:bg-white/5 px-3 py-1 rounded-full border border-gray-300 dark:border-white/5">
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
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-6 animate-pulse">
                   {[...Array(10)].map((_, i) => (
                       <div key={i} className="bg-gray-200 dark:bg-white/5 rounded-xl p-3 h-64">
                           <div className="bg-gray-300 dark:bg-white/10 w-full aspect-square rounded-lg mb-3"></div>
                           <div className="h-4 bg-gray-300 dark:bg-white/10 rounded w-3/4 mb-2"></div>
                           <div className="h-3 bg-gray-300 dark:bg-white/10 rounded w-1/2"></div>
                       </div>
                   ))}
                </div>
            )}

            {/* Results Grid */}
            {!isLoading && songs.length > 0 && (
                <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-6">
                    {(() => {
                        // 对于本地数据（收藏、下载）进行客户端分页
                        const displaySongs = ['favorites', 'downloads'].includes(currentView)
                            ? songs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                            : songs;
                        
                        return displaySongs.map(song => (
                            <SongCard 
                                key={song.id} 
                                song={song} 
                                isActive={currentSong?.id === song.id}
                                isLiked={likedSongs.some(s => s.id === song.id)}
                                onPlay={handlePlay}
                                onDownload={handleDownload}
                                onToggleLike={handleToggleLike}
                            />
                        ));
                    })()}
                </div>
                
                {/* Pagination */}
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                    isLoading={isLoading}
                />
                </>
            )}
        </div>

        {/* Floating Player - Fixed to bottom */}
        <div className="fixed bottom-0 left-0 right-0 z-50">
            <Player 
                currentSong={currentSong} 
                isPlaying={isPlaying}
                playMode={playMode}
                onPlayPause={() => setIsPlaying(!isPlaying)}
                onNext={handleNext}
                onPrev={handlePrev}
                onTogglePlayMode={handleTogglePlayMode}
                onOpenQueue={() => setIsQueueOpen(true)}
            />
        </div>
      </main>
    </div>
  );
}

