const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow = null;
let nextServer = null;
let serverPort = 3000;

// 获取 yt-dlp 可执行文件路径
function getYtDlpPath() {
  const platform = process.platform;
  
  if (app.isPackaged) {
    // 打包后的路径（extraResources 中的文件在 resourcesPath 下）
    const resourcesPath = process.resourcesPath;
    
    if (platform === 'win32') {
      return path.join(resourcesPath, 'win32', 'yt-dlp.exe');
    } else if (platform === 'darwin') {
      return path.join(resourcesPath, 'darwin', 'yt-dlp');
    } else {
      return path.join(resourcesPath, 'linux', 'yt-dlp');
    }
  } else {
    // 开发环境：先检查本地 resources 目录，然后回退到系统 PATH
    const devResourcesPath = path.join(__dirname, 'resources');
    
    let devPath;
    if (platform === 'win32') {
      devPath = path.join(devResourcesPath, 'win32', 'yt-dlp.exe');
    } else if (platform === 'darwin') {
      devPath = path.join(devResourcesPath, 'darwin', 'yt-dlp');
    } else {
      devPath = path.join(devResourcesPath, 'linux', 'yt-dlp');
    }
    
    // 检查本地资源文件是否存在
    if (fs.existsSync(devPath)) {
      return devPath;
    }
    
    // 回退到系统 PATH
    return 'yt-dlp';
  }
}

// 启动 Next.js 服务器
function startNextServer() {
  return new Promise((resolve, reject) => {
    const serverPath = isDev
      ? path.join(__dirname, '..', 'node_modules', '.bin', 'next')
      : path.join(process.resourcesPath, 'app', '.next', 'standalone', 'server.js');

    if (isDev) {
      // 开发模式：使用 next dev
      nextServer = spawn('npm', ['run', 'dev'], {
        cwd: path.join(__dirname, '..'),
        env: { ...process.env, PORT: serverPort },
        shell: true
      });
    } else {
      // 生产模式：使用 standalone 服务器
      // Next.js standalone 输出在 .next/standalone 目录
      const standalonePath = path.join(process.resourcesPath, 'app', '.next', 'standalone');
      const standaloneServerPath = path.join(standalonePath, 'server.js');
      
      if (!fs.existsSync(standaloneServerPath)) {
        reject(new Error('Standalone server not found. Please run "npm run build" first.'));
        return;
      }
      
      nextServer = spawn('node', [standaloneServerPath], {
        cwd: standalonePath,
        env: { 
          ...process.env, 
          PORT: serverPort, 
          NODE_ENV: 'production',
          HOSTNAME: 'localhost'
        }
      });
    }

    nextServer.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`[Next.js] ${output}`);
      
      // 检查服务器是否已启动
      if (output.includes('Ready') || output.includes('started server')) {
        resolve();
      }
    });

    nextServer.stderr.on('data', (data) => {
      console.error(`[Next.js Error] ${data.toString()}`);
    });

    nextServer.on('error', (error) => {
      console.error('Failed to start Next.js server:', error);
      reject(error);
    });

    // 超时处理
    setTimeout(() => {
      // 假设服务器已启动（如果没有错误）
      if (nextServer && !nextServer.killed) {
        resolve();
      }
    }, 10000);
  });
}

// 创建主窗口
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#09090b',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false // 先不显示，等服务器启动后再显示
  });

  // 加载应用
  const url = `http://localhost:${serverPort}`;
  
  mainWindow.loadURL(url).then(() => {
    mainWindow.show();
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  }).catch((error) => {
    console.error('Failed to load URL:', error);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 应用准备就绪
app.whenReady().then(async () => {
  // 设置环境变量，让 API 路由知道在 Electron 环境中运行
  process.env.ELECTRON = 'true';
  process.env.YT_DLP_PATH = getYtDlpPath();
  
  // 使用 Electron 的用户数据目录作为缓存目录
  const userDataPath = app.getPath('userData');
  process.env.SONICHUB_CACHE_DIR = path.join(userDataPath, 'cache', 'audio');

  try {
    // 启动 Next.js 服务器
    await startNextServer();
    
    // 等待服务器完全启动
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 创建窗口
    createWindow();
  } catch (error) {
    console.error('Failed to start application:', error);
    app.quit();
  }
});

// 所有窗口关闭时退出（macOS 除外）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// macOS 点击 dock 图标时重新创建窗口
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// 应用退出前清理
app.on('before-quit', () => {
  if (nextServer) {
    nextServer.kill();
  }
});

// IPC 处理：获取 yt-dlp 路径
ipcMain.handle('get-ytdlp-path', () => {
  return getYtDlpPath();
});

// IPC 处理：获取用户数据路径
ipcMain.handle('get-user-data-path', () => {
  return app.getPath('userData');
});

