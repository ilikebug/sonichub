"use client";

import React, { useState, useEffect, useRef } from "react";
import { Song, PlayMode } from "../types";
import { Icons } from "./Icons";
import { AudioVisualizer } from "./AudioVisualizer";
import { spotifyService } from "@/services/spotifyService";
import { audioEvents } from "@/lib/audioEvents";

interface PlayerProps {
  currentSong: Song | null;
  isPlaying: boolean;
  playMode: PlayMode;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onTogglePlayMode: () => void;
  onOpenQueue?: () => void;
}

// 从服务端检查歌曲是否收藏
async function checkFavorite(songId: string): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const token = sessionStorage.getItem("auth_token");
    if (!token) return false;

    const response = await fetch("/api/favorites", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 401) {
      // Token 过期
      return false;
    }

    const data = await response.json();
    if (data.success) {
      return data.favorites.some((s: Song) => s.id === songId);
    }
    return false;
  } catch (error) {
    console.error("Failed to check favorite:", error);
    return false;
  }
}

// 通过服务端 API 切换收藏
async function toggleFavorite(
  song: Song,
  currentIsFavorite: boolean
): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const token = sessionStorage.getItem("auth_token");
    if (!token) {
      console.warn("No auth token, cannot toggle favorite");
      return false;
    }

    const action = currentIsFavorite ? "remove" : "add";

    const response = await fetch("/api/favorites", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action, song }),
    });

    if (response.status === 401) {
      // Token 过期，触发事件通知主页面
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("favoritesChanged"));
      }
      return currentIsFavorite; // 返回原状态
    }

    const data = await response.json();
    if (data.success) {
      // 从响应中确认新的收藏状态
      const newIsFavorite = data.favorites.some((s: Song) => s.id === song.id);
      // 触发自定义事件通知其他组件
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("favoritesChanged"));
      }
      return newIsFavorite;
    }
    return currentIsFavorite; // 失败时返回原状态
  } catch (error) {
    console.error("Failed to toggle favorite:", error);
    return currentIsFavorite; // 失败时返回原状态
  }
}

