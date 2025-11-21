'use client';

import React, { useState } from 'react';
import { Icons } from '@/components/Icons';

interface LockScreenProps {
  onUnlock: () => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({ onUnlock }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const handleUnlock = async () => {
    if (!password.trim()) {
      setError('请输入密码');
      return;
    }

    setIsChecking(true);
    setError('');

    try {
      // 调用 API 验证密码
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (data.success) {
        onUnlock();
      } else {
        setError('密码错误');
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
        setPassword('');
      }
    } catch (err) {
      setError('验证失败，请重试');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    } finally {
      setIsChecking(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isChecking) {
      handleUnlock();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* 背景动画效果 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className={`relative z-10 w-full max-w-md mx-4 ${isShaking ? 'animate-shake' : ''}`}>
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-white/20">
          {/* Logo 和标题 */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full mb-4 shadow-lg">
              <Icons.Lock className="text-white" size={32} />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">SonicHub</h1>
            <p className="text-gray-300 text-sm">
              请输入访问密码
            </p>
          </div>

          {/* 密码输入表单 */}
          <div className="space-y-4">
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="输入密码"
                disabled={isChecking}
                className="w-full bg-white/10 border border-white/20 rounded-lg py-3 px-4 pr-12 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all disabled:opacity-50"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                disabled={isChecking}
              >
                {showPassword ? <Icons.EyeOff size={20} /> : <Icons.Eye size={20} />}
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                <Icons.AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleUnlock}
              disabled={isChecking}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium py-3 rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isChecking ? '验证中...' : '解锁'}
            </button>
          </div>

          {/* 提示信息 */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-400">
              访问密码由管理员设置
            </p>
          </div>
        </div>

        {/* 底部装饰 */}
        <div className="mt-6 text-center">
          <p className="text-gray-400 text-xs">
            🔒 私密音乐空间
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
          20%, 40%, 60%, 80% { transform: translateX(10px); }
        }
        .animate-shake {
          animation: shake 0.5s;
        }
      `}</style>
    </div>
  );
};
