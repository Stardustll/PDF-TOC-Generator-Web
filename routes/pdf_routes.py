# -*- coding: utf-8 -*-
"""PDF 文件管理路由"""

import os
import uuid
import time
import threading
from flask import Blueprint, request, jsonify, send_file, current_app
from services import pdf_service

pdf_bp = Blueprint('pdf', __name__)

# 会话管理（内存存储）
_sessions = {}  # session_id -> { path, filename, created_at }
_lock = threading.Lock()


def _cleanup_expired(max_age=3600):
    """清理过期会话"""
    now = time.time()
    with _lock:
        expired = [sid for sid, s in _sessions.items()
                   if now - s['created_at'] > max_age]
        for sid in expired:
            try:
                os.remove(_sessions[sid]['path'])
            except OSError:
                pass
            del _sessions[sid]


def get_session(sid: str) -> dict | None:
    _cleanup_expired()
    return _sessions.get(sid)


@pdf_bp.route('/api/pdf/upload', methods=['POST'])
def upload_pdf():
    if 'file' not in request.files:
        return jsonify(error="缺少文件"), 400

    file = request.files['file']
    if not file.filename or not file.filename.lower().endswith('.pdf'):
        return jsonify(error="请上传 PDF 文件"), 400

    sid = str(uuid.uuid4())
    upload_dir = current_app.config['UPLOAD_FOLDER']
    path = os.path.join(upload_dir, f"{sid}.pdf")
    file.save(path)

    try:
        page_count = pdf_service.get_page_count(path)
    except Exception as e:
        os.remove(path)
        return jsonify(error=f"无法读取 PDF：{e}"), 400

    with _lock:
        _sessions[sid] = {
            'path': path,
            'filename': file.filename,
            'page_count': page_count,
            'created_at': time.time(),
        }

    return jsonify(session_id=sid, page_count=page_count,
                   filename=file.filename)


@pdf_bp.route('/api/pdf/<sid>/file')
def get_pdf_file(sid):
    session = get_session(sid)
    if not session:
        return jsonify(error="会话不存在或已过期"), 404
    return send_file(session['path'], mimetype='application/pdf')


@pdf_bp.route('/api/pdf/<sid>/info')
def get_pdf_info(sid):
    session = get_session(sid)
    if not session:
        return jsonify(error="会话不存在或已过期"), 404
    return jsonify(page_count=session['page_count'],
                   filename=session['filename'])


@pdf_bp.route('/api/pdf/save-bookmarks', methods=['POST'])
def save_bookmarks():
    data = request.json
    sid = data.get('session_id')
    entries = data.get('entries', [])
    offset = data.get('offset', 0)

    session = get_session(sid)
    if not session:
        return jsonify(error="会话不存在或已过期"), 404

    if not entries:
        return jsonify(error="目录条目为空"), 400

    # 生成带书签的PDF
    upload_dir = current_app.config['UPLOAD_FOLDER']
    out_name = os.path.splitext(session['filename'])[0] + '_带目录.pdf'
    out_path = os.path.join(upload_dir, f"{sid}_output.pdf")

    try:
        pdf_service.save_with_bookmarks(session['path'], out_path,
                                        entries, offset)
    except Exception as e:
        return jsonify(error=f"保存失败：{e}"), 500

    return send_file(out_path, mimetype='application/pdf',
                     as_attachment=True, download_name=out_name)
