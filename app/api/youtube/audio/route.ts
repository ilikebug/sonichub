import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { saveSongMapping } from '../check-cache/route';

const execAsync = promisify(exec);

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const title = searchParams.get('title');
  const artist = searchParams.get('artist');

  console.log('🎵 Fetching audio:', title, '-', artist);

  if (!title || !artist) {
    return NextResponse.json({ error: 'Title and artist are required' }, { status: 400 });
  }

  try {
    const query = `${title} ${artist} official audio`;
    console.log('🔍 Searching YouTube:', query);

    // 获取视频信息
    const infoCmd = `yt-dlp "ytsearch1:${query}" --print "%(id)s|%(title)s|%(duration)s" --no-playlist --no-warnings`;
    const { stdout: infoStr } = await execAsync(infoCmd, { 
      timeout: 10000,
      killSignal: 'SIGTERM'
    });
    
    const [videoId, videoTitle, duration] = infoStr.trim().split('|');

    if (!videoId) {
      console.log('❌ No video found');
      return NextResponse.json({ error: 'No video found' }, { status: 404 });
    }

    console.log('✅ Audio ready:', videoTitle);

    // 保存歌曲映射，下次可以直接使用
    saveSongMapping(title, artist, videoId, videoTitle);

    // 返回代理 URL，通过服务器端转发音频流
    // 这样可以绕过 CORS 和 YouTube URL 的权限限制
    const proxyUrl = `/api/youtube/stream?videoId=${videoId}`;
    console.log('📝 Using proxy URL for streaming');

    return NextResponse.json({
      audioUrl: proxyUrl,
      videoId: videoId || '',
      videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
      title: videoTitle || title,
      duration: parseInt(duration) || 0,
      usePreview: false
    });

  } catch (error: any) {
    console.error('❌ yt-dlp error:', error.message);
    
    // 超时或其他错误
    if (error.killed || error.signal === 'SIGTERM') {
      return NextResponse.json({ error: 'Request timeout' }, { status: 408 });
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch YouTube audio',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
