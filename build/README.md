# 应用图标文件

将应用图标文件放在此目录下：

## 需要的图标文件

- **macOS**: `icon.icns` - macOS 图标格式
- **Windows**: `icon.ico` - Windows 图标格式
- **Linux**: `icon.png` - PNG 格式，建议 512x512 或 1024x1024 像素

## 图标要求

### macOS (icon.icns)
- 格式：`.icns`
- 包含多种尺寸：16x16, 32x32, 128x128, 256x256, 512x512, 1024x1024
- 可以使用在线工具转换：
  - https://cloudconvert.com/png-to-icns
  - 或使用 macOS 自带的 `iconutil` 命令

### Windows (icon.ico)
- 格式：`.ico`
- 包含多种尺寸：16x16, 32x32, 48x48, 256x256
- 可以使用在线工具转换：
  - https://cloudconvert.com/png-to-ico
  - https://convertio.co/png-ico/

### Linux (icon.png)
- 格式：`.png`
- 建议尺寸：512x512 或 1024x1024 像素
- 透明背景（可选）

## 如何创建图标

### 方法 1：从 PNG 转换

如果你有一个 PNG 图标（建议 1024x1024）：

**macOS:**
```bash
# 创建 iconset 目录结构
mkdir icon.iconset
sips -z 16 16     icon.png --out icon.iconset/icon_16x16.png
sips -z 32 32     icon.png --out icon.iconset/icon_16x16@2x.png
sips -z 32 32     icon.png --out icon.iconset/icon_32x32.png
sips -z 64 64     icon.png --out icon.iconset/icon_32x32@2x.png
sips -z 128 128   icon.png --out icon.iconset/icon_128x128.png
sips -z 256 256   icon.png --out icon.iconset/icon_128x128@2x.png
sips -z 256 256   icon.png --out icon.iconset/icon_256x256.png
sips -z 512 512   icon.png --out icon.iconset/icon_256x256@2x.png
sips -z 512 512   icon.png --out icon.iconset/icon_512x512.png
sips -z 1024 1024 icon.png --out icon.iconset/icon_512x512@2x.png

# 转换为 icns
iconutil -c icns icon.iconset -o icon.icns
```

**Windows:**
使用在线工具或 ImageMagick：
```bash
convert icon.png -define icon:auto-resize=256,128,96,64,48,32,16 icon.ico
```

### 方法 2：使用在线工具

1. 准备一个高质量的 PNG 图标（1024x1024）
2. 使用在线转换工具：
   - https://cloudconvert.com/ (支持多种格式转换)
   - https://www.icoconverter.com/ (专门转换图标)

### 方法 3：使用设计工具

- **Figma**: 可以导出为多种格式
- **Sketch**: 支持导出 .icns
- **Adobe Illustrator/Photoshop**: 可以导出各种格式

## 注意事项

- 如果没有提供图标文件，electron-builder 会使用默认图标
- 图标应该是正方形（1:1 比例）
- 建议使用透明背景
- 图标应该清晰，在小尺寸下也能识别

## 快速开始

如果你还没有图标，可以：

1. 使用项目 Logo（如果有）
2. 使用在线图标生成器：
   - https://www.favicon-generator.org/
   - https://realfavicongenerator.net/
3. 使用 AI 生成图标

将生成的图标文件重命名并放到此目录即可。

