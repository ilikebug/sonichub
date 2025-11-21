import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

// 获取系统缓存目录
function getSystemCacheDir(): string {
  // 优先使用环境变量指定的缓存目录（Docker 环境）
  if (process.env.SONICHUB_CACHE_DIR) {
    return process.env.SONICHUB_CACHE_DIR;
  }

  const platform = os.platform();
  const homeDir = os.homedir();

  let cacheBase: string;

  switch (platform) {
    case 'darwin': // macOS
      cacheBase = path.join(homeDir, 'Library', 'Caches');
      break;
    case 'win32': // Windows
      cacheBase = process.env.LOCALAPPDATA || path.join(homeDir, 'AppData', 'Local');
      break;
    default: // Linux and others
      // 在 Docker 容器中，使用 /tmp 目录
      cacheBase = process.env.XDG_CACHE_HOME || path.join(homeDir, '.cache');
  }

  return path.join(cacheBase, 'SonicHub', 'audio');
}

// 缓存目录
const CACHE_DIR = getSystemCacheDir();
const MAPPING_FILE = path.join(CACHE_DIR, 'song-mapping.json');

// 确保缓存目录存在
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// 生成歌曲唯一标识
function getSongKey(title: string, artist: string): string {
  const normalized = `${title.toLowerCase().trim()}_${artist.toLowerCase().trim()}`;
  return crypto.createHash('md5').update(normalized).digest('hex');
}

// 读取歌曲映射
function getSongMapping(): { [key: string]: { videoId: string, title: string, timestamp: number } } {
  try {
    if (fs.existsSync(MAPPING_FILE)) {
      const data = fs.readFileSync(MAPPING_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to read song mapping:', error);
  }
  return {};
}

// 保存歌曲映射
export function saveSongMapping(title: string, artist: string, videoId: string, videoTitle: string) {
  try {
    const mapping = getSongMapping();
    const key = getSongKey(title, artist);
    mapping[key] = {
      videoId,
      title: videoTitle,
      timestamp: Date.now()
    };
    fs.writeFileSync(MAPPING_FILE, JSON.stringify(mapping, null, 2));
  } catch (error) {
    console.error('Failed to save song mapping:', error);
  }
}

// 检查缓存 API
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const title = searchParams.get('title');
  const artist = searchParams.get('artist');

  if (!title || !artist) {
    return NextResponse.json({ error: 'Title and artist are required' }, { status: 400 });
  }

  try {

    // 1. 先检查歌曲映射，看是否已经搜索过这首歌
    const mapping = getSongMapping();
    const songKey = getSongKey(title, artist);
    const cachedInfo = mapping[songKey];

    if (cachedInfo) {

      // 2. 检查音频文件是否存在
      const possibleExtensions = ['mp4', 'm4a', 'webm', 'opus', 'mp3', 'ogg', 'wav', 'aac'];
      for (const ext of possibleExtensions) {
        const filePath = path.join(CACHE_DIR, `${cachedInfo.videoId}.${ext}`);
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

