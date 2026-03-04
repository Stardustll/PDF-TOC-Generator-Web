# -*- coding: utf-8 -*-
"""PDF 目录生成器 Web 版 — Flask 主入口"""

import os
from flask import Flask, render_template
from config import UPLOAD_FOLDER, MAX_CONTENT_LENGTH

def create_app():
    app = Flask(__name__)
    app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
    app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH

    os.makedirs(UPLOAD_FOLDER, exist_ok=True)

    from routes.pdf_routes import pdf_bp
    from routes.toc_routes import toc_bp
    from routes.ai_routes import ai_bp

    app.register_blueprint(pdf_bp)
    app.register_blueprint(toc_bp)
    app.register_blueprint(ai_bp)

    @app.route('/')
    def index():
        return render_template('index.html')

    return app


if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='127.0.0.1', port=5000, threaded=True)
