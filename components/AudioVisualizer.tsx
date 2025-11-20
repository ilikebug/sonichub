'use client';

import React, { useRef, useEffect, useState } from 'react';

interface AudioVisualizerProps {
  audioElement: HTMLAudioElement | null;
  isPlaying: boolean;
  className?: string;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  audioElement,
  isPlaying,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [dataArray, setDataArray] = useState<Uint8Array | null>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);

  // 初始化 Web Audio API
  useEffect(() => {
    if (!audioElement || audioContext) return;

    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyserNode = ctx.createAnalyser();
      analyserNode.fftSize = 256; // 频谱分辨率
      
      const bufferLength = analyserNode.frequencyBinCount;
      const dataArr = new Uint8Array(bufferLength);

      // 连接音频源
      const source = ctx.createMediaElementSource(audioElement);
      source.connect(analyserNode);
      analyserNode.connect(ctx.destination);

      setAudioContext(ctx);
      setAnalyser(analyserNode);
      setDataArray(dataArr);
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
    }
  }, [audioElement, audioContext]);

  // 绘制频谱
  const draw = () => {
    if (!canvasRef.current || !analyser || !dataArray) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 获取频谱数据
    analyser.getByteFrequencyData(dataArray);

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制参数
    const barCount = 64; // 显示的柱子数量
    const barWidth = canvas.width / barCount;
    const maxBarHeight = canvas.height;

    // 创建渐变色
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#a855f7'); // purple-500
    gradient.addColorStop(0.5, '#8b5cf6'); // purple-600
    gradient.addColorStop(1, '#6366f1'); // indigo-500

    // 绘制频谱柱
    for (let i = 0; i < barCount; i++) {
      // 从频谱数据中取样
      const dataIndex = Math.floor((i / barCount) * dataArray.length);
      const value = dataArray[dataIndex];
      
      // 计算柱子高度（归一化）
      const barHeight = (value / 255) * maxBarHeight;
      
      // 计算柱子位置
      const x = i * barWidth;
      const y = maxBarHeight - barHeight;

      // 绘制柱子
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barWidth - 2, barHeight);

      // 添加发光效果
      if (isPlaying && barHeight > maxBarHeight * 0.3) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#a855f7';
        ctx.fillRect(x, y, barWidth - 2, barHeight);
        ctx.shadowBlur = 0;
      }
    }

    // 继续动画
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(draw);
    }
  };

  // 控制动画
  useEffect(() => {
    if (isPlaying && analyser && dataArray) {
      // 恢复 AudioContext（浏览器自动暂停策略）
      if (audioContext?.state === 'suspended') {
        audioContext.resume();
      }
      draw();
    } else {
      // 停止动画
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      // 清空画布
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, analyser, dataArray, audioContext]);

  // 清理资源
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContext) {
        audioContext.close();
      }
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        width={600}
        height={64}
        className="w-full h-full"
        style={{ imageRendering: 'crisp-edges' }}
      />
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex gap-1">
            {[...Array(48)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-gradient-to-t from-purple-500/20 to-indigo-500/20 rounded-full"
                style={{
                  height: `${20 + Math.random() * 20}%`,
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