export const Player: React.FC<PlayerProps> = ({
  currentSong,
  isPlaying,
  playMode,
  onPlayPause,
  onNext,
  onPrev,
  onTogglePlayMode,
  onOpenQueue,
}) => {
  const [mounted, setMounted] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [actualAudioUrl, setActualAudioUrl] = useState<string>("");
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [loadError, setLoadError] = useState<string>("");
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [retryStatus, setRetryStatus] = useState<string>("");
  const [isBuffering, setIsBuffering] = useState(false);
  const [shouldAutoPlay, setShouldAutoPlay] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isDraggingProgress, setIsDraggingProgress] = useState(false);
  const [isDraggingVolume, setIsDraggingVolume] = useState(false);
  const [showVisualizer, setShowVisualizer] = useState(true);

  const audioRef = useRef<HTMLAudioElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const volumeBarRef = useRef<HTMLDivElement>(null);

  // 检查当前歌曲是否收藏（从服务端读取）
  useEffect(() => {
    if (!mounted || !currentSong) return;

    checkFavorite(currentSong.id).then((isFav) => {
      setIsFavorite(isFav);
    });
  }, [currentSong, mounted]);

  // 监听收藏变化事件，更新收藏状态
  useEffect(() => {
    if (!mounted || !currentSong) return;

    const handleFavoritesChange = () => {
      checkFavorite(currentSong.id).then((isFav) => {
        setIsFavorite(isFav);
      });
    };

    window.addEventListener("favoritesChanged", handleFavoritesChange);
    return () => {
      window.removeEventListener("favoritesChanged", handleFavoritesChange);
    };
  }, [currentSong, mounted]);

  // 确保只在客户端渲染
  useEffect(() => {
    setMounted(true);
  }, []);

  // 监听重试事件
  useEffect(() => {
    const handleRetry = (data: {
      attempt: number;
      maxRetries: number;
      waitSeconds: number;
    }) => {
      setRetryStatus(`重试中 (${data.attempt}/${data.maxRetries})，请稍候...`);
    };

    audioEvents.on("retry", handleRetry);
    return () => {
      audioEvents.off("retry", handleRetry);
    };
  }, []);

  // 获取 YouTube 音频 URL 当歌曲改变时
  useEffect(() => {
    if (!mounted) return;

    // 如果没有歌曲，重置所有状态
    if (!currentSong) {
      setActualAudioUrl("");
      setCurrentTime(0);
      setDuration(0);
      setProgress(0);
      setIsLoadingAudio(false);
      setLoadError("");
      setIsPreviewMode(false);
      setIsBuffering(false);
      setShouldAutoPlay(false);
      setRetryStatus("");
      return;
    }

    if (currentSong && !currentSong.audioUrl) {
      setIsLoadingAudio(true);
      setActualAudioUrl(""); // 清空旧的 URL
      setLoadError(""); // 清空错误
      setIsPreviewMode(false);
      setIsBuffering(false);
      setShouldAutoPlay(false);
      setRetryStatus("正在获取音频...");
      // 重置时间状态
      setCurrentTime(0);
      setDuration(0);
      setProgress(0);

      spotifyService
        .getAudioUrl(currentSong)
        .then((result) => {
          setActualAudioUrl(result.url);
          setIsLoadingAudio(false);
          setIsPreviewMode(result.isPreview);
          setRetryStatus("");

          if (result.error) {
            setLoadError(result.error);
          } else if (!result.url) {
            setLoadError("暂无可用音频");
          }
        })
        .catch((error) => {
          console.error("Failed to get audio URL:", error);
          setIsLoadingAudio(false);
          setLoadError("加载失败");
          setRetryStatus("");
          setIsBuffering(false);
          setShouldAutoPlay(false);
          // 尝试使用预览
          if (currentSong.previewUrl) {
            setActualAudioUrl(currentSong.previewUrl);
            setIsPreviewMode(true);
          }
        });
    } else if (currentSong?.audioUrl) {
      setActualAudioUrl(currentSong.audioUrl);
      setIsLoadingAudio(false);
      setLoadError("");
      setIsPreviewMode(false);
      setIsBuffering(false);
      setShouldAutoPlay(false);
      setRetryStatus("");
      // 重置时间状态
      setCurrentTime(0);
      setDuration(0);
      setProgress(0);
    }
  }, [currentSong, mounted]);

  // 当音频 URL 准备好后，加载音频
  useEffect(() => {
    if (!mounted || !audioRef.current || !actualAudioUrl || isLoadingAudio) {
      return;
    }

    // 标记为缓冲中
    setIsBuffering(true);

    // 如果用户已点击播放，记录需要自动播放
    if (isPlaying) {
      setShouldAutoPlay(true);
    }

    // 加载音频
    audioRef.current.src = actualAudioUrl;
    audioRef.current.load();
  }, [actualAudioUrl, isLoadingAudio, mounted]);

  // Handle Play/Pause (独立于 URL 加载)
  useEffect(() => {
    if (!mounted || !audioRef.current || !actualAudioUrl || isLoadingAudio)
      return;

    if (isPlaying) {
      // 如果正在缓冲，记录需要自动播放
      if (isBuffering) {
        setShouldAutoPlay(true);
      } else {
        // 否则立即播放
        audioRef.current
          .play()
          .catch((error) => console.warn("⏸️ Play prevented:", error));
      }
    } else {
      audioRef.current.pause();
      setShouldAutoPlay(false); // 取消自动播放
    }
  }, [
    isPlaying,
    isBuffering,
    isLoadingAudio,
    mounted,
    audioRef,
    actualAudioUrl,
  ]);

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

  // 拖动进度条
  const handleProgressMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDraggingProgress(true);
    handleSeek(e);
  };

  const handleProgressMouseMove = (e: MouseEvent) => {
    if (
      !isDraggingProgress ||
      !progressBarRef.current ||
      !audioRef.current ||
      !duration
    )
      return;

    const rect = progressBarRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.min(Math.max(x / rect.width, 0), 1);

    audioRef.current.currentTime = percentage * duration;
    setProgress(percentage * 100);
  };

  const handleProgressMouseUp = () => {
    setIsDraggingProgress(false);
  };

  // 监听全局鼠标事件以支持拖动进度条
  useEffect(() => {
    if (isDraggingProgress) {
      window.addEventListener("mousemove", handleProgressMouseMove);
      window.addEventListener("mouseup", handleProgressMouseUp);

      return () => {
        window.removeEventListener("mousemove", handleProgressMouseMove);
        window.removeEventListener("mouseup", handleProgressMouseUp);
      };
    }
  }, [isDraggingProgress, duration]);

  // 拖动音量滑块
  const handleVolumeMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDraggingVolume(true);
    handleVolumeClick(e);
  };

  const handleVolumeClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!volumeBarRef.current) return;
    const rect = volumeBarRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newVolume = Math.min(Math.max(x / rect.width, 0), 1);
    setVolume(newVolume);
  };

  const handleVolumeMouseMove = (e: MouseEvent) => {
    if (!isDraggingVolume || !volumeBarRef.current) return;

    const rect = volumeBarRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newVolume = Math.min(Math.max(x / rect.width, 0), 1);
    setVolume(newVolume);
  };

  const handleVolumeMouseUp = () => {
    setIsDraggingVolume(false);
  };

  // 监听全局鼠标事件以支持拖动音量滑块
  useEffect(() => {
    if (isDraggingVolume) {
      window.addEventListener("mousemove", handleVolumeMouseMove);
      window.addEventListener("mouseup", handleVolumeMouseUp);

      return () => {
        window.removeEventListener("mousemove", handleVolumeMouseMove);
        window.removeEventListener("mouseup", handleVolumeMouseUp);
      };
    }
  }, [isDraggingVolume]);

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (!currentSong) {
    return (
      <div className="h-20 border-t border-gray-200 dark:border-white/10 bg-white dark:bg-[#09090b] flex items-center justify-center text-gray-500 dark:text-gray-500 text-sm">
        Select a song to start listening
      </div>
    );
  }

  return (
    <div className="relative">
      {/* 状态提示条 - 在播放器上方 */}
      {(isLoadingAudio || isBuffering || isPreviewMode || loadError) && (
        <div className="h-8 bg-gradient-to-r from-gray-100 to-white dark:from-[#09090b] dark:to-[#111115] border-t border-gray-200 dark:border-white/5 flex items-center justify-center px-4">
          {/* 获取音频URL */}
          {isLoadingAudio && !isBuffering && (
            <div className="text-xs text-blue-400 flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <span>{retryStatus || "正在获取音频链接..."}</span>
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
            <div className="text-xs text-red-400 truncate">{loadError}</div>
          )}
        </div>
      )}

      {/* 播放器主体 */}
      <div className="h-20 md:h-24 border-t border-gray-200 dark:border-white/10 bg-white/95 dark:bg-[#09090b]/95 backdrop-blur-lg px-3 sm:px-4 md:px-6 lg:px-8 z-50 safe-bottom">
        <div className="h-full w-full max-w-screen-2xl mx-auto flex items-center justify-between gap-2 md:gap-3 lg:gap-4">
          {/* Hidden Audio Element */}
          <audio
            ref={audioRef}
            onTimeUpdate={handleTimeUpdate}
            onLoadedData={() => {}}
            onCanPlay={() => {
              setIsBuffering(false);
              setLoadError(""); // 清除错误
              // 如果用户已点击播放，自动开始播放
              if (shouldAutoPlay && audioRef.current) {
                setShouldAutoPlay(false);
                audioRef.current.play().catch((err) => {
                  console.error("❌ Auto-play error:", err);
                  // 播放失败，尝试降级到预览
                  if (
                    currentSong?.previewUrl &&
                    actualAudioUrl !== currentSong.previewUrl
                  ) {
                    setActualAudioUrl(currentSong.previewUrl);
                    setIsPreviewMode(true);
                    setLoadError("播放失败，使用 30秒预览");
                  } else {
                    setLoadError("音频播放失败，该歌曲暂时无法播放");
                  }
                });
              }
            }}
            onWaiting={() => {
              setIsBuffering(true);
            }}
            onPlaying={() => {
              setIsBuffering(false);
            }}
            onError={(e: any) => {
              console.error("❌ Audio error:", e.target?.error);
              setIsBuffering(false);
              setLoadError("音频加载失败");
            }}
            onEnded={() => {
              onNext();
            }}
          />

          {/* Song Info - Left */}
          <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-shrink w-auto md:w-56 lg:w-72">
            {/* 封面图 */}
            <img
              src={currentSong.coverUrl}
              alt={currentSong.title}
              className={`w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 rounded-md object-cover shadow-lg shadow-purple-900/20 flex-shrink-0 ${isPlaying ? "animate-pulse" : ""}`}
            />

            {/* 桌面端：歌曲信息 */}
            <div className="hidden md:flex flex-col gap-1 min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <h4 className="text-gray-900 dark:text-white font-medium truncate text-sm lg:text-base">
                  {currentSong.title}
                </h4>
                <button
                  onClick={async () => {
                    if (currentSong) {
                      const newFavoriteState = await toggleFavorite(
                        currentSong,
                        isFavorite
                      );
                      setIsFavorite(newFavoriteState);
                    }
                  }}
                  className={`flex-shrink-0 transition-all p-0.5 ${
                    isFavorite
                      ? "text-pink-500 hover:text-pink-400"
                      : "text-gray-400 hover:text-pink-500"
                  }`}
                  title={isFavorite ? "取消收藏" : "收藏"}
                >
                  <Icons.Heart
                    size={16}
                    className={`lg:w-[18px] lg:h-[18px] ${isFavorite ? "fill-current" : ""}`}
                  />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-gray-600 dark:text-gray-400 text-xs lg:text-sm truncate flex-1">
                  {currentSong.artist}
                </p>
                {/* Mini Visualizer */}
                <div className="hidden lg:block w-16 xl:w-20 h-3 flex-shrink-0">
                  <AudioVisualizer
                    audioElement={audioRef.current}
                    isPlaying={isPlaying && !isBuffering && !isLoadingAudio}
                    className="w-full h-full"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Controls - Center */}
          <div className="flex flex-col items-center gap-1 md:gap-2 flex-1 min-w-0 max-w-2xl">
            {/* Control Buttons */}
            <div className="flex items-center justify-center gap-1 md:gap-2">
              {/* Play Mode Button - 所有屏幕都显示 */}
              <button
                onClick={onTogglePlayMode}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors p-1 active:scale-95"
                title={
                  playMode === "loop"
                    ? "列表循环"
                    : playMode === "loop-one"
                      ? "单曲循环"
                      : playMode === "shuffle"
                        ? "随机播放"
                        : "顺序播放"
                }
              >
                {playMode === "loop" && (
                  <Icons.Repeat size={18} className="md:w-5 md:h-5" />
                )}
                {playMode === "loop-one" && (
                  <Icons.Repeat1 size={18} className="md:w-5 md:h-5" />
                )}
                {playMode === "shuffle" && (
                  <Icons.Shuffle size={18} className="md:w-5 md:h-5" />
                )}
                {playMode === "sequential" && (
                  <Icons.List size={18} className="md:w-5 md:h-5" />
                )}
              </button>

              <button
                onClick={onPrev}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors p-1 active:scale-95"
              >
                <Icons.SkipBack size={20} className="md:w-5 md:h-5" />
              </button>
              <button
                onClick={onPlayPause}
                className="w-10 h-10 md:w-11 md:h-11 bg-gray-900 dark:bg-white rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-lg shadow-purple-500/20 mx-1 md:mx-2"
              >
                {isPlaying ? (
                  <Icons.Pause
                    size={20}
                    className="text-white dark:text-black fill-current"
                  />
                ) : (
                  <Icons.Play
                    size={20}
                    className="text-white dark:text-black fill-current ml-0.5"
                  />
                )}
              </button>
              <button
                onClick={onNext}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors p-1 active:scale-95"
              >
                <Icons.SkipForward size={20} className="md:w-5 md:h-5" />
              </button>
            </div>

            <div className="w-full flex items-center gap-1 md:gap-2 text-xs text-gray-600 dark:text-gray-500">
              <span className="text-[10px] md:text-xs flex-shrink-0 min-w-[32px]">
                {formatTime(currentTime)}
              </span>

              {/* Interactive Progress Bar */}
              <div
                ref={progressBarRef}
                className="flex-1 h-1 bg-gray-300 dark:bg-gray-800 rounded-full overflow-hidden cursor-pointer group py-2 md:py-1 relative min-w-0 touch-none"
                onMouseDown={handleProgressMouseDown}
                onClick={handleSeek}
                onTouchStart={(e) => {
                  const touch = e.touches[0];
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = touch.clientX - rect.left;
                  const percentage = Math.min(Math.max(x / rect.width, 0), 1);
                  if (audioRef.current && duration) {
                    audioRef.current.currentTime = percentage * duration;
                    setProgress(percentage * 100);
                  }
                }}
              >
                <div className="absolute top-0 left-0 right-0 bottom-0 flex items-center">
                  <div className="w-full h-1 bg-gray-300 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gray-900 dark:bg-white group-hover:bg-purple-600 dark:group-hover:bg-purple-400 relative transition-all duration-100"
                      style={{ width: `${progress}%` }}
                    >
                      {/* 拖动手柄 */}
                      <div
                        className={`absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-gray-900 dark:bg-white rounded-full shadow-lg ${isDraggingProgress ? "scale-125" : "scale-0 group-hover:scale-100"} transition-transform`}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Prefer actual audio duration, fallback to metadata string if not ready */}
              <span className="text-[10px] md:text-xs flex-shrink-0 min-w-[32px] text-right">
                {duration > 0 ? formatTime(duration) : currentSong.duration}
              </span>
            </div>
          </div>

          {/* Volume & Actions - Right */}
          <div className="flex items-center justify-end gap-2 md:gap-3 w-auto md:w-56 lg:w-72 flex-shrink-0">
            {/* Mobile: Favorite + Volume */}
            <button
              onClick={async () => {
                if (currentSong) {
                  const newFavoriteState = await toggleFavorite(
                    currentSong,
                    isFavorite
                  );
                  setIsFavorite(newFavoriteState);
                }
              }}
              className={`md:hidden p-1 transition-all active:scale-95 ${
                isFavorite ? "text-pink-500" : "text-gray-400"
              }`}
              title={isFavorite ? "取消收藏" : "收藏"}
            >
              <Icons.Heart
                size={20}
                className={isFavorite ? "fill-current" : ""}
              />
            </button>

            <button
              onClick={() => setVolume((prev) => (prev === 0 ? 0.7 : 0))}
              className="md:hidden p-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors active:scale-95"
            >
              {volume === 0 ? (
                <Icons.Disc
                  size={20}
                  className="text-gray-600 dark:text-gray-500"
                />
              ) : (
                <Icons.Volume2
                  size={20}
                  className="text-gray-600 dark:text-gray-400"
                />
              )}
            </button>

            {/* Desktop: Full volume control */}
            <button
              onClick={onOpenQueue}
              className="hidden lg:block p-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              title="播放队列"
            >
              <Icons.ListMusic size={18} />
            </button>
            <div className="hidden md:flex items-center gap-2 group">
              <button
                onClick={() => setVolume((prev) => (prev === 0 ? 0.7 : 0))}
                className="p-0.5"
              >
                {volume === 0 ? (
                  <Icons.Disc
                    size={18}
                    className="text-gray-600 dark:text-gray-500"
                  />
                ) : (
                  <Icons.Volume2
                    size={18}
                    className="text-gray-600 dark:text-gray-400"
                  />
                )}
              </button>
              <div
                ref={volumeBarRef}
                className="w-20 lg:w-24 h-1 bg-gray-300 dark:bg-gray-800 rounded-full overflow-hidden cursor-pointer relative py-2"
                onMouseDown={handleVolumeMouseDown}
                onClick={handleVolumeClick}
              >
                <div className="absolute top-1.5 left-0 w-full h-1 bg-gray-300 dark:bg-gray-800 rounded-full">
                  <div
                    className="h-full bg-gray-600 dark:bg-gray-500 group-hover:bg-gray-900 dark:group-hover:bg-white relative"
                    style={{ width: `${volume * 100}%` }}
                  >
                    {/* 音量拖动手柄 */}
                    <div
                      className={`absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-gray-900 dark:bg-white rounded-full shadow-lg ${isDraggingVolume ? "scale-125" : "scale-0 group-hover:scale-100"} transition-transform`}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
