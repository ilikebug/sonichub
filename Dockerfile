# 多阶段构建 - 构建阶段
FROM node:22-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装所有依赖（包括 devDependencies）
RUN npm ci

# 复制源代码
COPY . .

# 创建 public 目录（如果不存在）
RUN mkdir -p public

# 构建时环境变量（用于客户端代码）
ARG NEXT_PUBLIC_SPOTIFY_CLIENT_ID
ARG NEXT_PUBLIC_SPOTIFY_CLIENT_SECRET
ENV NEXT_PUBLIC_SPOTIFY_CLIENT_ID=$NEXT_PUBLIC_SPOTIFY_CLIENT_ID
ENV NEXT_PUBLIC_SPOTIFY_CLIENT_SECRET=$NEXT_PUBLIC_SPOTIFY_CLIENT_SECRET

# 构建应用
RUN npm run build

# 生产阶段
FROM node:22-alpine AS runner

# 设置工作目录
WORKDIR /app

# 安装运行时依赖：yt-dlp 和 ffmpeg
RUN apk add --no-cache \
    python3 \
    py3-pip \
    ffmpeg \
    && pip3 install --no-cache-dir --break-system-packages yt-dlp \
    && yt-dlp --version

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000
ENV SONICHUB_CACHE_DIR=/tmp/sonichub-cache
ENV FFMPEG_PATH=/usr/bin/ffmpeg

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 复制必要文件
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/public ./public

# 复制构建产物
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 创建缓存目录并设置权限
RUN mkdir -p /tmp/sonichub-cache && \
    chown -R nextjs:nodejs /tmp/sonichub-cache

# 切换到非 root 用户
USER nextjs

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["node", "server.js"]

