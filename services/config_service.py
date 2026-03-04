# -*- coding: utf-8 -*-
"""AI 配置持久化服务 — 与 C#/Python 桌面版共用同一配置文件"""

import os
import json

CONFIG_PATH = os.path.join(os.path.expanduser("~"), ".pdf_toc_ai_config.json")

CONFIG_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "global_ai_config.json")

DEFAULT_CONFIG = {
    "api_url": "https://api.openai.com/v1",
    "api_key": "",
    "model": "gpt-4o",
    "max_tokens": 4096,
}


def load_global_config() -> dict:
    """加载管理员设置的全局持久配置"""
    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                cfg = json.load(f)
            # 补全缺失项
            for k, v in DEFAULT_CONFIG.items():
                cfg.setdefault(k, v)
            return cfg
        except Exception:
            pass
    return dict(DEFAULT_CONFIG)


def save_global_config(cfg: dict):
    """保存管理员设置的全局持久配置"""
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(cfg, f, ensure_ascii=False, indent=2)


def load_default_config() -> dict:
    """返回初始默认配置模板"""
    return dict(DEFAULT_CONFIG)
