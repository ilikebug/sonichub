'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Icons } from './Icons';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleTheme();
  };

  // 在客户端挂载前显示占位符
  if (!mounted) {
    return (
      <div className="relative w-10 h-10 rounded-full bg-gray-200 dark:bg-white/5 border border-gray-300 dark:border-white/10 flex items-center justify-center">
        <Icons.Sun size={18} className="text-gray-500" />
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      type="button"
      className="relative w-10 h-10 rounded-full bg-gray-200 dark:bg-white/5 border border-gray-300 dark:border-white/10 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-white/10 transition-all group"
      title={theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
      aria-label={theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
    >
      {theme === 'dark' ? (
        <Icons.Sun size={18} className="text-yellow-400 group-hover:rotate-45 transition-transform duration-300" />
      ) : (
        <Icons.Moon size={18} className="text-indigo-600 group-hover:-rotate-12 transition-transform duration-300" />
      )}
    </button>
  );
};

