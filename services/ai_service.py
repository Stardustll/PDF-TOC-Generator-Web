# -*- coding: utf-8 -*-
"""AI 视觉识别服务 — OpenAI 兼容 API"""

import json
import urllib.request
import urllib.error

SYSTEM_PROMPT = (
    "你是一个专业的 PDF 目录提取助手。"
    "用户会发给你一张或多张 PDF 目录页图片。"
    "请识别全部目录条目，严格按以下格式逐行输出，不要输出任何其他内容：\n"
    "  层级|标题|页码\n"
    "其中：\n"
    "  层级：1=章，2=节，3=小节，根据缩进/编号层次判断\n"
    "  标题：目录中的原始标题文字\n"
    "  页码：对应的页码数字\n"
    "示例：\n"
    "  1|第一章 绪论|1\n"
    "  2|1.1 相关介绍|3\n"
    "  1|第二章 相关工作|8\n"
    "输出只包含条目行，不要有标题、说明或 markdown 格式。"
)

UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)


def _build_headers(api_key: str) -> dict:
    h = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": UA,
    }
    if api_key:
        h["Authorization"] = f"Bearer {api_key}"
    return h


def fetch_models(api_url: str, api_key: str) -> list[str]:
    url = api_url.rstrip("/") + "/models"
    req = urllib.request.Request(url, method="GET",
                                headers=_build_headers(api_key))
    with urllib.request.urlopen(req, timeout=15) as resp:
        body = json.loads(resp.read().decode("utf-8"))
    data = body.get("data", body) if isinstance(body, dict) else body
    ids = sorted({item["id"] for item in data if "id" in item})
    return ids


def call_vision_api(b64_images: list[str], cfg: dict,
                    progress_cb=None) -> str:
    content = []
    for i, b64 in enumerate(b64_images):
        if len(b64_images) > 1:
            content.append({"type": "text", "text": f"目录第 {i + 1} 页："})
        content.append({
            "type": "image_url",
            "image_url": {
                "url": f"data:image/png;base64,{b64}",
                "detail": "high"
            }
        })

    payload = json.dumps({
        "model": cfg["model"],
        "max_tokens": cfg["max_tokens"],
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": content},
        ]
    }, ensure_ascii=False).encode("utf-8")

    url = cfg["api_url"].rstrip("/") + "/chat/completions"
    headers = _build_headers(cfg.get("api_key", ""))
    req = urllib.request.Request(url, data=payload, method="POST",
                                headers=headers)

    if progress_cb:
        progress_cb(f"正在请求模型 {cfg['model']}…")

    try:
        with urllib.request.urlopen(req, timeout=180) as resp:
            body = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        try:
            err_json = json.loads(err_body)
            err_msg = (err_json.get("error", {}).get("message")
                       or err_json.get("message")
                       or err_body[:400])
        except Exception:
            err_msg = err_body[:400]
        raise RuntimeError(f"HTTP {e.code} {e.reason}\n{err_msg}") from None

    return body["choices"][0]["message"]["content"]
