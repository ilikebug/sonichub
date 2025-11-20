# 🎵 SonicHub

一个基于 Next.js 的音乐发现和播放应用，集成 Spotify API 和 YouTube 音频。

## ✨ 功能特点

- 🔍 **搜索音乐** - 使用 Spotify API 搜索全球音乐
- 🎧 **完整播放** - 通过 YouTube 播放完整歌曲（非 30 秒预览）
- 📻 **发现音乐** - 探索热门歌曲、推荐电台、精选艺人
- ❤️ **收藏管理** - 收藏喜欢的歌曲到个人库
- 🎨 **现代界面** - 精美的暗黑主题设计

## 🛠️ 技术栈

- **框架**: Next.js 16 + React 19
- **样式**: Tailwind CSS 3
- **音乐数据**: Spotify Web API
- **音频播放**: YouTube (通过 yt-dlp)
- **语言**: TypeScript

## 📋 环境要求

- **Node.js**: >= 20.9.0 (推荐 22.x)
- **yt-dlp**: 用于获取 YouTube 音频
- **Spotify API**: 需要客户端 ID 和密钥

### 安装 yt-dlp

```bash
# macOS (使用 Homebrew)
brew install yt-dlp

# Linux
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp

# Windows (使用 Scoop)
scoop install yt-dlp
```

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone <repository-url>
cd sonichub
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

创建 `.env.local` 文件并添加你的 Spotify API 凭证：

```env
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=你的_spotify_client_id
NEXT_PUBLIC_SPOTIFY_CLIENT_SECRET=你的_spotify_client_secret
```

**获取 Spotify API 密钥：**
1. 访问 [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. 登录并创建新应用
3. 复制 Client ID 和 Client Secret

### 4. 启动应用

```bash
npm run dev
```

应用将在 http://localhost:3000 启动

## 📖 使用说明

### 搜索歌曲
1. 在顶部搜索栏输入歌曲名或歌手名
2. 按回车搜索
3. 点击歌曲卡片的播放按钮开始播放

### 浏览音乐
- **Explore**: 浏览当前热门歌曲
- **Radio**: AI 推荐电台
- **Artists**: 精选艺人歌曲

### 收藏管理
- 点击歌曲卡片上的 ❤️ 图标收藏歌曲
- 在侧边栏点击 **Favorites** 查看收藏

### 播放控制
- 底部播放器可以播放/暂停、调节音量
- 点击进度条可以跳转到指定位置

## ⚙️ 工作原理

1. **音乐搜索**: 使用 Spotify API 获取歌曲信息（标题、艺人、封面等）
2. **音频获取**: 使用 yt-dlp 在 YouTube 搜索并获取对应的音频流
3. **播放**: 在浏览器中直接播放 YouTube 音频流
4. **降级方案**: 如果 YouTube 获取失败，自动使用 Spotify 30 秒预览

## 🔧 故障排除

### 无法播放音频
- 确保已安装 yt-dlp: `yt-dlp --version`
- 检查网络连接是否正常
- 查看浏览器控制台和服务器日志

### 搜索不到歌曲
- 检查 Spotify API 凭证是否正确配置
- 确认 `.env.local` 文件在项目根目录

### Node.js 版本错误
```bash
# 使用 nvm 切换到 Node.js 22
nvm install 22
nvm use 22
```

## 📝 注意事项

- yt-dlp 首次获取音频可能需要 10-15 秒
- YouTube 音频链接有时效性（通常 6 小时），过期后需要重新获取
- 建议在稳定的网络环境下使用

## 📄 许可证

MIT License

---

Made with ❤️ by SonicHub Team
# sonichub
