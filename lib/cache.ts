import fs from 'fs';
import path from 'path';
import os from 'os';

// 获取系统缓存目录
export function getSystemCacheDir(): string {
  // 优先使用环境变量
  if (process.env.SONICHUB_CACHE_DIR) {
    return process.env.SONICHUB_CACHE_DIR;
  }

  const homeDir = os.homedir();
  const platform = os.platform();
  let cacheBase: string;

  if (platform === 'darwin') {
    // macOS: ~/Library/Caches
    cacheBase = path.join(homeDir, 'Library', 'Caches');
  } else if (platform === 'win32') {
    // Windows: %LOCALAPPDATA%
    cacheBase = process.env.LOCALAPPDATA || path.join(homeDir, 'AppData', 'Local');
  } else {
    // Linux/Unix: ~/.cache
    cacheBase = process.env.XDG_CACHE_HOME || path.join(homeDir, '.cache');
  }

  return path.join(cacheBase, 'sonichub');
}

// 确保缓存目录存在
export function ensureCacheDir(): string {
  const cacheDir = getSystemCacheDir();
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  return cacheDir;
}

// 常用的缓存文件路径
export const CACHE_DIR = ensureCacheDir();
export const MAPPING_FILE = path.join(CACHE_DIR, 'song-mapping.json');
export const FAVORITES_FILE = path.join(CACHE_DIR, 'favorites.json');
export const DOWNLOADS_FILE = path.join(CACHE_DIR, 'downloads.json');

