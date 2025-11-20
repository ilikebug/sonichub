# Docker Hub 推送指南

## 快速推送

```bash
# 1. 运行推送脚本
./push-docker.sh <你的dockerhub用户名>

# 示例
./push-docker.sh zhangsan
```

脚本会自动：
- ✅ 检查登录状态（未登录会提示登录）
- ✅ 给镜像打标签
- ✅ 推送到 Docker Hub
- ✅ 显示安全提醒

## 完整步骤说明

### 1. 注册 Docker Hub 账号

如果还没有账号，访问 https://hub.docker.com 注册。

### 2. 登录 Docker Hub

```bash
docker login
```

输入你的用户名和密码（或 Access Token）。

### 3. 构建镜像（如果还没构建）

```bash
# 使用构建脚本
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=你的ID \
NEXT_PUBLIC_SPOTIFY_CLIENT_SECRET=你的密钥 \
./build-docker.sh
```

### 4. 给镜像打标签

```bash
# 格式: docker tag 本地镜像 用户名/仓库名:标签
docker tag sonichub:latest zhangsan/sonichub:latest

# 可以同时打多个标签
docker tag sonichub:latest zhangsan/sonichub:v1.0.0
docker tag sonichub:latest zhangsan/sonichub:stable
```

### 5. 推送镜像

```bash
# 推送指定标签
docker push zhangsan/sonichub:latest

# 推送所有标签
docker push zhangsan/sonichub --all-tags
```

### 6. 设置仓库为私有（重要！）

1. 访问 https://hub.docker.com/repositories
2. 找到你的仓库（例如：`zhangsan/sonichub`）
3. 点击仓库名进入
4. 点击 **Settings** 标签
5. 在 **General** 部分找到 **Repository visibility**
6. 选择 **Private**
7. 点击 **Save**

> ⚠️ **为什么要设为私有？**  
> 因为 Spotify API 凭证被打包进了镜像，公开会泄露你的凭证！

## 其他人如何使用

### 从 Docker Hub 拉取

如果是**私有仓库**，需要先登录：

```bash
# 登录 Docker Hub
docker login

# 拉取镜像
docker pull zhangsan/sonichub:latest

# 运行
docker run -d -p 3000:3000 --name sonichub zhangsan/sonichub:latest
```

### 从本地文件加载（推荐）

如果不想用 Docker Hub，可以导出为文件分享：

```bash
# 导出镜像
docker save sonichub:latest | gzip > sonichub.tar.gz

# 其他机器上加载
gunzip -c sonichub.tar.gz | docker load
docker run -d -p 3000:3000 sonichub:latest
```

## 管理镜像标签

### 查看本地镜像

```bash
docker images | grep sonichub
```

### 删除标签

```bash
# 删除本地标签
docker rmi zhangsan/sonichub:latest

# 在 Docker Hub 上删除需要到网页操作
```

### 版本管理建议

```bash
# 使用语义化版本
docker tag sonichub:latest zhangsan/sonichub:1.0.0
docker tag sonichub:latest zhangsan/sonichub:1.0
docker tag sonichub:latest zhangsan/sonichub:1
docker tag sonichub:latest zhangsan/sonichub:latest

# 推送所有标签
docker push zhangsan/sonichub --all-tags
```

## 自动化推送（GitHub Actions）

如果想在 GitHub 上自动构建和推送，可以创建 `.github/workflows/docker.yml`：

```yaml
name: Docker Build and Push

on:
  push:
    branches: [ main ]
    tags: [ 'v*' ]

jobs:
  docker:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Login to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}
      
      - name: Build and push
        uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: |
            ${{ secrets.DOCKERHUB_USERNAME }}/sonichub:latest
          build-args: |
            NEXT_PUBLIC_SPOTIFY_CLIENT_ID=${{ secrets.SPOTIFY_CLIENT_ID }}
            NEXT_PUBLIC_SPOTIFY_CLIENT_SECRET=${{ secrets.SPOTIFY_CLIENT_SECRET }}
```

需要在 GitHub 仓库的 Settings > Secrets 中添加：
- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`
- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`

## 常见问题

### Q: 推送失败，提示 "denied: requested access to the resource is denied"

**A**: 通常是标签格式不对或未登录。

```bash
# 确保已登录
docker login

# 检查标签格式（必须包含用户名）
docker tag sonichub:latest 你的用户名/sonichub:latest
docker push 你的用户名/sonichub:latest
```

### Q: 推送很慢怎么办？

**A**: 
1. 使用国内镜像加速（仅拉取）
2. 考虑使用阿里云/腾讯云的容器镜像服务
3. 或直接使用文件分享方式

### Q: 如何删除 Docker Hub 上的镜像？

**A**: 
1. 登录 https://hub.docker.com
2. 进入仓库
3. 点击 Tags 标签
4. 选择要删除的标签
5. 点击删除按钮

### Q: 如何更新已推送的镜像？

**A**: 
```bash
# 重新构建
./build-docker.sh

# 重新推送（会覆盖同名标签）
./push-docker.sh 你的用户名
```

## 总结

✅ **推荐方式（私密分享）**：
```bash
./push-docker.sh 你的用户名
# 然后设置仓库为 Private
```

✅ **推荐方式（本地分享）**：
```bash
docker save sonichub:latest | gzip > sonichub.tar.gz
# 传输文件给其他人
```

⚠️ **不推荐**：将包含真实凭证的镜像设为公开

