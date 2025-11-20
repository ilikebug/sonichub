#!/bin/bash

# Docker Hub 推送脚本
# 使用方法: ./push-docker.sh <你的dockerhub用户名>

set -e

# 颜色输出
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 检查参数
if [ -z "$1" ]; then
    echo -e "${RED}❌ 错误: 请提供 Docker Hub 用户名${NC}"
    echo ""
    echo "使用方法:"
    echo "  ./push-docker.sh <你的dockerhub用户名>"
    echo ""
    echo "示例:"
    echo "  ./push-docker.sh yourusername"
    exit 1
fi

DOCKERHUB_USERNAME=$1
IMAGE_NAME="sonichub"
TAG=${2:-latest}

echo -e "${BLUE}🐳 准备推送 Docker 镜像到 Docker Hub${NC}"
echo ""

# 警告提示
echo -e "${YELLOW}⚠️  注意: 此镜像包含 Spotify API 凭证${NC}"
echo -e "${YELLOW}   - 凭证已被打包到镜像中${NC}"
echo -e "${YELLOW}   - 不要将镜像设置为公开（public）${NC}"
echo -e "${YELLOW}   - 建议设置为私有（private）${NC}"
echo ""
read -p "是否继续推送? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "已取消"
    exit 1
fi

# 检查是否已登录 Docker Hub
echo -e "${BLUE}🔐 检查 Docker Hub 登录状态...${NC}"
if ! docker info | grep -q "Username"; then
    echo -e "${YELLOW}请先登录 Docker Hub:${NC}"
    docker login
else
    echo -e "${GREEN}✅ 已登录 Docker Hub${NC}"
fi

# 给镜像打标签
echo ""
echo -e "${BLUE}🏷️  给镜像打标签...${NC}"
docker tag sonichub:latest ${DOCKERHUB_USERNAME}/${IMAGE_NAME}:${TAG}

# 推送镜像
echo ""
echo -e "${BLUE}⬆️  推送镜像到 Docker Hub...${NC}"
docker push ${DOCKERHUB_USERNAME}/${IMAGE_NAME}:${TAG}

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ 推送成功！${NC}"
    echo ""
    echo "镜像地址:"
    echo "  ${DOCKERHUB_USERNAME}/${IMAGE_NAME}:${TAG}"
    echo ""
    echo "其他人可以使用以下命令拉取并运行:"
    echo "  docker pull ${DOCKERHUB_USERNAME}/${IMAGE_NAME}:${TAG}"
    echo "  docker run -d -p 3000:3000 ${DOCKERHUB_USERNAME}/${IMAGE_NAME}:${TAG}"
    echo ""
    echo -e "${YELLOW}⚠️  重要提醒:${NC}"
    echo "  1. 登录 Docker Hub (https://hub.docker.com)"
    echo "  2. 找到你的仓库: ${DOCKERHUB_USERNAME}/${IMAGE_NAME}"
    echo "  3. 点击 Settings"
    echo "  4. 将 Visibility 设置为 Private（私有）"
else
    echo -e "${RED}❌ 推送失败${NC}"
    exit 1
fi

