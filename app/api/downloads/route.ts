import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { verifySession } from '@/lib/auth';
import { DOWNLOADS_FILE } from '@/lib/cache';

// 读取下载列表
async function readDownloads() {
  try {
    const data = await fs.readFile(DOWNLOADS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// 写入下载列表
async function writeDownloads(downloads: any[]) {
  await fs.writeFile(DOWNLOADS_FILE, JSON.stringify(downloads, null, 2));
}

// GET - 获取下载列表
export async function GET(request: NextRequest) {
  // 验证权限
  const token = request.headers.get('Authorization')?.replace('Bearer ', '') || null;
  if (!verifySession(token)) {
    return NextResponse.json({ success: false, message: '未授权' }, { status: 401 });
  }

  try {
    const downloads = await readDownloads();
    return NextResponse.json({ success: true, downloads });
  } catch (error) {
    console.error('Failed to read downloads:', error);
    return NextResponse.json({ success: false, message: '读取下载列表失败' }, { status: 500 });
  }
}

// POST - 添加下载记录
export async function POST(request: NextRequest) {
  // 验证权限
  const token = request.headers.get('Authorization')?.replace('Bearer ', '') || null;
  if (!verifySession(token)) {
    return NextResponse.json({ success: false, message: '未授权' }, { status: 401 });
  }

  try {
    const { song } = await request.json();
    const downloads = await readDownloads();

    // 检查是否已存在
    const exists = downloads.some((s: any) => s.id === song.id);
    if (!exists) {
      downloads.unshift(song); // 添加到开头
      await writeDownloads(downloads);
    }

    return NextResponse.json({ success: true, downloads });
  } catch (error) {
    console.error('Failed to update downloads:', error);
    return NextResponse.json({ success: false, message: '更新下载列表失败' }, { status: 500 });
  }
}

