import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { stat, readFile } from 'fs/promises';

const execAsync = promisify(exec);

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

// 音频缓存目录
const CACHE_DIR = getSystemCacheDir();

// 确保缓存目录存在
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  console.log('📁 Created cache directory:', CACHE_DIR);
}

// 音频流端点 - 下载音频到缓存后提供播放
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const videoId = searchParams.get('videoId');

  if (!videoId) {
    return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
  }

  try {
    console.log('🎵 Processing audio for video:', videoId);

    // 检查缓存文件（支持所有浏览器兼容的音频格式）
    const possibleExtensions = ['mp4', 'm4a', 'webm', 'opus', 'mp3', 'ogg', 'wav', 'aac'];
    let cachedFile = '';

    for (const ext of possibleExtensions) {
      const filePath = path.join(CACHE_DIR, `${videoId}.${ext}`);
      if (fs.existsSync(filePath)) {
        cachedFile = filePath;
        console.log(`✅ Using cached audio file: ${ext}`);
        break;
      }
    }

    if (cachedFile) {
      return serveAudioFile(cachedFile, request);
    }

    // 缓存不存在，下载音频（多客户端重试策略）
    console.log('📥 Downloading audio...');

    const outputTemplate = path.join(CACHE_DIR, `${videoId}.%(ext)s`);

    // 尝试不同的客户端和格式组合
    const strategies = [
      {
        name: 'Android',
        cmd: `yt-dlp "https://www.youtube.com/watch?v=${videoId}" --extractor-args "youtube:player_client=android" -f "18/bestaudio" -o "${outputTemplate}" --no-playlist --no-warnings`
      },
      {
        name: 'iOS (fallback)',
        cmd: `yt-dlp "https://www.youtube.com/watch?v=${videoId}" --extractor-args "youtube:player_client=ios" -f "bestaudio" -o "${outputTemplate}" --no-playlist --no-warnings`
      },
      {
        name: 'Web (last resort)',
        cmd: `yt-dlp "https://www.youtube.com/watch?v=${videoId}" -f "bestaudio" -o "${outputTemplate}" --no-playlist --no-warnings`
      }
    ];

    let lastError = null;

    for (const strategy of strategies) {
      try {
        console.log(`🔄 Trying ${strategy.name} client...`);
        await execAsync(strategy.cmd, {
          timeout: 60000,
          maxBuffer: 1024 * 1024 * 50,
          killSignal: 'SIGTERM'
        });
        console.log(`✅ Success with ${strategy.name} client`);
        break; // 成功则跳出循环
      } catch (error: any) {
        console.log(`❌ ${strategy.name} failed:`, error.message);
        lastError = error;
        // 继续尝试下一个策略
      }
    }

    // 查找下载的文件（检查所有可能的格式）
    for (const ext of possibleExtensions) {
      const filePath = path.join(CACHE_DIR, `${videoId}.${ext}`);
      if (fs.existsSync(filePath)) {
        cachedFile = filePath;
        console.log(`✅ Audio downloaded: ${ext}`);
        break;
      }
    }

    if (!cachedFile) {
      // 所有策略都失败了
      throw lastError || new Error('All download strategies failed');
    }

    return serveAudioFile(cachedFile, request);

  } catch (error: any) {
    console.error('❌ Stream error:', error.message);

    // 如果是超时错误
    if (error.killed || error.signal === 'SIGTERM') {
      return NextResponse.json({ error: 'Download timeout' }, { status: 408 });
    }

    return NextResponse.json(
      {
        error: 'Failed to process audio',
        details: error.message
      },
      { status: 500 }
    );
  }
}

// 根据文件扩展名获取 Content-Type
function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const contentTypes: { [key: string]: string } = {
    '.mp4': 'audio/mp4',
    '.m4a': 'audio/mp4',
    '.mp3': 'audio/mpeg',
    '.webm': 'audio/webm',
    '.opus': 'audio/opus',
    '.ogg': 'audio/ogg',
    '.wav': 'audio/wav',
    '.aac': 'audio/aac',
    '.flac': 'audio/flac'
  };
  return contentTypes[ext] || 'audio/mpeg';
}

// 提供音频文件，支持 Range 请求
async function serveAudioFile(filePath: string, request: NextRequest) {
  try {
    const fileStats = await stat(filePath);
    const fileSize = fileStats.size;
    const range = request.headers.get('range');
    const contentType = getContentType(filePath);

    // 如果有 Range 请求（用于音频快进）
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      const fileBuffer = await readFile(filePath);
      const chunk = fileBuffer.slice(start, end + 1);

      const headers = new Headers();
      headers.set('Content-Range', `bytes ${start}-${end}/${fileSize}`);
      headers.set('Accept-Ranges', 'bytes');
      headers.set('Content-Length', chunkSize.toString());
      headers.set('Content-Type', contentType);
      headers.set('Cache-Control', 'public, max-age=86400');

      return new NextResponse(chunk, {
        status: 206,
        headers
      });
    }

    // 没有 Range 请求，返回完整文件
    const fileBuffer = await readFile(filePath);
    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Content-Length', fileSize.toString());
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Cache-Control', 'public, max-age=86400');

    return new NextResponse(fileBuffer, {
      status: 200,
      headers
    });
  } catch (error: any) {
    console.error('❌ File serve error:', error.message);
    return NextResponse.json({ error: 'Failed to serve file' }, { status: 500 });
  }
}
