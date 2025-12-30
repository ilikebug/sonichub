import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

/**
 * 获取 yt-dlp 可执行文件的路径
 * 优先级：
 * 1. 环境变量 YT_DLP_PATH（Electron 环境）
 * 2. 打包后的资源路径（Electron 打包后）
 * 3. 系统 PATH 中的 yt-dlp
 */
export function getYtDlpPath(): string {
  // 1. 检查环境变量（Electron 设置）
  if (process.env.YT_DLP_PATH) {
    const envPath = process.env.YT_DLP_PATH;
    if (fs.existsSync(envPath)) {
      return envPath;
    }
  }

  // 2. 检查 Electron 打包后的资源路径
  const proc = process as any;
  if (process.env.ELECTRON && proc.resourcesPath) {
    const resourcesPath = proc.resourcesPath;
    const platform = os.platform();
    let resourcePath: string;

    if (platform === 'win32') {
      resourcePath = path.join(resourcesPath, 'win32', 'yt-dlp.exe');
    } else if (platform === 'darwin') {
      resourcePath = path.join(resourcesPath, 'darwin', 'yt-dlp');
    } else {
      resourcePath = path.join(resourcesPath, 'linux', 'yt-dlp');
    }

    if (fs.existsSync(resourcePath)) {
      return resourcePath;
    }
  }

  // 3. 检查开发环境的 resources 目录
  if (process.env.NODE_ENV === 'development') {
    const devResourcesPath = path.join(process.cwd(), 'electron', 'resources');
    const platform = os.platform();
    let devPath: string;

    if (platform === 'win32') {
      devPath = path.join(devResourcesPath, 'win32', 'yt-dlp.exe');
    } else if (platform === 'darwin') {
      devPath = path.join(devResourcesPath, 'darwin', 'yt-dlp');
    } else {
      devPath = path.join(devResourcesPath, 'linux', 'yt-dlp');
    }

    if (fs.existsSync(devPath)) {
      return devPath;
    }
  }

  // 4. 默认使用系统 PATH 中的 yt-dlp
  return 'yt-dlp';
}

/**
 * 验证 yt-dlp 是否可用
 */
export async function verifyYtDlp(): Promise<boolean> {
  try {
    const ytdlpPath = getYtDlpPath();
    await execAsync(`"${ytdlpPath}" --version`, { timeout: 5000 });
    return true;
  } catch (error) {
    console.error('yt-dlp verification failed:', error);
    return false;
  }
}

/**
 * 构建 yt-dlp 命令，自动使用正确的路径
 */
export function buildYtDlpCommand(args: string): string {
  const ytdlpPath = getYtDlpPath();
  // 如果路径包含空格，需要加引号
  if (ytdlpPath.includes(' ') || ytdlpPath !== 'yt-dlp') {
    return `"${ytdlpPath}" ${args}`;
  }
  return `${ytdlpPath} ${args}`;
}

