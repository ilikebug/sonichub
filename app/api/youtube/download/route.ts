import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { readFile } from 'fs/promises';

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

const CACHE_DIR = getSystemCacheDir();

// 确保缓存目录存在
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// 下载端点 - 确保文件存在并返回为附件
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const videoId = searchParams.get('videoId');
  const filename = searchParams.get('filename') || 'audio';

  if (!videoId) {
    return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
  }

  try {

    // 检查缓存文件
    const possibleExtensions = ['mp4', 'm4a', 'webm', 'opus', 'mp3', 'ogg', 'wav', 'aac'];
    let cachedFile = '';
    let fileExt = '';

    for (const ext of possibleExtensions) {
      const filePath = path.join(CACHE_DIR, `${videoId}.${ext}`);
      if (fs.existsSync(filePath)) {
        cachedFile = filePath;
        fileExt = ext;
        break;
      }
    }

    // 如果没有缓存，先下载（多客户端重试策略）
    if (!cachedFile) {

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
          await execAsync(strategy.cmd, {
            timeout: 60000,
            maxBuffer: 1024 * 1024 * 50,
            killSignal: 'SIGTERM'
          });
          break; // 成功则跳出循环
        } catch (error: any) {
          lastError = error;
          // 继续尝试下一个策略
        }
      }

      // 再次查找
      for (const ext of possibleExtensions) {
        const filePath = path.join(CACHE_DIR, `${videoId}.${ext}`);
        if (fs.existsSync(filePath)) {
          cachedFile = filePath;
          fileExt = ext;
          break;
        }
      }

      if (!cachedFile) {
        throw lastError || new Error('All download strategies failed');
      }
    }

    // 读取文件并返回为下载
    const fileBuffer = await readFile(cachedFile);
    const headers = new Headers();

    // 设置为附件下载
    headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}.${fileExt}"`);
    headers.set('Content-Type', getContentType(fileExt));
    headers.set('Content-Length', fileBuffer.length.toString());


    return new NextResponse(fileBuffer, {
      status: 200,
      headers
    });

  } catch (error: any) {
    console.error('❌ Download error:', error.message);
    return NextResponse.json(
      {
        error: 'Failed to prepare download',
        details: error.message
      },
      { status: 500 }
    );
  }
}

// 根据扩展名获取 Content-Type
function getContentType(ext: string): string {
  const contentTypes: { [key: string]: string } = {
    'mp4': 'audio/mp4',
    'm4a': 'audio/mp4',
    'mp3': 'audio/mpeg',
    'webm': 'audio/webm',
    'opus': 'audio/opus',
    'ogg': 'audio/ogg',
    'wav': 'audio/wav',
    'aac': 'audio/aac',
    'flac': 'audio/flac'
  };
  return contentTypes[ext] || 'audio/mpeg';
}

