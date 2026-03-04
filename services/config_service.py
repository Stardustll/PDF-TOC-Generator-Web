# -*- coding: utf-8 -*-
"""AI 配置持久化服务 — 与 C#/Python 桌面版共用同一配置文件"""

import os
import json

CONFIG_PATH = os.path.join(os.path.expanduser("~"), ".pdf_toc_ai_config.json")

DEFAULT_CONFIG = {
    "api_url": "https://api.openai.com/v1",
    "api_key": "",
    "model": "gpt-4o",
    "max_tokens": 4096,
}


def load_config() -> dict:
    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                cfg = json.load(f)
            for k, v in DEFAULT_CONFIG.items():
                cfg.setdefault(k, v)
            return cfg
        except Exception:
            pass
    return dict(DEFAULT_CONFIG)


def save_config(cfg: dict):
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(cfg, f, ensure_ascii=False, indent=2)
