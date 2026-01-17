import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { buildYtDlpCommand } from '@/lib/ytdlp';
import { AUDIO_CACHE_DIR } from '@/lib/cache';

const execAsync = promisify(exec);
const CACHE_DIR = AUDIO_CACHE_DIR;

// 使用ffmpeg转换DASH格式为标准格式
async function convertToStandardFormat(inputFile: string, outputFile: string): Promise<boolean> {
    try {
        console.log(`🔄 Converting ${inputFile} to ${outputFile}...`);
        await execAsync(`ffmpeg -i "${inputFile}" -c:a libmp3lame -q:a 2 "${outputFile}" -y`, {
            timeout: 120000, // 120秒
            maxBuffer: 1024 * 1024 * 100
        });

        // 验证输出文件
        if (fs.existsSync(outputFile) && fs.statSync(outputFile).size > 0) {
            console.log(`✅ Conversion successful: ${outputFile}`);
            return true;
        }
        return false;
    } catch (error: any) {
        console.error(`❌ Conversion failed:`, error.message);
        return false;
    }
}

// 下载并准备播放端点 - 确保文件完整下载后返回流式URL
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { videoId, action = 'start' } = body;

        if (!videoId) {
            return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
        }

        // 如果是查询进度
        if (action === 'check') {
            const possibleExtensions = ['mp3', 'mp4', 'm4a', 'webm', 'opus', 'ogg', 'wav', 'aac'];

            for (const ext of possibleExtensions) {
                const filePath = path.join(CACHE_DIR, `${videoId}.${ext}`);
                if (fs.existsSync(filePath)) {
                    const stats = fs.statSync(filePath);
                    if (stats.size > 0) {
                        return NextResponse.json({
                            status: 'completed',
                            audioUrl: `/api/youtube/stream?videoId=${videoId}`,
                            cached: true
                        });
                    }
                }
            }

            const tempFiles = fs.readdirSync(CACHE_DIR).filter(f =>
                f.includes(videoId) && f.includes('.temp.')
            );

            if (tempFiles.length > 0) {
                return NextResponse.json({
                    status: 'downloading',
                    progress: 50,
                    cached: false
                });
            }

            return NextResponse.json({
                status: 'not_started',
                cached: false
            });
        }

        // 开始下载
        console.log(`📥 Starting download for ${videoId}...`);

        // 优先检查MP3格式（已转换的）
        const mp3File = path.join(CACHE_DIR, `${videoId}.mp3`);
        if (fs.existsSync(mp3File) && fs.statSync(mp3File).size > 0) {
            console.log(`✅ Found converted MP3: ${mp3File}`);
            return NextResponse.json({
                status: 'completed',
                audioUrl: `/api/youtube/stream?videoId=${videoId}`,
                cached: true,
                message: '文件已缓存'
            });
        }

        // 检查其他格式的缓存
        const possibleExtensions = ['mp4', 'm4a', 'webm', 'opus', 'ogg', 'wav', 'aac'];
        let cachedFile = '';

        for (const ext of possibleExtensions) {
            const filePath = path.join(CACHE_DIR, `${videoId}.${ext}`);
            if (fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath);
                if (stats.size > 0) {
                    cachedFile = filePath;
                    console.log(`⚠️ Found cached file but not MP3: ${filePath}, will convert...`);

                    // 尝试转换为MP3
                    const converted = await convertToStandardFormat(filePath, mp3File);
                    if (converted) {
                        // 删除原DASH文件
                        try {
                            fs.unlinkSync(filePath);
                            console.log(`🗑️ Deleted original DASH file: ${filePath}`);
                        } catch (e) {
                            console.warn(`Failed to delete original file: ${e}`);
                        }

                        return NextResponse.json({
                            status: 'completed',
                            audioUrl: `/api/youtube/stream?videoId=${videoId}`,
                            cached: true,
                            message: '已转换为标准格式'
                        });
                    }
                    break;
                }
            }
        }

        // 开始下载（使用多策略重试）
        const outputTemplate = path.join(CACHE_DIR, `${videoId}.%(ext)s`);

        const strategies = [
            {
                name: 'Android client (allow DASH)',
                // 允许DASH，后续会转换
                cmd: buildYtDlpCommand(`"https://www.youtube.com/watch?v=${videoId}" --extractor-args "youtube:player_client=android" -f "bestaudio[ext=m4a]/bestaudio" -o "${outputTemplate}" --no-playlist --no-warnings --force-ipv4`)
            },
            {
                name: 'iOS client',
                cmd: buildYtDlpCommand(`"https://www.youtube.com/watch?v=${videoId}" --extractor-args "youtube:player_client=ios" -f "bestaudio" -o "${outputTemplate}" --no-playlist --no-warnings --force-ipv4`)
            },
            {
                name: 'Web client',
                cmd: buildYtDlpCommand(`"https://www.youtube.com/watch?v=${videoId}" -f "bestaudio" -o "${outputTemplate}" --no-playlist --no-warnings --force-ipv4`)
            }
        ];

        let lastError: Error | null = null;
        let downloadSuccess = false;
        let downloadedFile = '';

        for (const strategy of strategies) {
            try {
                console.log(`🔄 Trying strategy: ${strategy.name}`);
                await execAsync(strategy.cmd, {
                    timeout: 120000,
                    maxBuffer: 1024 * 1024 * 100,
                    killSignal: 'SIGTERM'
                });

                // 查找下载的文件
                const allExtensions = ['mp3', 'mp4', 'm4a', 'webm', 'opus', 'ogg', 'wav', 'aac'];
                for (const ext of allExtensions) {
                    const filePath = path.join(CACHE_DIR, `${videoId}.${ext}`);
                    if (fs.existsSync(filePath)) {
                        const stats = fs.statSync(filePath);
                        if (stats.size > 0) {
                            downloadedFile = filePath;
                            downloadSuccess = true;
                            console.log(`✅ Download successful with ${strategy.name}: ${filePath}`);
                            break;
                        }
                    }
                }

                if (downloadSuccess) {
                    break;
                }
            } catch (error: any) {
                console.error(`❌ Strategy ${strategy.name} failed:`, error.message);
                lastError = error;
            }
        }

        // 最终检查
        if (!downloadedFile) {
            const allFiles = fs.readdirSync(CACHE_DIR);
            const matchingFile = allFiles.find(f => f.startsWith(videoId + '.') && !f.includes('.temp.'));

            if (matchingFile) {
                downloadedFile = path.join(CACHE_DIR, matchingFile);
                downloadSuccess = true;
                console.log(`✅ Found downloaded file: ${downloadedFile}`);
            }
        }

        if (!downloadSuccess || !downloadedFile) {
            console.error(`❌ All download strategies failed for ${videoId}`);
            return NextResponse.json(
                {
                    status: 'failed',
                    error: 'Download failed',
                    details: lastError?.message || 'All strategies failed',
                    cached: false
                },
                { status: 500 }
            );
        }

        // 如果下载的不是MP3，转换为MP3
        if (!downloadedFile.endsWith('.mp3')) {
            console.log(`🔄 Downloaded file is not MP3, converting...`);
            const converted = await convertToStandardFormat(downloadedFile, mp3File);

            if (converted) {
                // 删除原文件
                try {
                    fs.unlinkSync(downloadedFile);
                    console.log(`🗑️ Deleted original file: ${downloadedFile}`);
                } catch (e) {
                    console.warn(`Failed to delete original file: ${e}`);
                }

                return NextResponse.json({
                    status: 'completed',
                    audioUrl: `/api/youtube/stream?videoId=${videoId}`,
                    cached: true,
                    message: '下载并转换完成'
                });
            } else {
                // 转换失败，但原文件存在，仍然返回（虽然可能无法播放）
                console.warn(`⚠️ Conversion failed, returning original file`);
                return NextResponse.json({
                    status: 'completed',
                    audioUrl: `/api/youtube/stream?videoId=${videoId}`,
                    cached: true,
                    message: '下载完成（未转换）'
                });
            }
        }

        // 下载成功，返回流式URL
        return NextResponse.json({
            status: 'completed',
            audioUrl: `/api/youtube/stream?videoId=${videoId}`,
            cached: true,
            message: '下载完成'
        });

    } catch (error: any) {
        console.error('❌ Download and serve error:', error.message);
        return NextResponse.json(
            {
                status: 'failed',
                error: 'Failed to download audio',
                details: error.message,
                cached: false
            },
            { status: 500 }
        );
    }
}
