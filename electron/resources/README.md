# yt-dlp 资源文件

这个目录用于存放各平台的 yt-dlp 可执行文件。

## 目录结构

```
resources/
├── darwin/
│   └── yt-dlp          # macOS 版本
├── win32/
│   └── yt-dlp.exe      # Windows 版本
└── linux/
    └── yt-dlp          # Linux 版本
```

## 下载 yt-dlp

### macOS
```bash
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos -o electron/resources/darwin/yt-dlp
chmod +x electron/resources/darwin/yt-dlp
```

### Windows
```bash
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe -o electron/resources/win32/yt-dlp.exe
```

### Linux
```bash
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux -o electron/resources/linux/yt-dlp
chmod +x electron/resources/linux/yt-dlp
```

## 注意

- 这些文件会在打包时被包含到应用中
- 开发环境可以依赖系统 PATH 中的 yt-dlp
- 打包后的应用会使用这些资源文件

