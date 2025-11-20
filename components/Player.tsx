'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Song } from '../types';
import { Icons } from './Icons';
import { spotifyService } from '@/services/spotifyService';
import { audioEvents } from '@/lib/audioEvents';

interface PlayerProps {
  currentSong: Song | null;
  isPlaying: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
}

// 本地存储收藏歌曲的工具函数
const FAVORITES_KEY = 'sonichub_favorites';

function getFavorites(): Song[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(FAVORITES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load favorites:', error);
    return [];
  }
}

function saveFavorites(favorites: Song[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  } catch (error) {
    console.error('Failed to save favorites:', error);
  }
}

function toggleFavorite(song: Song): boolean {
  const favorites = getFavorites();
  const index = favorites.findIndex(fav => fav.id === song.id);
  
  if (index >= 0) {
    // 已收藏，移除
    favorites.splice(index, 1);
    saveFavorites(favorites);
    // 触发自定义事件通知其他组件
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('favoritesChanged'));
    }
    return false;
  } else {
    // 未收藏，添加
    favorites.push(song);
    saveFavorites(favorites);
    // 触发自定义事件通知其他组件
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('favoritesChanged'));
    }
    return true;
  }
}

export const Player: React.FC<PlayerProps> = ({ currentSong, isPlaying, onPlayPause, onNext, onPrev }) => {
  const [mounted, setMounted] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [actualAudioUrl, setActualAudioUrl] = useState<string>('');
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [loadError, setLoadError] = useState<string>('');
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [retryStatus, setRetryStatus] = useState<string>('');
  const [isBuffering, setIsBuffering] = useState(false);
  const [shouldAutoPlay, setShouldAutoPlay] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);

  // 检查当前歌曲是否收藏
  useEffect(() => {
    if (!mounted || !currentSong) return;
    
    const favorites = getFavorites();
    setIsFavorite(favorites.some(song => song.id === currentSong.id));
  }, [currentSong, mounted]);

  // 确保只在客户端渲染
  useEffect(() => {
    setMounted(true);
  }, []);

  // 监听重试事件
  useEffect(() => {
    const handleRetry = (data: { attempt: number, maxRetries: number, waitSeconds: number }) => {
      setRetryStatus(`重试中 (${data.attempt}/${data.maxRetries})，请稍候...`);
    };

    audioEvents.on('retry', handleRetry);
    return () => {
      audioEvents.off('retry', handleRetry);
    };
  }, []);

  // 获取 YouTube 音频 URL 当歌曲改变时
  useEffect(() => {
    if (!mounted) return;
    
    if (currentSong && !currentSong.audioUrl) {
      setIsLoadingAudio(true);
      setActualAudioUrl(''); // 清空旧的 URL
      setLoadError(''); // 清空错误
      setIsPreviewMode(false);
      setIsBuffering(false);
      setShouldAutoPlay(false);
      setRetryStatus('正在获取音频...');
      
      spotifyService.getAudioUrl(currentSong)
        .then(result => {
          console.log('🎵 Audio result:', result);
          setActualAudioUrl(result.url);
          setIsLoadingAudio(false);
          setIsPreviewMode(result.isPreview);
          setRetryStatus('');
          
          if (result.error) {
            setLoadError(result.error);
          } else if (!result.url) {
            setLoadError('暂无可用音频');
          }
        })
        .catch(error => {
          console.error('Failed to get audio URL:', error);
          setIsLoadingAudio(false);
          setLoadError('加载失败');
          setRetryStatus('');
          setIsBuffering(false);
          setShouldAutoPlay(false);
          // 尝试使用预览
          if (currentSong.previewUrl) {
            console.log('⚠️ Using Spotify preview (30s)');
            setActualAudioUrl(currentSong.previewUrl);
            setIsPreviewMode(true);
          }
        });
    } else if (currentSong?.audioUrl) {
      setActualAudioUrl(currentSong.audioUrl);
      setIsLoadingAudio(false);
      setLoadError('');
      setIsPreviewMode(false);
      setIsBuffering(false);
      setShouldAutoPlay(false);
      setRetryStatus('');
    }
  }, [currentSong, mounted]);

  // 当音频 URL 准备好后，加载音频
  useEffect(() => {
    if (!mounted || !audioRef.current || !actualAudioUrl || isLoadingAudio) {
      return;
    }
    
    console.log('🔍 Loading audio:', actualAudioUrl.substring(0, 100) + '...');
    
    // 标记为缓冲中
    setIsBuffering(true);
    
    // 如果用户已点击播放，记录需要自动播放
    if (isPlaying) {
      setShouldAutoPlay(true);
    }
    
    // 加载音频
    audioRef.current.src = actualAudioUrl;
    audioRef.current.load();
    
  }, [actualAudioUrl, isLoadingAudio, mounted, isPlaying, currentSong]);

  // Handle Play/Pause (独立于 URL 加载)
  useEffect(() => {
    if (!mounted || !audioRef.current || !actualAudioUrl || isLoadingAudio) return;
    
    if (isPlaying) {
      // 如果正在缓冲，记录需要自动播放
      if (isBuffering) {
        setShouldAutoPlay(true);
      } else {
        // 否则立即播放
        audioRef.current.play()
          .catch(error => console.warn("⏸️ Play prevented:", error));
      }
    } else {
      audioRef.current.pause();
      setShouldAutoPlay(false); // 取消自动播放
    }
  }, [isPlaying, isBuffering, isLoadingAudio, mounted, audioRef, actualAudioUrl]);

  // Handle Volume
  useEffect(() => {
    if (audioRef.current) {
        audioRef.current.volume = volume;
    }
  }, [volume]);

  // Update Progress
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const curr = audioRef.current.currentTime;
      const dur = audioRef.current.duration;
      setCurrentTime(curr);
      if (dur && !isNaN(dur)) {
        setDuration(dur);
        setProgress((curr / dur) * 100);
      }
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.min(Math.max(x / rect.width, 0), 1);
    
    audioRef.current.currentTime = percentage * duration;
    setProgress(percentage * 100);
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!currentSong) {
    return (
      <div className="h-20 border-t border-white/10 bg-[#09090b] flex items-center justify-center text-gray-500 text-sm">
        Select a song to start listening
      </div>
    );
  }

  return (
    <div className="relative">
      {/* 状态提示条 - 在播放器上方 */}
      {(isLoadingAudio || isBuffering || isPreviewMode || loadError) && (
        <div className="h-8 bg-gradient-to-r from-[#09090b] to-[#111115] border-t border-white/5 flex items-center justify-center px-4">
          {/* 获取音频URL */}
          {isLoadingAudio && !isBuffering && (
            <div className="text-xs text-blue-400 flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <span>{retryStatus || '正在获取音频链接...'}</span>
            </div>
          )}
          
          {/* 下载/缓冲提示 */}
          {!isLoadingAudio && isBuffering && (
            <div className="text-xs text-cyan-400 flex items-center gap-2">
              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
              <span>正在下载音频，请稍候...</span>
            </div>
          )}
          
          {/* 预览模式提示 */}
          {!isLoadingAudio && !isBuffering && isPreviewMode && (
            <div className="text-xs text-yellow-400 flex items-center gap-2">
              <span>⚠️</span>
              <span>YouTube 不可用，播放 30 秒预览</span>
            </div>
          )}
          
          {/* 错误提示 */}
          {!isLoadingAudio && !isBuffering && loadError && !isPreviewMode && (
            <div className="text-xs text-red-400 truncate">
              {loadError}
            </div>
          )}
        </div>
      )}
      
      {/* 播放器主体 */}
      <div className="h-24 border-t border-white/10 bg-[#09090b]/95 backdrop-blur-lg flex items-center justify-between px-4 md:px-8 z-50">
        {/* Hidden Audio Element */}
        <audio
          ref={audioRef}
          onTimeUpdate={handleTimeUpdate}
          onLoadedData={() => {
            console.log('📦 Audio loaded and ready');
          }}
          onCanPlay={() => {
            console.log('✅ Audio can play');
            setIsBuffering(false);
            setLoadError(''); // 清除错误
            // 如果用户已点击播放，自动开始播放
            if (shouldAutoPlay && audioRef.current) {
              setShouldAutoPlay(false);
              audioRef.current.play()
                .then(() => console.log('▶️ Auto-playing after buffering'))
                .catch(err => {
                  console.error('❌ Auto-play error:', err);
                  // 播放失败，尝试降级到预览
                  if (currentSong?.previewUrl && actualAudioUrl !== currentSong.previewUrl) {
                    console.log('⚠️ Playback failed, using preview');
                    setActualAudioUrl(currentSong.previewUrl);
                    setIsPreviewMode(true);
                    setLoadError('播放失败，使用 30秒预览');
                  } else {
                    setLoadError('音频播放失败，该歌曲暂时无法播放');
                  }
                });
            }
          }}
          onWaiting={() => {
            console.log('⏳ Buffering...');
            setIsBuffering(true);
          }}
          onPlaying={() => {
            console.log('▶️ Audio started playing');
            setIsBuffering(false);
          }}
          onPlay={() => console.log('▶️ Play event')}
          onPause={() => console.log('⏸️ Audio paused')}
          onError={(e: any) => {
            console.error('❌ Audio error:', e.target?.error);
            setIsBuffering(false);
            setLoadError('音频加载失败');
          }}
          onEnded={() => {
              console.log('🔚 Audio ended, playing next...');
              onNext();
          }}
        />

      {/* Song Info */}
      <div className="flex items-center gap-4 w-1/3">
        <img 
          src={currentSong.coverUrl} 
          alt={currentSong.title} 
          className={`w-14 h-14 rounded-md object-cover shadow-lg shadow-purple-900/20 ${isPlaying ? 'animate-pulse' : ''}`}
        />
        <div className="hidden sm:block overflow-hidden">
          <h4 className="text-white font-medium truncate">{currentSong.title}</h4>
          <p className="text-gray-400 text-xs truncate">{currentSong.artist}</p>
        </div>
        <button 
          onClick={() => {
            if (currentSong) {
              const newFavoriteState = toggleFavorite(currentSong);
              setIsFavorite(newFavoriteState);
              console.log(newFavoriteState ? '❤️ Added to favorites' : '💔 Removed from favorites');
            }
          }}
          className={`ml-2 transition-all ${
            isFavorite 
              ? 'text-pink-500 hover:text-pink-400 scale-110' 
              : 'text-gray-400 hover:text-pink-500'
          }`}
          title={isFavorite ? '取消收藏' : '收藏'}
        >
            <Icons.Heart 
              size={18} 
              className={isFavorite ? 'fill-current' : ''}
            />
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center w-1/3 gap-2">
        <div className="flex items-center gap-6">
          <button onClick={onPrev} className="text-gray-400 hover:text-white transition-colors">
            <Icons.SkipBack size={20} />
          </button>
          <button 
            onClick={onPlayPause}
            className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-lg shadow-white/10"
          >
            {isPlaying ? (
              <Icons.Pause size={20} className="text-black fill-current" />
            ) : (
              <Icons.Play size={20} className="text-black fill-current ml-1" />
            )}
          </button>
          <button onClick={onNext} className="text-gray-400 hover:text-white transition-colors">
            <Icons.SkipForward size={20} />
          </button>
        </div>
        
        <div className="w-full max-w-md flex items-center gap-2 text-xs text-gray-500">
          <span>{formatTime(currentTime)}</span>
          
          {/* Interactive Progress Bar */}
          <div 
            className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden cursor-pointer group py-1 relative"
            onClick={handleSeek}
          >
            <div className="absolute top-0 left-0 right-0 bottom-0 flex items-center">
                <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
                    <div 
                    className="h-full bg-white group-hover:bg-purple-400 relative transition-all duration-100"
                    style={{ width: `${progress}%` }}
                    ></div>
                </div>
            </div>
          </div>
          
          {/* Prefer actual audio duration, fallback to metadata string if not ready */}
          <span>{duration > 0 ? formatTime(duration) : currentSong.duration}</span>
        </div>
      </div>

      {/* Volume */}
      <div className="flex items-center justify-end gap-3 w-1/3">
        <Icons.ListMusic size={20} className="text-gray-400 hover:text-white cursor-pointer" />
        <div className="flex items-center gap-2 group">
          <button onClick={() => setVolume(prev => prev === 0 ? 0.7 : 0)}>
             {volume === 0 ? <Icons.Disc size={20} className="text-gray-500"/> : <Icons.Volume2 size={20} className="text-gray-400" />}
          </button>
          <div 
            className="w-24 h-1 bg-gray-800 rounded-full overflow-hidden cursor-pointer relative py-2"
            onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                setVolume(Math.min(Math.max(x / rect.width, 0), 1));
            }}
          >
             <div className="absolute top-1.5 left-0 w-full h-1 bg-gray-800 rounded-full">
                 <div 
                    className="h-full bg-gray-500 group-hover:bg-white" 
                    style={{ width: `${volume * 100}%` }}
                 ></div>
             </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};