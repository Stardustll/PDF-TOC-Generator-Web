# -*- coding: utf-8 -*-
"""PDF 核心服务：文本提取、目录解析、书签写入"""

import re
import io
import base64
import fitz  # PyMuPDF
from PIL import Image


def get_page_count(pdf_path: str) -> int:
    doc = fitz.open(pdf_path)
    count = len(doc)
    doc.close()
    return count


def extract_text_pages(pdf_path: str, page_indices: list[int]) -> str:
    doc = fitz.open(pdf_path)
    texts = []
    for idx in sorted(page_indices):
        if 0 <= idx < len(doc):
            texts.append(doc[idx].get_text("text"))
    doc.close()
    return "\n".join(texts)


def parse_toc_text(raw_text: str) -> list[dict]:
    """从目录页原始文本解析条目 — 与 C#/Python 桌面版正则一致"""
    entries = []
    lines = raw_text.splitlines()

    h1_prefix = re.compile(
        r'^(第[零一二三四五六七八九十百千\d]+[章节篇部分]|[０-９\d]+\s*[、.。]\s*\S)')
    h2_prefix = re.compile(r'^(\d+\.\d+[\s　]|\d+\s+\d+\s)')
    h3_prefix = re.compile(r'^(\d+\.\d+\.\d+[\s　])')

    page_re = re.compile(
        r'^(.*?)[\s\u00b7\u2026\u22ef\.\-\u30fb\uff65\u00b7\u25cf·…─\–—\s]*'
        r'(\d{1,5})\s*$'
    )
    leading_space_re = re.compile(r'^(\s+)')

    for line in lines:
        line = line.rstrip()
        if not line.strip():
            continue

        m = page_re.match(line)
        if not m:
            m2 = re.search(r'(\d{1,5})\s*$', line)
            if m2:
                title_part = line[:m2.start()].strip(' \t\u00b7\u2026.…·─–—')
                page_num = int(m2.group(1))
            else:
                continue
        else:
            title_part = m.group(1).strip(' \t\u00b7\u2026.…·─–—')
            page_num = int(m.group(2))

        if not title_part:
            continue

        indent_m = leading_space_re.match(line)
        indent = len(indent_m.group(1)) if indent_m else 0

        if h3_prefix.match(title_part) or indent >= 8:
            level = 3
        elif h2_prefix.match(title_part) or indent >= 4:
            level = 2
        elif h1_prefix.match(title_part) or indent == 0:
            level = 1
        else:
            level = 2

        entries.append({"level": level, "title": title_part, "page": page_num})

    return entries


def parse_ai_response(text: str) -> list[dict]:
    """解析 AI 返回的 '层级|标题|页码' 格式"""
    entries = []
    for line in text.splitlines():
        line = line.strip().replace("｜", "|")
        if not line:
            continue
        parts = line.split("|")
        if len(parts) < 3:
            continue
        try:
            level = int(parts[0].strip())
            title = parts[1].strip()
            page = int(re.sub(r"[^\d]", "", parts[2]))
        except ValueError:
            continue
        if not title or level not in (1, 2, 3):
            continue
        entries.append({"level": level, "title": title, "page": page})
    return entries


def render_page_to_base64(pdf_path: str, page_idx: int, dpi: int = 150) -> str:
    doc = fitz.open(pdf_path)
    page = doc[page_idx]
    zoom = dpi / 72
    mat = fitz.Matrix(zoom, zoom)
    pix = page.get_pixmap(matrix=mat, alpha=False)
    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    doc.close()
    return base64.b64encode(buf.getvalue()).decode()


def save_with_bookmarks(input_path: str, output_path: str,
                        entries: list[dict], offset: int = 0):
    doc = fitz.open(input_path)
    total_pages = len(doc)
    toc = []
    for entry in entries:
        real_page = max(1, min(entry["page"] + offset, total_pages))
        toc.append([entry["level"], entry["title"], real_page])
    doc.set_toc(toc)
    doc.save(output_path, garbage=4, deflate=True)
    doc.close()
