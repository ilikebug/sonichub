'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Icons } from './Icons';

interface NetEaseLoginProps {
  onLoginSuccess: (cookie: string) => void;
  onClose: () => void;
}

export const NetEaseLogin: React.FC<NetEaseLoginProps> = ({ onLoginSuccess, onClose }) => {
  const [qrCode, setQrCode] = useState<string>('');
  const [qrKey, setQrKey] = useState<string>('');
  const [status, setStatus] = useState<string>('正在获取二维码...');
  const [isExpired, setIsExpired] = useState(false);

  const getQR = useCallback(async () => {
    try {
      setStatus('正在获取二维码...');
      setIsExpired(false);
      
      const keyRes = await fetch('/api/netease/qr/key');
      const { data: { unikey } } = await keyRes.json();
      setQrKey(unikey);

      const qrRes = await fetch(`/api/netease/qr/create?key=${unikey}`);
      const { data: { qrimg } } = await qrRes.json();
      setQrCode(qrimg);
      setStatus('请使用网易云音乐 App 扫码登录');
    } catch (error) {
      console.error('Failed to get QR code', error);
      setStatus('获取二维码失败，请稍后重试');
    }
  }, []);

  useEffect(() => {
    getQR();
  }, [getQR]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    const checkStatus = async () => {
      if (!qrKey || isExpired) return;

      try {
        const res = await fetch(`/api/netease/qr/check?key=${qrKey}`);
        const data = await res.json();

        if (data.code === 800) {
          setIsExpired(true);
          setStatus('二维码已过期，请刷新');
        } else if (data.code === 803) {
          // Success
          onLoginSuccess(data.cookie);
        } else if (data.code === 802) {
          setStatus('扫码成功，请在手机上确认');
        }
      } catch (error) {
        console.error('Check status error', error);
      }
    };

    if (qrKey && !isExpired) {
      timer = setInterval(checkStatus, 3000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [qrKey, isExpired, onLoginSuccess]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-gray-200 dark:border-white/10 relative overflow-hidden">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
        >
          <Icons.X size={24} />
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-500/20">
            <Icons.Music className="text-white w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">网易云登录</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">{status}</p>
        </div>

        <div className="relative aspect-square w-48 mx-auto bg-gray-100 dark:bg-white/5 rounded-2xl flex items-center justify-center overflow-hidden border border-gray-200 dark:border-white/10">
          {qrCode ? (
            <img src={qrCode} alt="NetEase QR Code" className={`w-full h-full ${isExpired ? 'opacity-20 blur-sm' : ''}`} />
          ) : (
            <div className="animate-pulse flex space-y-4 flex-col items-center">
               <div className="rounded-full bg-gray-300 dark:bg-gray-700 h-10 w-10"></div>
            </div>
          )}
          
          {isExpired && (
            <button 
              onClick={getQR}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/20 hover:bg-black/30 transition-colors group"
            >
              <div className="bg-white dark:bg-gray-800 p-3 rounded-full shadow-lg group-hover:scale-110 transition-transform">
                <Icons.Repeat className="text-red-500" size={24} />
              </div>
              <span className="text-white font-medium mt-2 drop-shadow-md">点击刷新</span>
            </button>
          )}
        </div>

        <div className="mt-8 text-center">
            <p className="text-xs text-gray-400 dark:text-gray-500">
                扫码登录后，您可以将喜欢的歌曲直接推送到您的网易云音乐云盘
            </p>
        </div>
      </div>
    </div>
  );
};
