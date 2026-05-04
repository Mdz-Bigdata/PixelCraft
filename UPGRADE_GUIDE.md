# PixelCraft v1.0.0 升级指南

## 概述

本次升级包含以下主要改进：

1. **完全支持现代 Python** - 从 Python 3.6-3.9 升级为支持 Python 3.6-3.14
2. **修复安全问题** - 替换不安全的 exec/eval 为 __import__/getattr
3. **增强下载功能** - 原子下载 + 空文件检测 + 超时处理
4. **AI 视频生成** - 新增基于 Stable Diffusion 2.0 的二创视频功能

---

## 文件变更一览

### 修改的文件

| 文件 | 变更内容 |
|------|----------|
| `setup.py` | 移除 Python 版本限制，新增 extras_require['ai'] |
| `PixelCraft/version.py` | 版本从 0.9.2 升级到 1.0.0 |
| `PixelCraft/feature_list.py` | 替换 exec/eval 为 __import__/getattr |
| `PixelCraft/filter_list.py` | 替换 exec/eval 为 __import__/getattr |
| `PixelCraft/image_filters/text_detector.py` | 添加文件大小校验、原子下载、超时处理 |
| `PixelCraft/image_features/face_feature.py` | 添加文件大小校验、原子下载、超时处理 |

### 新增的文件

| 文件 | 功能 |
|------|------|
| `PixelCraft/video_ai.py` | AI 视频生成模块（Stable Diffusion） |
| `example_ai_video.py` | AI 视频生成示例脚本 |
| `UPGRADE_GUIDE.md` | 本升级说明文档 |

### 更新的文件

| 文件 | 变更 |
|------|------|
| `start_all.sh` | 整合 AI 视频生成流程，扩展为 8 步流程 |

---

## 安装与运行

### 方式 1：一键启动（推荐）

```bash
chmod +x start_all.sh
./start_all.sh
```

### 方式 2：分步运行

#### 步骤 1：视频关键帧提取
```bash
python3 example_video.py
```

#### 步骤 2：视频压缩
```bash
python3 example_video_compression.py
```

#### 步骤 3：图像智能缩放
```bash
python3 example_image_resize.py
```

#### 步骤 4：AI 视频二创（可选）
```bash
# 安装 AI 依赖
pip install torch torchvision diffusers transformers accelerate pillow

# 运行
python3 example_ai_video.py
```

---

## 新功能说明

### 1. AI 视频生成模块

```python
from PixelCraft.video_ai import VideoAIGenerator

generator = VideoAIGenerator(model_id="stabilityai/stable-diffusion-2")

# 从关键帧生成 AI 视频
frames, fps = generator.generate_video(
    prompt="A beautiful, cinematic scene",
    keyframes_dir="selectedframes",
    output_dir="ai_generated",
    strength=0.7,
    guidance_scale=8.0
)
```

### 2. 关键特性

#### 原子下载（防损坏）
- 下载先写入 `.tmp` 临时文件
- 成功后原子重命名
- 失败自动清理临时文件

#### 空文件检测
- 检测 0 字节文件
- 自动删除并重新下载

#### 超时处理
- 请求超时设置为 60 秒
- 提供友好错误信息

#### 优雅降级
- AI 功能失败时自动回退到帧拼接
- 核心功能独立运行

---

## 兼容性说明

| Python 版本 | 兼容性 | 说明 |
|-------------|--------|------|
| 3.6 - 3.9 | ✅ 完全兼容 | 原始支持范围 |
| 3.10 - 3.14 | ✅ 兼容 | 更新后支持 |

---

## 常见问题

### Q: 之前安装的还能用吗？
A: 可以，升级是向后兼容的。

### Q: 必须安装 AI 依赖吗？
A: 不需要。核心功能（视频压缩、图像缩放等）不需要 AI 依赖。AI 功能是可选的。

### Q: 模型下载慢怎么办？
A: AI 模型由 huggingface 分发，可以设置镜像源：
```bash
export HF_ENDPOINT=https://hf-mirror.com
```

---

## 项目变更总结

| 变更类型 | 数量 |
|----------|------|
| 新增模块 | 1 |
| 新增示例 | 1 |
| 修改文件 | 7 |
| 新增文档 | 1 |
| 更新脚本 | 1 |

---

## 版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| 1.0.0 | 2026-05-04 | 支持 Python 3.12-3.14、AI 视频生成、原子下载 |
| 0.9.2 | - | 原始版本 |
