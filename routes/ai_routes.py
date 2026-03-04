# -*- coding: utf-8 -*-
"""AI 识别 & 配置路由 — SSE 进度推送"""

import uuid
import json
import queue
import threading
from flask import Blueprint, request, jsonify, Response
from services import pdf_service, ai_service, config_service
from routes.pdf_routes import get_session

ai_bp = Blueprint('ai', __name__)

_tasks = {}  # task_id -> { queue, done }


@ai_bp.route('/api/ai/config', methods=['GET'])
def get_config():
    cfg = config_service.load_config()
    # 脱敏 API Key
    safe_cfg = dict(cfg)
    if safe_cfg.get('api_key'):
        key = safe_cfg['api_key']
        safe_cfg['api_key_masked'] = key[:4] + '****' + key[-4:] if len(key) > 8 else '****'
    else:
        safe_cfg['api_key_masked'] = ''
    return jsonify(safe_cfg)


@ai_bp.route('/api/ai/config', methods=['PUT'])
def save_config():
    data = request.json
    cfg = config_service.load_config()

    if 'api_url' in data:
        cfg['api_url'] = data['api_url'].strip().rstrip('/')
    if 'api_key' in data:
        cfg['api_key'] = data['api_key'].strip()
    if 'model' in data:
        cfg['model'] = data['model'].strip()
    if 'max_tokens' in data:
        cfg['max_tokens'] = int(data['max_tokens'])

    config_service.save_config(cfg)
    return jsonify(ok=True)


@ai_bp.route('/api/ai/test-connection', methods=['POST'])
def test_connection():
    data = request.json
    api_url = data.get('api_url', '').strip().rstrip('/')
    api_key = data.get('api_key', '').strip()

    if not api_url:
        return jsonify(error="API URL 不能为空"), 400

    try:
        models = ai_service.fetch_models(api_url, api_key)
        return jsonify(ok=True, models=models)
    except Exception as e:
        return jsonify(ok=False, error=str(e)[:200]), 200


@ai_bp.route('/api/ai/fetch-models', methods=['POST'])
def fetch_models():
    data = request.json
    api_url = data.get('api_url', '').strip().rstrip('/')
    api_key = data.get('api_key', '').strip()

    try:
        models = ai_service.fetch_models(api_url, api_key)
        return jsonify(models=models)
    except Exception as e:
        return jsonify(error=str(e)[:200]), 500


@ai_bp.route('/api/ai/recognize', methods=['POST'])
def ai_recognize():
    data = request.json
    sid = data.get('session_id')
    page_indices = data.get('page_indices', [])

    session = get_session(sid)
    if not session:
        return jsonify(error="会话不存在或已过期"), 404

    if not page_indices:
        return jsonify(error="未选择目录页"), 400

    cfg = config_service.load_config()

    task_id = str(uuid.uuid4())
    q = queue.Queue()
    _tasks[task_id] = {'queue': q, 'done': False}

    def worker():
        try:
            sorted_indices = sorted(page_indices)
            q.put({'progress': 10, 'message': '渲染页面图像…'})

            b64_images = []
            for i, idx in enumerate(sorted_indices):
                b64 = pdf_service.render_page_to_base64(
                    session['path'], idx, dpi=150)
                b64_images.append(b64)
                q.put({
                    'progress': 10 + int(30 * (i + 1) / len(sorted_indices)),
                    'message': f'已渲染 {i + 1}/{len(sorted_indices)} 页'
                })

            q.put({
                'progress': 40,
                'message': f'正在请求 {cfg["model"]}…'
            })

            def progress_cb(msg):
                q.put({'progress': 60, 'message': msg})

            raw_text = ai_service.call_vision_api(
                b64_images, cfg, progress_cb=progress_cb)

            q.put({'progress': 90, 'message': '解析结果…'})
            entries = pdf_service.parse_ai_response(raw_text)

            q.put({
                'done': True,
                'entries': entries,
                'raw_text': raw_text,
                'message': f'AI 识别完成，共 {len(entries)} 条'
            })
        except Exception as e:
            q.put({'done': True, 'error': str(e)})
        finally:
            _tasks[task_id]['done'] = True

    threading.Thread(target=worker, daemon=True).start()
    return jsonify(task_id=task_id)


@ai_bp.route('/api/ai/status/<task_id>')
def ai_status(task_id):
    def generate():
        task = _tasks.get(task_id)
        if not task:
            yield f"data: {json.dumps({'error': '任务不存在'})}\n\n"
            return

        while True:
            try:
                msg = task['queue'].get(timeout=30)
                yield f"data: {json.dumps(msg, ensure_ascii=False)}\n\n"
                if msg.get('done'):
                    del _tasks[task_id]
                    break
            except queue.Empty:
                yield f"data: {json.dumps({'heartbeat': True})}\n\n"

    return Response(generate(), mimetype='text/event-stream',
                    headers={
                        'Cache-Control': 'no-cache',
                        'X-Accel-Buffering': 'no',
                    })
