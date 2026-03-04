# -*- coding: utf-8 -*-
"""管理员后台路由 — 管理员登录 & 全局 AI 配置管理"""

from functools import wraps
from flask import Blueprint, request, jsonify, session, render_template, redirect, url_for
from services import ai_service, config_service
from config import ADMIN_PASSWORD

admin_bp = Blueprint('admin', __name__)

# ── 登录鉴权装饰器 ───────────────────────────────────────────────


def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get('admin_logged_in'):
            return jsonify(error="未授权，请先登录管理后台"), 401
        return f(*args, **kwargs)
    return decorated


# ── 页面路由 ────────────────────────────────────────────────────


@admin_bp.route('/admin')
def admin_page():
    return render_template('admin.html',
                           logged_in=session.get('admin_logged_in', False))


# ── 登录 / 登出 API ─────────────────────────────────────────────


@admin_bp.route('/admin/login', methods=['POST'])
def admin_login():
    data = request.json
    if data.get('password') == ADMIN_PASSWORD:
        session['admin_logged_in'] = True
        session.permanent = True
        return jsonify(ok=True)
    return jsonify(ok=False, error="密码错误"), 401


@admin_bp.route('/admin/logout', methods=['POST'])
def admin_logout():
    session.pop('admin_logged_in', None)
    return jsonify(ok=True)


# ── 全局 AI 配置 API ────────────────────────────────────────────


@admin_bp.route('/admin/api/ai-config', methods=['GET'])
@admin_required
def admin_get_config():
    cfg = config_service.load_global_config()
    # 脱敏返回
    safe = dict(cfg)
    safe['api_key_masked'] = (cfg['api_key'][:4] + '****' + cfg['api_key'][-4:]
                              if len(cfg.get('api_key', '')) > 8 else '****')
    return jsonify(safe)


@admin_bp.route('/admin/api/ai-config', methods=['PUT'])
@admin_required
def admin_save_config():
    data = request.json
    cfg = config_service.load_global_config().copy()
    for k in ['api_url', 'api_key', 'model', 'max_tokens']:
        if k in data and data[k] != '':
            if k == 'max_tokens':
                cfg[k] = int(data[k])
            else:
                v = str(data[k]).strip()
                cfg[k] = v.rstrip('/') if k == 'api_url' else v
    config_service.save_global_config(cfg)
    return jsonify(ok=True, message="全局配置已保存")


@admin_bp.route('/admin/api/test-connection', methods=['POST'])
@admin_required
def admin_test_connection():
    data = request.json
    api_url = data.get('api_url', '').strip().rstrip('/')
    api_key = data.get('api_key', '').strip()
    if not api_url:
        return jsonify(error="API URL 不能为空"), 400
    try:
        models = ai_service.fetch_models(api_url, api_key)
        return jsonify(ok=True, models=models)
    except Exception as e:
        return jsonify(ok=False, error=str(e)[:300])
