'use client';

import React from 'react';
import { Icons } from './Icons';
import { ViewType } from '../types';

interface MobileSidebarProps {
  currentView: ViewType;
  onChangeView: (view: ViewType) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const MobileSidebar: React.FC<MobileSidebarProps> = ({
  currentView,
  onChangeView,
  isOpen,
  onClose,
}) => {
  const handleViewChange = (view: ViewType) => {
    onChangeView(view);
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-fade-in"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 bottom-0 w-72 bg-white dark:bg-[#09090b] border-r border-gray-200 dark:border-white/10 z-50 md:hidden transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full pt-6 px-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-10 px-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Icons.Music className="text-white w-5 h-5" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
                SonicHub
              </h1>
            </div>
            <button
              onClick={onClose}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <Icons.X size={24} />
            </button>
          </div>

          {/* Navigation */}
          <div className="space-y-6 flex-1 overflow-y-auto">
            <div>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-500 text-gray-600 uppercase tracking-wider mb-3 px-2">
                Discover
              </h3>
              <nav className="space-y-1">
                <NavItem
                  icon={<Icons.Globe size={20} />}
                  label="Explore"
                  active={currentView === 'explore'}
                  onClick={() => handleViewChange('explore')}
                />
                <NavItem
                  icon={<Icons.Radio size={20} />}
                  label="Radio"
                  active={currentView === 'radio'}
                  onClick={() => handleViewChange('radio')}
                />
                <NavItem
                  icon={<Icons.Mic2 size={20} />}
                  label="Artists"
                  active={currentView === 'artists'}
                  onClick={() => handleViewChange('artists')}
                />
              </nav>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-500 text-gray-600 uppercase tracking-wider mb-3 px-2">
                Library
              </h3>
              <nav className="space-y-1">
                <NavItem
                  icon={<Icons.Heart size={20} />}
                  label="Favorites"
                  active={currentView === 'favorites'}
                  onClick={() => handleViewChange('favorites')}
                />
                <NavItem
                  icon={<Icons.Disc size={20} />}
                  label="Albums"
                  active={currentView === 'albums'}
                  onClick={() => handleViewChange('albums')}
                />
                <NavItem
                  icon={<Icons.Download size={20} />}
                  label="Downloads"
                  active={currentView === 'downloads'}
                  onClick={() => handleViewChange('downloads')}
                />
              </nav>
            </div>
          </div>

          {/* Footer */}
          <div className="py-4 border-t border-gray-200 dark:border-white/10">
            <p className="text-xs text-gray-600 dark:text-gray-500 text-center">
              SonicHub © 2024
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};

const NavItem = ({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
      active
        ? 'bg-purple-100 dark:bg-white/10 text-purple-600 dark:text-white'
        : 'text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'
    }`}
  >
    {icon}
    <span className="text-base font-medium">{label}</span>
  </button>
);

