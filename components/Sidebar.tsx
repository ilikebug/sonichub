'use client';

import React from 'react';
import { Icons } from './Icons';
import { ViewType } from '../types';

interface SidebarProps {
  currentView: ViewType;
  onChangeView: (view: ViewType) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView }) => {
  return (
    <aside className="hidden md:flex w-72 flex-col h-full bg-white dark:bg-black/40 border-r border-gray-200 dark:border-white/10 pt-12 px-5 transition-colors duration-300">
      <div className="flex items-center gap-3 mb-10 px-2 electron-drag">
        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center electron-no-drag">
          <Icons.Music className="text-white w-5 h-5" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
          SonicHub
        </h1>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">Discover</h3>
          <nav className="space-y-1">
            <NavItem 
                icon={<Icons.Globe size={20} />} 
                label="Explore" 
                active={currentView === 'explore'} 
                onClick={() => onChangeView('explore')}
            />
            <NavItem 
                icon={<Icons.Radio size={20} />} 
                label="Radio" 
                active={currentView === 'radio'} 
                onClick={() => onChangeView('radio')}
            />
            <NavItem 
                icon={<Icons.Mic2 size={20} />} 
                label="Artists" 
                active={currentView === 'artists'} 
                onClick={() => onChangeView('artists')}
            />
          </nav>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">Library</h3>
          <nav className="space-y-1">
            <NavItem 
                icon={<Icons.Heart size={20} />} 
                label="Favorites" 
                active={currentView === 'favorites'} 
                onClick={() => onChangeView('favorites')}
            />
            {/* Albums is a placeholder for now */}
            <NavItem 
                icon={<Icons.Disc size={20} />} 
                label="Albums" 
                active={currentView === 'albums'} 
                onClick={() => onChangeView('albums')}
            />
            <NavItem 
                icon={<Icons.Download size={20} />} 
                label="Downloads" 
                active={currentView === 'downloads'} 
                onClick={() => onChangeView('downloads')}
            />
          </nav>
        </div>
      </div>
    </aside>
  );
};

const NavItem = ({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors electron-no-drag ${
      active 
        ? 'bg-purple-100 dark:bg-white/10 text-purple-600 dark:text-white' 
        : 'text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'
    }`}
  >
    {icon}
    <span className="text-base font-medium">{label}</span>
  </button>
);