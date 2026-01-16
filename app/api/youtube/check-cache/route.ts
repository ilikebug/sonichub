import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { AUDIO_CACHE_DIR } from '@/lib/cache';
import { songMapping } from '@/lib/store';

// 导出 saveSongMapping 供其他模块 (如 audio/route.ts) 使用
export const saveSongMapping = songMapping.save;

// 检查缓存 API
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const title = searchParams.get('title');
  const artist = searchParams.get('artist');

  if (!title || !artist) {
    return NextResponse.json({ error: 'Title and artist are required' }, { status: 400 });
  }

  try {
    // 1. 先从内存/文件检查映射
    const cachedInfo = songMapping.get(title, artist);

    if (cachedInfo) {
      // 2. 检查音频文件是否存在
      // 使用常用的扩展名检查，避免 stat
      const possibleExtensions = ['mp4', 'm4a', 'webm', 'opus', 'mp3'];

      for (const ext of possibleExtensions) {
        const filePath = path.join(AUDIO_CACHE_DIR, `${cachedInfo.videoId}.${ext}`);

        // fs.existsSync 是同步的，但在 API 路由中通常可以接受，
        // 如果想极致优化可以使用 fs.promises.access，但这里逻辑更简单
        if (fs.existsSync(filePath)) {
          // 缓存命中！返回代理 URL
          return NextResponse.json({
            cached: true,
            audioUrl: `/api/youtube/stream?videoId=${cachedInfo.videoId}`,
            videoId: cachedInfo.videoId,
            videoUrl: `https://www.youtube.com/watch?v=${cachedInfo.videoId}`,
            title: cachedInfo.title,
            usePreview: false
          });
        }
      }

      // 有映射但文件不存在，返回 videoId 让客户端去下载
      return NextResponse.json({
        cached: false,
        needSearch: false,
        videoId: cachedInfo.videoId
      });
    }

    // 没有缓存，需要搜索
    return NextResponse.json({
      cached: false,
      needSearch: true
    });

  } catch (error: any) {
    console.error('❌ Cache check error:', error.message);
    return NextResponse.json(
      {
        error: 'Failed to check cache',
        details: error.message
      },
      { status: 500 }
    );
  }
}

