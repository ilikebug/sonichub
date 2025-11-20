# Docker 部署指南

## 环境要求

- Docker 20.10+
- Docker Compose 2.0+

## 快速开始

### 1. 使用构建脚本（最简单）

```bash
# 设置环境变量并构建
export NEXT_PUBLIC_SPOTIFY_CLIENT_ID=你的_client_id
export NEXT_PUBLIC_SPOTIFY_CLIENT_SECRET=你的_client_secret
./build-docker.sh

# 或者一行搞定
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=xxx NEXT_PUBLIC_SPOTIFY_CLIENT_SECRET=yyy ./build-docker.sh

# 启动容器
docker run -d -p 3000:3000 --name sonichub sonichub:latest
```

### 2. 使用 Docker 命令

```bash
# 构建镜像（传入 Spotify 凭证）
docker build \
  --build-arg NEXT_PUBLIC_SPOTIFY_CLIENT_ID=你的_client_id \
  --build-arg NEXT_PUBLIC_SPOTIFY_CLIENT_SECRET=你的_client_secret \
  -t sonichub:latest .

# 运行容器
docker run -d \
  --name sonichub \
  -p 3000:3000 \
  sonichub:latest

# 查看日志
docker logs -f sonichub

# 停止容器
docker stop sonichub

# 删除容器
docker rm sonichub
```

### 3. 使用 Docker Compose

修改 `docker-compose.yml` 中的凭证，然后：

```bash
# 取消注释 build 部分后构建
docker compose build

# 启动容器
docker compose up -d

# 查看日志
docker compose logs -f

# 停止容器
docker compose down
```

访问 http://localhost:3000

## 配置 Spotify API 凭证

**重要**：Spotify API 凭证需要在**构建时**注入，不能在运行时修改。

### 方法 1：使用 docker build 命令

```bash
docker build \
  --build-arg NEXT_PUBLIC_SPOTIFY_CLIENT_ID=你的_client_id \
  --build-arg NEXT_PUBLIC_SPOTIFY_CLIENT_SECRET=你的_client_secret \
  -t sonichub:latest .
```

### 方法 2：修改 docker-compose.yml

取消注释 `build` 部分，修改凭证后运行：

```bash
docker compose build
docker compose up -d
```

### 注意事项

- Spotify 凭证会被打包进镜像（用于客户端 JavaScript）
- 修改凭证后需要重新构建镜像
- 不要将包含真实凭证的镜像公开分享

## 构建优化

### 查看镜像大小

```bash
docker images sonichub
```

### 多平台构建（适用于不同架构）

```bash
# 为 AMD64 和 ARM64 构建
docker buildx build --platform linux/amd64,linux/arm64 -t sonichub:latest .
```

## 推送到 Docker Hub

### 方法 1：使用推送脚本（推荐）

```bash
# 使用脚本推送（会自动登录和打标签）
./push-docker.sh <你的dockerhub用户名>

# 示例
./push-docker.sh zhangsan
```

### 方法 2：手动推送

```bash
# 1. 登录 Docker Hub
docker login

# 2. 给镜像打标签
docker tag sonichub:latest <你的用户名>/sonichub:latest

# 3. 推送镜像
docker push <你的用户名>/sonichub:latest
```

### ⚠️ 安全提醒

**重要：此镜像包含 Spotify API 凭证！**

1. **不要设置为公开仓库**
   - 登录 https://hub.docker.com
   - 进入仓库设置
   - 将 Visibility 设置为 **Private（私有）**

2. **其他人拉取镜像**
   ```bash
   docker pull <你的用户名>/sonichub:latest
   docker run -d -p 3000:3000 <你的用户名>/sonichub:latest
   ```

3. **如果想公开分享**
   - 构建时不要传入真实凭证
   - 让使用者在运行时提供自己的凭证
   - 或者使用本地文件分享方式（见下方）

## 导出和本地分享

### 保存镜像为文件

```bash
# 导出镜像
docker save sonichub:latest -o sonichub.tar

# 压缩
gzip sonichub.tar

# 得到 sonichub.tar.gz（约 400MB）
```

### 在其他机器上加载镜像

```bash
# 解压
gunzip sonichub.tar.gz

# 加载镜像
docker load -i sonichub.tar

# 运行
docker run -d -p 3000:3000 sonichub:latest
```

## 常见问题

### 1. 端口被占用

如果 3000 端口被占用，可以修改端口映射：

```bash
docker run -d -p 8080:3000 sonichub:latest
```

### 2. 查看容器内部

```bash
# 进入容器
docker exec -it sonichub sh

# 查看文件
ls -la
```

### 3. 更新应用

```bash
# 停止并删除旧容器
docker-compose down

# 重新构建
docker-compose up -d --build
```

## 生产部署建议

1. **使用 Nginx 反向代理**
2. **配置 HTTPS**
3. **设置资源限制**：

```yaml
services:
  sonichub:
    # ...
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
```

4. **配置健康检查**：

```yaml
services:
  sonichub:
    # ...
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## 镜像大小

当前 Dockerfile 已经使用了：
- ✅ 多阶段构建
- ✅ Alpine Linux（最小化基础镜像）
- ✅ 仅复制必要文件
- ✅ 非 root 用户运行

**镜像包含的依赖**：
- Node.js 22
- Python 3 + yt-dlp（YouTube 音频下载）
- FFmpeg（音频处理）

最终镜像大小：**~420MB**

