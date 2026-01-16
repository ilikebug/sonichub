import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { PassThrough, Readable } from 'stream';
import fs from 'fs';
import path from 'path';
import { stat, readFile } from 'fs/promises';
import { getYtDlpPath } from '@/lib/ytdlp';
import { AUDIO_CACHE_DIR } from '@/lib/cache';

const CACHE_DIR = AUDIO_CACHE_DIR;

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

    // 2. 缓存不存在，启动流式下载
    // 我们强制使用 m4a/aac 格式，因为它对流式传输支持较好，且兼容性高
    const ytdlpPath = getYtDlpPath();
    const targetExt = 'm4a';
    const finalFilePath = path.join(CACHE_DIR, `${videoId}.${targetExt}`);
    const tempFilePath = path.join(CACHE_DIR, `${videoId}.temp.${targetExt}`);

    // 清理可能存在的旧临时文件
    if (fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (e) { /* ignore */ }
    }

    // 构建 yt-dlp 参数 - 输出到 stdout (-)
    // 构建 yt-dlp 参数 - 输出到 stdout (-)
    const args = [
      `https://www.youtube.com/watch?v=${videoId}`,
      '-f', 'bestaudio[ext=m4a]/bestaudio', // 优先 m4a，如果没有则使用最佳音频
      '-o', '-', // 输出到标准输出
      '--no-playlist',
      '--no-warnings',
      '--force-ipv4'
    ];

    console.log(`🚀 Starting stream for ${videoId}`);
    const child = spawn(ytdlpPath, args);

    // 创建流转换
    // PassThrough用于分流：一路去 HTTP 响应，一路去文件
    const streamProxy = new PassThrough();
    const fileWriter = fs.createWriteStream(tempFilePath);

    // 错误处理标记
    let hasError = false;

    // 监听子进程错误
    child.on('error', (err) => {
      console.error('❌ Spawn error:', err);
      hasError = true;
      streamProxy.end(); // 结束流
      fileWriter.end();
      // 删除临时文件
      fs.unlink(tempFilePath, () => { });
    });

    child.stderr.on('data', (data) => {
      const msg = data.toString();
      // 只记录错误，忽略进度条等
      if (msg.includes('ERROR:')) {
        console.error('yt-dlp stderr:', msg);
      }
    });

    // 监听子进程关闭
    child.on('close', async (code) => {
      if (code !== 0) {
        console.error(`yt-dlp exited with code ${code}`);
        hasError = true;
        // 如果失败，清理
        fs.unlink(tempFilePath, () => { });
      } else {
        // 成功，重命名临时文件为正式文件
        if (!hasError) {
          console.log(`✅ Stream download complete for ${videoId}`);
          fileWriter.end(() => {
            fs.rename(tempFilePath, finalFilePath, () => { });
          });
        }
      }
      // 确保流结束（虽然 pipe 应该会自动处理，但以防万一）
      if (!streamProxy.writableEnded) {
        streamProxy.end();
      }
    });

    // 管道连接
    // child.stdout -> streamProxy (Response)
    // child.stdout -> fileWriter (Cache)
    child.stdout.pipe(streamProxy);
    child.stdout.pipe(fileWriter);

    // 将 Node Stream 转换为 Web ReadableStream 以供 NextResponse 使用
    // Node.js v16.5+ 支持 Readable.toWeb，Next.js 环境通常支持
    // @ts-ignore - 类型定义可能不匹配但运行时支持
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
