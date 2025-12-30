import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { readFile } from 'fs/promises';
import { uploadToCloud } from '@/lib/netease-api';
import { AUDIO_CACHE_DIR } from '@/lib/cache';
import { buildYtDlpCommand } from '@/lib/ytdlp';

export async function POST(request: NextRequest) {
    let mp3Path = '';
    let coverPath = '';

    try {
        const { videoId, cookie, filename, title, artist, album, cover } = await request.json();

        if (!videoId || !cookie) {
            return NextResponse.json({ error: 'Video ID and Cookie are required' }, { status: 400 });
        }

        mp3Path = path.join(AUDIO_CACHE_DIR, `${videoId}_upload.mp3`);
        coverPath = path.join(AUDIO_CACHE_DIR, `${videoId}_cover.jpg`);

        // 检查缓存文件
        const audioExtensions = ['m4a', 'mp3', 'aac', 'flac', 'wav', 'ogg', 'webm', 'opus'];
        let cachedFile = '';
        let fileExt = '';

        // 1. 优先寻找纯音频格式
        for (const ext of audioExtensions) {
            const filePath = path.join(AUDIO_CACHE_DIR, `${videoId}.${ext}`);
            if (fs.existsSync(filePath)) {
                cachedFile = filePath;
                fileExt = ext;
                break;
            }
        }

        // 2. 如果只找到了 mp4 或者没找到，尝试下载
        if (!cachedFile || (fileExt === 'mp4' && !audioExtensions.some(ext => fs.existsSync(path.join(AUDIO_CACHE_DIR, `${videoId}.${ext}`))))) {
            console.log(`🎵 Cache status: ${cachedFile ? 'Found mp4' : 'No cache'}. Ensuring clean audio via yt-dlp...`);

            const outputTemplate = path.join(AUDIO_CACHE_DIR, `${videoId}.%(ext)s`);
            const downloadCmd = buildYtDlpCommand(`"https://www.youtube.com/watch?v=${videoId}" -f "bestaudio/best" -o "${outputTemplate}" --no-playlist --no-warnings`);

            try {
                const { execSync } = require('child_process');
                execSync(downloadCmd, { timeout: 60000 });

                // 再次检查
                for (const ext of audioExtensions.concat(['mp4'])) {
                    const filePath = path.join(AUDIO_CACHE_DIR, `${videoId}.${ext}`);
                    if (fs.existsSync(filePath)) {
                        cachedFile = filePath;
                        fileExt = ext;
                        break;
                    }
                }
            } catch (err) {
                console.error('❌ Failed to download audio for upload:', err);
            }
        }

        if (!cachedFile) {
            return NextResponse.json({ error: 'File not found in cache and download failed.' }, { status: 404 });
        }

        // 3. 核心：使用 FFmpeg 转码、注入元数据并嵌入封面图
        let finalUploadFile = cachedFile;
        let hasCover = false;

        // 下载封面图
        if (cover) {
            try {
                const coverRes = await fetch(cover);
                if (coverRes.ok) {
                    const coverBuffer = await coverRes.arrayBuffer();
                    fs.writeFileSync(coverPath, Buffer.from(coverBuffer));
                    hasCover = true;
                    console.log(`🖼️ Cover image downloaded: ${coverPath}`);
                }
            } catch (e) {
                console.warn('⚠️ Failed to download cover image:', e);
            }
        }

        try {
            const { execSync } = require('child_process');
            // 在 Docker 环境中通常是 'ffmpeg'，在本地 Mac 有可能是 '/opt/homebrew/bin/ffmpeg'
            const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';

            console.log(`🎬 Transcoding & Embedding Artwork: ${videoId} (${title} - ${artist})`);

            // 构建元数据参数
            const metadataArgs = [
                title ? `-metadata title="${title.replace(/"/g, '\\"')}"` : '',
                artist ? `-metadata artist="${artist.replace(/"/g, '\\"')}"` : '',
                album ? `-metadata album="${album.replace(/"/g, '\\"')}"` : '',
            ].filter(Boolean).join(' ');

            // 如果有封面图，增加封面图作为第二个输入流并映射
            const ffmpegCmd = hasCover
                ? `"${ffmpegPath}" -y -i "${cachedFile}" -i "${coverPath}" -map 0:a -map 1:v -c:a libmp3lame -ab 128k -id3v2_version 3 -metadata:s:v title="Album cover" -metadata:s:v comment="Cover (front)" ${metadataArgs} "${mp3Path}"`
                : `"${ffmpegPath}" -y -i "${cachedFile}" -vn -ab 128k ${metadataArgs} "${mp3Path}"`;

            console.log(`> Executing: ${ffmpegCmd}`);
            execSync(ffmpegCmd, { stdio: 'ignore', timeout: 60000 });

            if (fs.existsSync(mp3Path)) {
                finalUploadFile = mp3Path;
                console.log(`✅ FFmpeg transcoding and artwork embedding successful.`);
            }
        } catch (ffmpegErr: any) {
            console.error('❌ FFmpeg failed:', ffmpegErr.message);
        }

        // 读取文件并上传
        const fileBuffer = await readFile(finalUploadFile);

        // 构建格式化的文件名
        const safeTitle = (title || 'Unknown').replace(/[\\/:*?"<>|]/g, '_');
        const safeArtist = (artist || 'Unknown').replace(/[\\/:*?"<>|]/g, '_');
        const finalFilename = `${safeArtist} - ${safeTitle}.mp3`;

        console.log(`📤 Uploading to NetEase Cloud: ${finalFilename} (Size: ${fileBuffer.length} bytes)`);

        const result = await uploadToCloud({
            name: finalFilename,
            data: fileBuffer
        }, cookie);

        return NextResponse.json(result);

    } catch (error: any) {
        console.error('❌ NetEase upload error:', error);
        return NextResponse.json({
            error: error.message || 'Unknown upload error',
            details: error
        }, { status: 500 });
    } finally {
        // 确保清理转码产生的临时文件
        [mp3Path, coverPath].forEach(file => {
            if (file && fs.existsSync(file)) {
                try { fs.unlinkSync(file); } catch (e) { }
            }
        });
    }
}
