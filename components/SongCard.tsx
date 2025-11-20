'use client';

import React from 'react';
import { Song, MusicPlatform } from '../types';
import { Icons } from './Icons';

interface SongCardProps {
  song: Song;
  onPlay: (song: Song) => void;
  onDownload: (song: Song) => void;
  onToggleLike: (song: Song) => void;
  isActive: boolean;
  isLiked: boolean;
}

export const SongCard: React.FC<SongCardProps> = ({ song, onPlay, onDownload, onToggleLike, isActive, isLiked }) => {
  
  const getPlatformColor = (p: MusicPlatform) => {
    switch(p) {
        case MusicPlatform.Spotify: return 'text-green-400 bg-green-400/10';
        case MusicPlatform.YouTube: return 'text-red-400 bg-red-400/10';
        case MusicPlatform.Bilibili: return 'text-pink-400 bg-pink-400/10';
        case MusicPlatform.QQMusic: return 'text-yellow-400 bg-yellow-400/10';
        case MusicPlatform.NetEase: return 'text-red-600 bg-red-600/10';
        default: return 'text-gray-400';
    }
  };

  return (
    <div className={`group relative p-3 rounded-xl transition-all duration-300 hover:bg-white/5 ${isActive ? 'bg-white/10' : ''}`}>
      <div className="relative aspect-square mb-3 overflow-hidden rounded-lg shadow-lg">
        <img 
          src={song.coverUrl} 
          alt={song.title} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
          <button 
            onClick={() => onPlay(song)}
            className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center hover:scale-110 hover:bg-purple-500 transition-all shadow-lg"
          >
            <Icons.Play size={20} className="text-white fill-current ml-1" />
          </button>
        </div>
        {/* Platform Badge */}
        <div className={`absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold backdrop-blur-md ${getPlatformColor(song.platform)}`}>
            {song.platform}
        </div>
        {/* Like Button */}
        <button 
            onClick={(e) => {
                e.stopPropagation();
                onToggleLike(song);
            }}
            className={`absolute bottom-2 right-2 p-2 rounded-full backdrop-blur-md transition-colors ${isLiked ? 'bg-pink-500/20 text-pink-500' : 'bg-black/20 text-white hover:bg-pink-500/20 hover:text-pink-500'}`}
        >
            <Icons.Heart size={14} className={isLiked ? 'fill-current' : ''} />
        </button>
      </div>

      <div className="flex justify-between items-start">
        <div className="min-w-0 flex-1">
          <h3 className={`font-semibold text-sm truncate ${isActive ? 'text-purple-400' : 'text-gray-100'}`}>
            {song.title}
          </h3>
          <p className="text-xs text-gray-500 truncate mt-0.5">{song.artist}</p>
        </div>
        <button 
          onClick={(e) => {
             e.stopPropagation();
             onDownload(song);
          }}
          className="text-gray-500 hover:text-purple-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Download"
        >
          <Icons.Download size={18} />
        </button>
      </div>
    </div>
  );
};