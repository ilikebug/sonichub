#!/bin/bash

# Docker 构建脚本
# 使用方法: ./build-docker.sh

set -e

# 颜色输出
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🐳 开始构建 SonicHub Docker 镜像 (包含 ffmpeg 转码支持)...${NC}"

# 检查是否设置了环境变量
if [ -z "$NEXT_PUBLIC_SPOTIFY_CLIENT_ID" ] || [ -z "$NEXT_PUBLIC_SPOTIFY_CLIENT_SECRET" ]; then
    echo -e "${RED}❌ 错误: 请先设置 Spotify API 凭证${NC}"
    echo ""
    echo "使用方法:"
    echo "  export NEXT_PUBLIC_SPOTIFY_CLIENT_ID=你的_client_id"
    echo "  export NEXT_PUBLIC_SPOTIFY_CLIENT_SECRET=你的_client_secret"
    echo "  ./build-docker.sh"
    echo ""
    echo "或者直接传入:"
    echo "  NEXT_PUBLIC_SPOTIFY_CLIENT_ID=xxx NEXT_PUBLIC_SPOTIFY_CLIENT_SECRET=yyy ./build-docker.sh"
    exit 1
fi

echo -e "${BLUE}📦 正在构建镜像...${NC}"

# 构建镜像
DOCKER_BUILDKIT=0 docker build \
  --build-arg NEXT_PUBLIC_SPOTIFY_CLIENT_ID="$NEXT_PUBLIC_SPOTIFY_CLIENT_ID" \
  --build-arg NEXT_PUBLIC_SPOTIFY_CLIENT_SECRET="$NEXT_PUBLIC_SPOTIFY_CLIENT_SECRET" \
  -t sonichub:latest .

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ 构建成功！${NC}"
    echo ""
    echo "运行容器:"
    echo "  docker run -d -p 3000:3000 --name sonichub sonichub:latest"
    echo ""
    echo "或使用 Docker Compose:"
    echo "  docker compose up -d"
    echo ""
    echo "查看日志:"
    echo "  docker logs -f sonichub"
else
    echo -e "${RED}❌ 构建失败${NC}"
    exit 1
fi

