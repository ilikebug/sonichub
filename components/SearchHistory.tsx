'use client';

import React from 'react';
import { Icons } from './Icons';

interface SearchHistoryProps {
  history: string[];
  onSelectHistory: (query: string) => void;
  onClearHistory: () => void;
  onClose: () => void;
}

export const SearchHistory: React.FC<SearchHistoryProps> = ({
  history,
  onSelectHistory,
  onClearHistory,
  onClose,
}) => {
  if (history.length === 0) {
    return (
      <div 
        data-search-history
        className="absolute top-full left-0 right-0 mt-2 mx-4 md:mx-auto bg-white dark:bg-[#1a1a1f] border border-gray-300 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 max-w-2xl"
      >
        <div className="p-6 text-center text-gray-600 dark:text-gray-500">
          <Icons.Search className="mx-auto mb-2 opacity-50" size={32} />
          <p className="text-sm">暂无搜索历史</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      data-search-history
      className="absolute top-full left-0 right-0 mt-2 mx-4 md:mx-auto bg-white dark:bg-[#1a1a1f] border border-gray-300 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 max-w-2xl animate-fade-in"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-white/10">
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <Icons.Clock size={16} />
          <span className="text-sm font-medium">搜索历史</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onClearHistory}
            className="text-xs text-gray-600 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-white/5"
            title="清除所有历史"
          >
            清空
          </button>
          <button
            onClick={onClose}
            className="text-gray-600 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
            title="关闭"
          >
            <Icons.X size={18} />
          </button>
        </div>
      </div>

      {/* History List */}
      <div className="max-h-80 overflow-y-auto">
        {history.map((item, index) => (
          <button
            key={index}
            onClick={() => onSelectHistory(item)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors group text-left"
          >
            <Icons.Clock size={16} className="text-gray-600 dark:text-gray-500 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors flex-shrink-0" />
            <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors truncate">
              {item}
            </span>
            <Icons.ArrowUpRight size={16} className="text-gray-400 dark:text-gray-600 group-hover:text-purple-600 dark:group-hover:text-purple-400 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
};

