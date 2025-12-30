#!/bin/bash

# 下载 yt-dlp 到 resources 目录

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
RESOURCES_DIR="$PROJECT_ROOT/electron/resources"

echo "📥 下载 yt-dlp..."

# 创建资源目录
mkdir -p "$RESOURCES_DIR/darwin"
mkdir -p "$RESOURCES_DIR/win32"
mkdir -p "$RESOURCES_DIR/linux"

# 下载 macOS 版本
echo "下载 macOS 版本..."
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos -o "$RESOURCES_DIR/darwin/yt-dlp" || true
if [ -f "$RESOURCES_DIR/darwin/yt-dlp" ]; then
  chmod +x "$RESOURCES_DIR/darwin/yt-dlp"
  echo "✅ macOS 版本下载完成"
else
  echo "⚠️  macOS 版本下载失败，请手动下载"
fi

# 下载 Windows 版本
echo "下载 Windows 版本..."
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe -o "$RESOURCES_DIR/win32/yt-dlp.exe" || true
if [ -f "$RESOURCES_DIR/win32/yt-dlp.exe" ]; then
  echo "✅ Windows 版本下载完成"
else
  echo "⚠️  Windows 版本下载失败，请手动下载"
fi

# 下载 Linux 版本
echo "下载 Linux 版本..."
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux -o "$RESOURCES_DIR/linux/yt-dlp" || true
if [ -f "$RESOURCES_DIR/linux/yt-dlp" ]; then
  chmod +x "$RESOURCES_DIR/linux/yt-dlp"
  echo "✅ Linux 版本下载完成"
else
  echo "⚠️  Linux 版本下载失败，请手动下载"
fi

echo ""
echo "✨ 完成！yt-dlp 文件已下载到 electron/resources/ 目录"
echo ""
echo "注意：如果某些平台下载失败，你可以："
echo "1. 手动从 https://github.com/yt-dlp/yt-dlp/releases 下载"
echo "2. 或者开发时依赖系统 PATH 中的 yt-dlp"

