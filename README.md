# 🎵 SonicHub

一个现代化的音乐流媒体应用，集成 Spotify 音乐库与 YouTube 音频源，提供完整的音乐播放体验。

> 基于 Next.js 构建，使用 Spotify API 获取音乐信息，通过 yt-dlp 播放来自 YouTube 的完整音频。

## ✨ 主要特性

- 🎵 **完整音频播放** - 播放完整歌曲，而非 30 秒预览
- 🔍 **强大搜索** - 搜索全球数百万首歌曲（Spotify 音乐库）
- 📻 **智能发现** - 探索热门歌曲、AI 推荐电台、精选艺人
- ❤️ **收藏系统** - 本地收藏管理，持久化保存
- 📥 **离线下载** - 下载音频到本地
- 💾 **智能缓存** - 播放过的歌曲自动缓存，再次播放秒开
- 🎨 **现代 UI** - 精美的深色主题设计，流畅动画
- 📱 **响应式** - 完美适配桌面和移动设备

## 🛠️ 技术栈

- **前端框架**: [Next.js 16](https://nextjs.org/) + React 19
- **样式**: [Tailwind CSS 3](https://tailwindcss.com/)
- **语言**: TypeScript
- **音乐数据**: [Spotify Web API](https://developer.spotify.com/documentation/web-api)
- **音频提取**: [yt-dlp](https://github.com/yt-dlp/yt-dlp)
- **API 客户端**: [@spotify/web-api-ts-sdk](https://github.com/spotify/spotify-web-api-ts-sdk)

## 📋 环境要求

### 必需
- **Node.js**: >= 20.9.0（推荐使用 22.x LTS）
- **npm** 或 **yarn** 或 **pnpm**
- **yt-dlp**: 用于提取 YouTube 音频
- **Spotify API 凭证**: Client ID 和 Client Secret

### 推荐
- 良好的网络连接
- 至少 2GB 可用磁盘空间（用于音频缓存）

## 🚀 安装指南

### 1. 安装 yt-dlp

yt-dlp 是本项目的核心依赖，用于从 YouTube 提取音频。

<details>
<summary><b>macOS</b></summary>

```bash
# 使用 Homebrew 安装（推荐）
brew install yt-dlp

# 验证安装
yt-dlp --version
```
</details>

<details>
<summary><b>Linux</b></summary>

```bash
# 下载最新版本
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp

# 添加执行权限
sudo chmod a+rx /usr/local/bin/yt-dlp

# 验证安装
yt-dlp --version
```
</details>

<details>
<summary><b>Windows</b></summary>

```powershell
# 使用 Scoop 安装
scoop install yt-dlp

# 或使用 Chocolatey
choco install yt-dlp

# 验证安装
yt-dlp --version
```
</details>

### 2. 获取 Spotify API 凭证

1. 访问 [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. 使用你的 Spotify 账号登录（没有账号则免费注册）
3. 点击 **Create App** 创建新应用
4. 填写应用信息：
   - App name: `SonicHub`（或任意名称）
   - App description: `Personal music player`
   - Redirect URI: `http://localhost:3000`（可选）
5. 同意服务条款，点击 **Create**
6. 在应用详情页面找到并复制：
   - **Client ID**
   - **Client Secret**（点击 Show Client Secret 查看）

### 3. 克隆并配置项目

```bash
# 克隆项目
git clone https://github.com/yourusername/sonichub.git
cd sonichub

# 安装依赖
npm install

# 创建环境变量文件
cp .env.example .env.local
```

编辑 `.env.local` 文件，填入你的 Spotify API 凭证：

```env
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=你的_client_id
NEXT_PUBLIC_SPOTIFY_CLIENT_SECRET=你的_client_secret
```

### 4. 启动应用

```bash
# 开发模式
npm run dev

# 生产构建
npm run build
npm start
```

应用将在 http://localhost:3000 启动 🎉

## 📖 使用指南

### 🔍 搜索音乐

1. 在顶部搜索栏输入歌曲名、艺人名或专辑名
2. 按 **Enter** 键开始搜索
3. 浏览搜索结果，点击歌曲卡片播放

**搜索技巧**：
- 使用艺人名 + 歌曲名获得更准确的结果
- 例如：`周杰伦 晴天`、`Taylor Swift Anti-Hero`

### 📻 探索音乐

**侧边栏导航**：

- **Explore** - 浏览当前热门和新发布的歌曲
- **Radio** - AI 推荐电台，根据不同风格推荐音乐
- **Artists** - 精选热门艺人的作品
- **Favorites** - 你收藏的所有歌曲
- **Downloads** - 已下载到本地的歌曲

### 🎵 播放控制

**底部播放器**提供完整的播放控制：

- **播放/暂停** - 点击中央的播放按钮
- **上一曲/下一曲** - 点击两侧的跳转按钮
- **进度条** - 点击进度条跳转到指定位置
- **音量控制** - 调节右侧的音量滑块
- **收藏** - 点击 ❤️ 图标收藏当前播放的歌曲

**状态指示**：
- 🔵 "正在获取音频链接..." - 正在搜索 YouTube
- 🔷 "正在下载音频..." - 首次播放，下载音频文件
- ⚠️ "YouTube 不可用，播放 30 秒预览" - 使用 Spotify 预览

### ❤️ 收藏管理

**收藏歌曲**：
1. 在歌曲卡片上点击 ❤️ 图标
2. 或在播放器中点击歌曲信息旁的 ❤️ 图标

**查看收藏**：
- 点击侧边栏的 **Favorites** 查看所有收藏
- 收藏保存在本地浏览器，不会丢失

**取消收藏**：
- 再次点击 ❤️ 图标即可取消收藏

### 📥 下载音频

1. 将鼠标悬停在歌曲卡片上
2. 点击右下角的 📥 下载图标
3. 音频将下载到浏览器的默认下载文件夹
4. 格式为 MP4/M4A，可在任何播放器中播放

## ⚙️ 工作原理

### 系统架构

```
用户搜索 → Spotify API → 获取歌曲信息
              ↓
        显示搜索结果
              ↓
     用户点击播放 → 检查缓存
              ↓
      没有缓存？→ 搜索 YouTube
              ↓
        获取 videoId
              ↓
     使用 yt-dlp 下载音频
              ↓
     缓存到系统目录 ← 智能缓存策略
              ↓
       提供音频流
              ↓
     浏览器播放 🎵
```

### 智能缓存

- **首次播放**：8-15 秒（需要下载）
- **再次播放**：<0.2 秒（从缓存）
- **缓存位置**：
  - macOS: `~/Library/Caches/SonicHub/audio/`
  - Windows: `%LOCALAPPDATA%\SonicHub\audio\`
  - Linux: `~/.cache/SonicHub/audio/`

### 多客户端重试

为了应对 YouTube 的访问限制，实现了智能重试机制：

1. **Android 客户端**（优先）- 最稳定
2. **iOS 客户端**（备用）- 中等稳定
3. **Web 客户端**（最后）- 兼容性好

## 🔧 故障排除

### ❌ 无法播放音频

**检查清单**：
1. 确认 yt-dlp 已安装：
   ```bash
   yt-dlp --version
   ```
2. 检查网络连接
3. 查看浏览器控制台（F12）是否有错误
4. 查看终端日志输出

### ❌ 搜索不到歌曲

1. 检查 Spotify API 凭证是否正确
2. 确认 `.env.local` 文件在项目根目录
3. 重启开发服务器

### ❌ Node.js 版本错误

```bash
# 检查当前版本
node --version

# 使用 nvm 切换版本
nvm install 22
nvm use 22

# 或使用 n
n 22
```

### ❌ yt-dlp 下载失败

```bash
# 更新 yt-dlp 到最新版本
# macOS
brew upgrade yt-dlp

# Linux
sudo yt-dlp -U

# Windows
scoop update yt-dlp
```

### 🧹 清理缓存

如果遇到播放问题，可以尝试清理缓存：

```bash
# macOS
rm -rf ~/Library/Caches/SonicHub/

# Linux
rm -rf ~/.cache/SonicHub/

# Windows
rmdir /s "%LOCALAPPDATA%\SonicHub"
```

## 🎯 项目特点

- **无需登录** - 直接使用，无需创建账号
- **完全免费** - 开源项目，无任何费用
- **隐私保护** - 所有数据存储在本地
- **跨平台** - 支持 Windows、macOS、Linux
- **轻量级** - 最小化依赖，快速启动

## 📝 注意事项

- yt-dlp 首次下载音频需要 8-15 秒（取决于网络和歌曲长度）
- 播放过的歌曲会自动缓存，下次播放更快
- 建议在稳定的网络环境下使用
- 本项目仅供个人学习和研究使用

## 🙏 致谢

本项目的实现离不开以下优秀的开源项目和服务：

### 核心依赖

- **[yt-dlp](https://github.com/yt-dlp/yt-dlp)** - 强大的视频/音频下载工具，本项目的核心引擎
- **[Spotify Web API](https://developer.spotify.com/documentation/web-api)** - 提供丰富的音乐数据和元信息
- **[Next.js](https://nextjs.org/)** - 优秀的 React 框架，提供出色的开发体验
- **[Tailwind CSS](https://tailwindcss.com/)** - 实用优先的 CSS 框架

### 特别感谢

- **[yt-dlp 团队](https://github.com/yt-dlp/yt-dlp/graphs/contributors)** - 持续维护和更新，应对各种平台变化
- **[Spotify for Developers](https://developer.spotify.com/)** - 提供免费的音乐 API 服务
- **[@spotify/web-api-ts-sdk](https://github.com/spotify/spotify-web-api-ts-sdk)** - 官方 TypeScript SDK

### 启发来源

感谢所有音乐爱好者和开发者们为开源社区做出的贡献 ❤️

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

---

<div align="center">

**Made with ❤️ and ☕**

如果这个项目对你有帮助，欢迎 ⭐️ Star

[报告问题](https://github.com/yourusername/sonichub/issues) · [提出建议](https://github.com/yourusername/sonichub/issues)

</div>
