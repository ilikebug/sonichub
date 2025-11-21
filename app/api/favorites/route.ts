import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { verifySession } from '@/lib/auth';

const FAVORITES_FILE = path.join(process.cwd(), 'data', 'favorites.json');

// 确保数据目录存在
async function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data');
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

// 读取收藏列表
async function readFavorites() {
  try {
    await ensureDataDir();
    const data = await fs.readFile(FAVORITES_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// 写入收藏列表
async function writeFavorites(favorites: any[]) {
  await ensureDataDir();
  await fs.writeFile(FAVORITES_FILE, JSON.stringify(favorites, null, 2));
}

// GET - 获取收藏列表
export async function GET(request: NextRequest) {
  // 验证权限
  const token = request.headers.get('Authorization')?.replace('Bearer ', '') || null;
  if (!verifySession(token)) {
    return NextResponse.json({ success: false, message: '未授权' }, { status: 401 });
  }

  try {
    const favorites = await readFavorites();
    return NextResponse.json({ success: true, favorites });
  } catch (error) {
    console.error('Failed to read favorites:', error);
    return NextResponse.json({ success: false, message: '读取收藏失败' }, { status: 500 });
  }
}

// POST - 添加/删除收藏
export async function POST(request: NextRequest) {
  // 验证权限
  const token = request.headers.get('Authorization')?.replace('Bearer ', '') || null;
  if (!verifySession(token)) {
    return NextResponse.json({ success: false, message: '未授权' }, { status: 401 });
  }

  try {
    const { action, song } = await request.json();
    const favorites = await readFavorites();

    if (action === 'add') {
      // 检查是否已存在
      const exists = favorites.some((s: any) => s.id === song.id);
      if (!exists) {
        favorites.push(song);
        await writeFavorites(favorites);
      }
      return NextResponse.json({ success: true, favorites });
    } else if (action === 'remove') {
      const newFavorites = favorites.filter((s: any) => s.id !== song.id);
      await writeFavorites(newFavorites);
      return NextResponse.json({ success: true, favorites: newFavorites });
    } else {
      return NextResponse.json({ success: false, message: '无效的操作' }, { status: 400 });
    }
  } catch (error) {
    console.error('Failed to update favorites:', error);
    return NextResponse.json({ success: false, message: '更新收藏失败' }, { status: 500 });
  }
}

