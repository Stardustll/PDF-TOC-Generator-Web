import os

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')
MAX_CONTENT_LENGTH = 200 * 1024 * 1024  # 200MB
SESSION_MAX_AGE = 3600  # 1小时过期
