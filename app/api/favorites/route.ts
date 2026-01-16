import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { favorites as favoritesStore } from '@/lib/store';

// GET - 获取收藏列表
export async function GET(request: NextRequest) {
  // 验证权限
  const token = request.headers.get('Authorization')?.replace('Bearer ', '') || null;
  if (!verifySession(token)) {
    return NextResponse.json({ success: false, message: '未授权' }, { status: 401 });
  }

  try {
    const favorites = favoritesStore.getAll();
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
    let currentFavorites = [];

    if (action === 'add') {
      currentFavorites = favoritesStore.add(song);
      return NextResponse.json({ success: true, favorites: currentFavorites });
    } else if (action === 'remove') {
      currentFavorites = favoritesStore.remove(song.id);
      return NextResponse.json({ success: true, favorites: currentFavorites });
    } else {
      return NextResponse.json({ success: false, message: '无效的操作' }, { status: 400 });
    }
  } catch (error) {
    console.error('Failed to update favorites:', error);
    return NextResponse.json({ success: false, message: '更新收藏失败' }, { status: 500 });
  }
}

