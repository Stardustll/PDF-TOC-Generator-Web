import os
import secrets

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')
MAX_CONTENT_LENGTH = 200 * 1024 * 1024  # 200MB
SESSION_MAX_AGE = 3600  # 1小时过期

# Flask Session 签名密钥（每次启动自动生成，若需跨重启保持登录状态请改为固定字符串）
SECRET_KEY = os.environ.get('SECRET_KEY', secrets.token_hex(32))

# 管理员密码（可通过环境变量 ADMIN_PASSWORD 覆盖）
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'admin123')
