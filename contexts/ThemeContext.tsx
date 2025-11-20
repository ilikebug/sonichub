'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  // 初始化主题
  useEffect(() => {
    setMounted(true);
    
    // 从 localStorage 加载主题偏好
    try {
      const savedTheme = localStorage.getItem('sonichub_theme') as Theme;
      if (savedTheme && (savedTheme === 'dark' || savedTheme === 'light')) {
        console.log('Loading saved theme:', savedTheme);
        setTheme(savedTheme);
        // 立即应用主题
        document.documentElement.classList.remove('dark', 'light');
        document.documentElement.classList.add(savedTheme);
      } else {
        // 检测系统主题偏好
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const initialTheme = prefersDark ? 'dark' : 'light';
        console.log('Using system theme:', initialTheme);
        setTheme(initialTheme);
        // 立即应用主题
        document.documentElement.classList.remove('dark', 'light');
        document.documentElement.classList.add(initialTheme);
      }
    } catch (error) {
      console.error('Failed to load theme:', error);
    }
  }, []);

  // 当主题改变时应用到 DOM
  useEffect(() => {
    if (!mounted) return;

    try {
      // 应用主题到 document
      const root = document.documentElement;
      root.classList.remove('dark', 'light');
      root.classList.add(theme);
      
      // 保存到 localStorage
      localStorage.setItem('sonichub_theme', theme);
      
      console.log('✅ Theme applied:', theme);
    } catch (error) {
      console.error('❌ Failed to apply theme:', error);
    }
  }, [theme, mounted]);

  const toggleTheme = () => {
    console.log('🔄 Toggling theme from:', theme);
    setTheme(prevTheme => {
      const newTheme = prevTheme === 'dark' ? 'light' : 'dark';
      console.log('➡️ New theme will be:', newTheme);
      return newTheme;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

