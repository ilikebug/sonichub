# Electron 桌面应用打包指南

本文档说明如何将 SonicHub 打包成桌面应用。

## 开发环境运行

### 前置要求

1. 确保已安装 Node.js (>= 20.9.0)
2. 确保系统 PATH 中有 `yt-dlp`（开发环境使用）
3. 安装项目依赖：`npm install`

### 运行 Electron 开发模式

```bash
npm run electron:dev
```

这会：
1. 启动 Next.js 开发服务器
2. 等待服务器就绪后启动 Electron 窗口

## 打包桌面应用

### 1. 下载 yt-dlp 资源文件（可选）

如果要打包 yt-dlp 到应用中，运行：

```bash
./scripts/download-ytdlp.sh
```

或者手动下载：
- macOS: 下载到 `electron/resources/darwin/yt-dlp`
- Windows: 下载到 `electron/resources/win32/yt-dlp.exe`
- Linux: 下载到 `electron/resources/linux/yt-dlp`

**注意**：如果不下载 yt-dlp，应用会依赖系统 PATH 中的 yt-dlp。

### 2. 构建应用

```bash
# 构建并打包（当前平台）
npm run electron:dist

# 或者分步执行
npm run electron:build  # 构建 Next.js
npm run electron:pack   # 打包 Electron 应用
```

### 3. 输出文件

打包完成后，安装文件会在 `dist/` 目录：

- **macOS**: `SonicHub-0.0.0.dmg`
- **Windows**: `SonicHub Setup 0.0.0.exe`
- **Linux**: `SonicHub-0.0.0.AppImage` 或 `SonicHub_0.0.0_amd64.deb`

## 配置说明

### package.json 中的 build 配置

- `appId`: 应用唯一标识符
- `productName`: 应用显示名称
- `directories.output`: 输出目录（默认 `dist/`）
- `files`: 要包含的文件
- `extraResources`: 额外资源文件（yt-dlp 等）

### 应用图标

将图标文件放在 `build/` 目录：
- **macOS**: `build/icon.icns` - macOS 图标格式
- **Windows**: `build/icon.ico` - Windows 图标格式
- **Linux**: `build/icon.png` - PNG 格式（建议 512x512 或 1024x1024）

**详细说明**：查看 `build/README.md` 了解如何创建和准备图标文件。

如果没有图标文件，electron-builder 会使用默认图标。

## 跨平台构建

### macOS 构建 Windows/Linux

需要安装 Wine（用于 Windows）和必要的工具。

### 推荐方案

使用 CI/CD 服务（如 GitHub Actions）在不同平台上构建。

## 注意事项

1. **应用体积**：Electron 应用体积较大（100-150MB），因为包含 Chromium 和 Node.js
2. **yt-dlp 打包**：如果打包 yt-dlp，每个平台会增加约 5-10MB
3. **代码签名**：发布到应用商店需要代码签名证书（可选）
4. **Next.js standalone**：确保 `next.config.mjs` 中设置了 `output: 'standalone'`

## 故障排除

### 服务器启动失败

检查：
1. Next.js 构建是否成功：`npm run build`
2. `.next/standalone` 目录是否存在
3. 端口 3000 是否被占用

### yt-dlp 找不到

开发环境：
- 确保系统 PATH 中有 yt-dlp
- 或运行 `./scripts/download-ytdlp.sh` 下载到 resources 目录

打包后：
- 确保已下载对应平台的 yt-dlp 到 `electron/resources/` 目录
- 检查 `electron/main.js` 中的路径逻辑

### 打包失败

1. 检查 Node.js 版本（需要 >= 20.9.0）
2. 确保所有依赖已安装
3. 检查磁盘空间
4. 查看 electron-builder 的详细日志

## 开发提示

- 开发时可以使用系统 PATH 中的 yt-dlp，不需要下载资源文件
- 使用 `npm run electron:dev` 进行开发，支持热重载
- Electron 窗口会自动打开开发者工具（开发模式）

