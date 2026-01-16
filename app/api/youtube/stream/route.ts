import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { stat, readFile } from 'fs/promises';
import { buildYtDlpCommand } from '@/lib/ytdlp';

const execAsync = promisify(exec);

import { AUDIO_CACHE_DIR } from '@/lib/cache';

const CACHE_DIR = AUDIO_CACHE_DIR;

// 音频流端点 - 下载音频到缓存后提供播放
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const videoId = searchParams.get('videoId');

  if (!videoId) {
    return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
  }

  try {
    // 检查缓存文件（支持所有浏览器兼容的音频格式）
    const possibleExtensions = ['mp4', 'm4a', 'webm', 'opus', 'mp3', 'ogg', 'wav', 'aac'];
    let cachedFile = '';

    for (const ext of possibleExtensions) {
      const filePath = path.join(CACHE_DIR, `${videoId}.${ext}`);
      if (fs.existsSync(filePath)) {
        cachedFile = filePath;
        break;
      }
    }

    if (cachedFile) {
      return serveAudioFile(cachedFile, request);
    }

    // 缓存不存在，下载音频（多客户端重试策略）

    const outputTemplate = path.join(CACHE_DIR, `${videoId}.%(ext)s`);

    // 尝试不同的客户端和格式组合
    const strategies = [
      {
        name: 'Android Audio Only',
        // 140 is m4a, 251/250/249 is webm. Strictly avoid 18 (mp4 video)
        cmd: buildYtDlpCommand(`"https://www.youtube.com/watch?v=${videoId}" --extractor-args "youtube:player_client=android" -f "140/bestaudio[ext=m4a]/bestaudio" -o "${outputTemplate}" --no-playlist --no-warnings --force-ipv4`)
      },
      {
        name: 'iOS (fallback)',
        cmd: buildYtDlpCommand(`"https://www.youtube.com/watch?v=${videoId}" --extractor-args "youtube:player_client=ios" -f "bestaudio" -o "${outputTemplate}" --no-playlist --no-warnings --force-ipv4`)
      },
      {
        name: 'Web (last resort)',
        cmd: buildYtDlpCommand(`"https://www.youtube.com/watch?v=${videoId}" -f "bestaudio" -o "${outputTemplate}" --no-playlist --no-warnings --force-ipv4`)
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

    // 查找下载的文件（检查所有可能的格式）
    for (const ext of possibleExtensions) {
      const filePath = path.join(CACHE_DIR, `${videoId}.${ext}`);
      if (fs.existsSync(filePath)) {
        cachedFile = filePath;
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
