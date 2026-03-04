# -*- coding: utf-8 -*-
"""文本提取与目录解析路由"""

from flask import Blueprint, request, jsonify
from services import pdf_service
from routes.pdf_routes import get_session

toc_bp = Blueprint('toc', __name__)


@toc_bp.route('/api/toc/extract-text', methods=['POST'])
def extract_text():
    data = request.json
    sid = data.get('session_id')
    page_indices = data.get('page_indices', [])

    session = get_session(sid)
    if not session:
        return jsonify(error="会话不存在或已过期"), 404

    if not page_indices:
        return jsonify(error="未选择目录页"), 400

    try:
        raw_text = pdf_service.extract_text_pages(session['path'],
                                                  page_indices)
        entries = pdf_service.parse_toc_text(raw_text)
    except Exception as e:
        return jsonify(error=f"提取失败：{e}"), 500

    return jsonify(entries=entries, raw_text=raw_text)
