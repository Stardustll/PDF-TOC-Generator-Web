# PDF 目录自动生成器 (PDF-TOC-Generator-Web)
纯vibe coding编写的自用玩具，自行测试体验
这是一个基于 Python Flask 开发的 Web 应用，旨在通过 AI (OCR) 技术自动识别 PDF 文档的章节目录，并将其生成为 PDF 标准书签，方便用户快速导航。

## 🌟 主要功能

- **PDF 上传与预览**：支持本地 PDF 文件上传，并在网页端实时预览。
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

### 3. 运行应用

```bash
python app.py
```

应用启动后，请在浏览器中访问：`http://127.0.0.1:5000`

## 📝 使用指南

1. **上传 PDF**：在主页选择并上传需要处理的 PDF 文档。
2. **选择目录页**：定位到 PDF 的目录页面，启动 AI 识别功能。
3. **校对目录**：在右侧编辑器中检查 OCR 识别结果，修正识别错误的文本或页码偏置。
4. **保存生成**：点击生成按钮，下载带有完整目录书签的 PDF 文件。

## ⚠️ 注意事项

- 较大的 PDF 文件上传可能受到 `config.py` 中 `MAX_CONTENT_LENGTH` 的限制。
- OCR 识别准确度受原文档图像质量及排版复杂程度影响。

## 📄 开源协议

本项目采用 [MIT](LICENSE) 协议开源。详细内容请参阅 LICENSE 文件。
