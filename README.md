# PDF 目录自动生成器 (PDF-TOC-Generator-Web)

这是一个基于 Python Flask 开发的 Web 应用，旨在通过 AI (OCR) 技术自动识别 PDF 文档的章节目录，并将其生成为 PDF 标准书签，方便用户快速导航。

## 🌟 主要功能

- **PDF 上传与预览**：支持本地 PDF 文件上传，并在网页端实时预览。
- **AI 目录识别**：利用 PaddleOCR 技术，自动识别 PDF 目录页中的标题、页码及其层级关系。
- **在线目录编辑**：提供交互式界面，支持手动导出、修改、删除及调整目录项层级。
- **书签一键生成**：将编辑好的目录结构回写至原 PDF 文件，生成标准的 PDF 书签。
- **可视化界面**：简洁直观的 Web UI，降低 PDF 目录处理的门槛。

## 🛠️ 技术栈

- **后端**: [Flask](https://flask.palletsprojects.com/)
- **PDF 处理**: [PyMuPDF (fitz)](https://pymupdf.readthedocs.io/)
- **AI/OCR**: [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR)
- **前端**: HTML5, CSS3, JavaScript (原生)

## 🚀 快速启动

### 1. 环境准备

确保您的系统中已安装 Python 3.8 或更高版本。

### 2. 克隆项目与安装依赖

```bash
# 安装依赖
pip install -r requirements.txt
```

> **注意**：PaddleOCR 可能需要根据您的操作系统（Windows/Linux/Mac）额外安装一些驱动或库。

### 3. 运行应用

```bash
python app.py
```

应用启动后，请在浏览器中访问：`http://127.0.0.1:5000`

## 📂 项目结构

```text
├── app.py              # 程序入口
├── config.py           # 全局配置 (上传大小限制、路径等)
├── routes/             # 路由模块 (AI、PDF、TOC 相关 API)
├── services/           # 业务逻辑 (OCR 识别、PDF 书签处理)
├── static/             # 静态文件 (CSS, JS, 库文件)
├── templates/          # HTML 模板
└── uploads/            # 临时上传目录 (已忽略 Git 跟踪)
```

## 📝 使用指南

1. **上传 PDF**：在主页选择并上传需要处理的 PDF 文档。
2. **选择目录页**：定位到 PDF 的目录页面，启动 AI 识别功能。
3. **校对目录**：在右侧编辑器中检查 OCR 识别结果，修正识别错误的文本或页码偏置。
4. **保存生成**：点击生成按钮，下载带有完整目录书签的 PDF 文件。

## ⚠️ 注意事项

- 本地推理 OCR 需要一定的内存/显存资源。
- 较大的 PDF 文件上传可能受到 `config.py` 中 `MAX_CONTENT_LENGTH` 的限制。
- OCR 识别准确度受原文档图像质量及排版复杂程度影响。

## 📄 开源协议

MIT
