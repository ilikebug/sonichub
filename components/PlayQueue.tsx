'use client';

import React from 'react';
import { Song } from '../types';
import { Icons } from './Icons';

interface PlayQueueProps {
  songs: Song[];
  currentSong: Song | null;
  isOpen: boolean;
  onClose: () => void;
  onPlaySong: (song: Song) => void;
  onRemoveSong: (songId: string) => void;
  onClearQueue: () => void;
}

export const PlayQueue: React.FC<PlayQueueProps> = ({
  songs,
  currentSong,
  isOpen,
  onClose,
  onPlaySong,
  onRemoveSong,
  onClearQueue,
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* 遮罩层 */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* 队列面板 */}
      <div className="fixed right-0 top-0 bottom-0 w-full sm:w-96 bg-white dark:bg-[#09090b] border-l border-gray-200 dark:border-white/10 z-50 animate-slide-in-right flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-white/10">
          <div className="flex items-center gap-3">
            <Icons.ListMusic size={24} className="text-purple-500" />
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                播放队列
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {songs.length} 首歌曲
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
          >
            <Icons.X size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* 操作按钮 */}
        {songs.length > 0 && (
          <div className="p-4 border-b border-gray-200 dark:border-white/10">
            <button
              onClick={onClearQueue}
              className="w-full px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Icons.Trash2 size={16} />
              <span className="text-sm font-medium">清空队列</span>
            </button>
          </div>
        )}

        {/* 队列列表 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {songs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
              <Icons.ListMusic size={48} className="text-gray-400 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">队列为空</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                搜索并播放歌曲来添加到队列
              </p>
            </div>
          ) : (
            songs.map((song, index) => {
              const isCurrentSong = currentSong?.id === song.id;
              return (
                <div
                  key={`${song.id}-${index}`}
                  className={`group flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer ${
                    isCurrentSong
                      ? 'bg-purple-500/10 border border-purple-500/30'
                      : 'hover:bg-gray-100 dark:hover:bg-white/5 border border-transparent'
                  }`}
                  onClick={() => onPlaySong(song)}
                >
                  {/* 序号或播放图标 */}
                  <div className="w-8 flex items-center justify-center flex-shrink-0">
                    {isCurrentSong ? (
                      <Icons.Play
                        size={16}
                        className="text-purple-500 fill-current"
                      />
                    ) : (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {index + 1}
                      </span>
                    )}
                  </div>

                  {/* 封面 */}
                  <img
                    src={song.coverUrl}
                    alt={song.title}
                    className={`w-12 h-12 rounded-md object-cover flex-shrink-0 ${
                      isCurrentSong ? 'ring-2 ring-purple-500' : ''
                    }`}
                  />

                  {/* 歌曲信息 */}
                  <div className="flex-1 min-w-0">
                    <h3
                      className={`font-medium truncate text-sm ${
                        isCurrentSong
                          ? 'text-purple-500'
                          : 'text-gray-900 dark:text-white'
                      }`}
                    >
                      {song.title}
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                      {song.artist}
                    </p>
                  </div>

                  {/* 删除按钮 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveSong(song.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-500/10 rounded-lg transition-all"
                  >
                    <Icons.X size={16} className="text-red-500" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* 底部提示 */}
        {songs.length > 0 && (
          <div className="p-4 border-t border-gray-200 dark:border-white/10">
            <p className="text-xs text-center text-gray-500 dark:text-gray-400">
              点击歌曲播放 • 悬停显示删除按钮
            </p>
          </div>
        )}
      </div>
    </>
  );
};

