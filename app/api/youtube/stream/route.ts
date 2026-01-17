import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { PassThrough, Readable } from 'stream';
import fs from 'fs';
import path from 'path';
import { stat, readFile } from 'fs/promises';
import { getYtDlpPath } from '@/lib/ytdlp';
import { AUDIO_CACHE_DIR } from '@/lib/cache';

const CACHE_DIR = AUDIO_CACHE_DIR;

// 辅助函数：尝试启动流
async function startAudioStream(videoId: string, ytdlpPath: string, strategy: any) {
  return new Promise<{ child: any, streamProxy: any, fileWriter: any, tempFilePath: string }>((resolve, reject) => {
    const targetExt = 'm4a'; // 默认扩展名
    const tempFilePath = path.join(CACHE_DIR, `${videoId}.temp.${Date.now()}.${targetExt}`);

    console.log(`🚀 Starting stream for ${videoId} using strategy: ${strategy.name}`);
    const child = spawn(ytdlpPath, strategy.args);

    const streamProxy = new PassThrough();
    const fileWriter = fs.createWriteStream(tempFilePath);
    let hasData = false;
    let hasError = false;

    // 监听数据，一旦有数据就认为启动成功
    child.stdout.once('data', (chunk) => {
      hasData = true;
      // 把这第一块数据写回去，防止丢失
      streamProxy.write(chunk);
      fileWriter.write(chunk);

      // 管道连接后续数据
      child.stdout.pipe(streamProxy);
      child.stdout.pipe(fileWriter);

      resolve({ child, streamProxy, fileWriter, tempFilePath });
    });

    child.on('error', (err) => {
      hasError = true;
      reject(err);
    });

    child.on('close', (code) => {
      if (!hasData || code !== 0) {
        if (!hasData) {
          // 如果还没收到数据就关闭了，说明失败
          hasError = true;
          fs.unlink(tempFilePath, () => { });
          reject(new Error(`Process exited with code ${code} before sending data`));
        }
      }
    });

    // 监听 stderr 以捕获早期错误
    child.stderr.on('data', (data) => {
      const msg = data.toString();
      // 如果遇到 403 Forbidden，立即拒绝
      if (msg.includes('HTTP Error 403') || msg.includes('Sign in to confirm your age')) {
        hasError = true;
        // 杀掉进程
        child.kill();
        reject(new Error(msg));
      }
    });

  });
}

// 音频流端点 - 优先流式播放，同时下载到缓存
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const videoId = searchParams.get('videoId');

  if (!videoId) {
    return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
  }

  try {
    // 1. 检查缓存文件（完全下载的文件）
    const possibleExtensions = ['m4a', 'mp4', 'webm', 'opus', 'mp3', 'ogg', 'wav', 'aac'];
    let cachedFile = '';

    for (const ext of possibleExtensions) {
      const filePath = path.join(CACHE_DIR, `${videoId}.${ext}`);
      if (fs.existsSync(filePath)) {
        // 检查文件是否有效（非空）
        try {
          const stats = fs.statSync(filePath);
          if (stats.size > 0) {
            cachedFile = filePath;
            break;
          }
        } catch (e) {
          // ignore
        }
      }
    }

    // 如果缓存存在，直接服务静态文件（支持 Seek/Range）
    if (cachedFile) {
      return serveAudioFile(cachedFile, request);
    }

    // 2. 缓存不存在，启动流式下载 (多策略重试)
    const ytdlpPath = getYtDlpPath();
    const finalFilePath = path.join(CACHE_DIR, `${videoId}.m4a`); // 最终我们总是尝试存为 m4a

    // 定义策略
    const strategies = [
      {
        name: 'Android Client',
        args: [
          `https://www.youtube.com/watch?v=${videoId}`,
          '--extractor-args', 'youtube:player_client=android',
          '-f', '140/bestaudio[ext=m4a]/bestaudio', // 恢复 140 格式
          '-o', '-',
          '--no-playlist', '--no-warnings', '--force-ipv4'
        ]
      },
      {
        name: 'iOS Client',
        args: [
          `https://www.youtube.com/watch?v=${videoId}`,
          '--extractor-args', 'youtube:player_client=ios',
          '-f', 'bestaudio', // iOS 策略通常使用 bestaudio
          '-o', '-',
          '--no-playlist', '--no-warnings', '--force-ipv4'
        ]
      },
      {
        name: 'Web Client',
        args: [
          `https://www.youtube.com/watch?v=${videoId}`,
          // Web 客户端不需要特定的 extractor-args，或者使用 default
          '-f', 'bestaudio',
          '-o', '-',
          '--no-playlist', '--no-warnings', '--force-ipv4'
        ]
      }
    ];

    let streamResult = null;
    let lastError = null;

    for (const strategy of strategies) {
      try {
        streamResult = await startAudioStream(videoId, ytdlpPath, strategy);
        break; // 成功则跳出
      } catch (err: any) {
        console.error(`❌ Strategy ${strategy.name} failed:`, err.message);
        lastError = err;
      }
    }

    if (!streamResult) {
      throw new Error(`All strategies failed. Last error: ${lastError?.message}`);
    }

    const { child, streamProxy, fileWriter, tempFilePath } = streamResult;

    // 继续监听关闭事件以处理文件重命名
    child.on('close', (code: number) => {
      if (code === 0) {
        console.log(`✅ Stream download complete for ${videoId}`);
        fileWriter.end(() => {
          // 只有成功才重命名覆盖
          fs.rename(tempFilePath, finalFilePath, () => { });
        });
      } else {
        console.error(`Stream interrupted with code ${code}`);
        fileWriter.end();
        fs.unlink(tempFilePath, () => { });
      }
      if (!streamProxy.writableEnded) streamProxy.end();
    });

    // 将 Node Stream 转换为 Web ReadableStream 以供 NextResponse 使用
    // @ts-ignore
    const webStream = Readable.toWeb(streamProxy);

    return new NextResponse(webStream as any, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mp4',
        'Cache-Control': 'no-cache',
        'Content-Disposition': `inline; filename="${videoId}.m4a"`,
        'X-Content-Type-Options': 'nosniff'
      }
    });

  } catch (error: any) {
    console.error('❌ Stream setup error:', error.message);
    return NextResponse.json(
      {
        error: 'Failed to process audio stream',
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

// 提供已存在的音频文件，支持 Range 请求
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
