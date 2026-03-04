/* ================================================================
   app.js — 应用主入口、全局状态管理、事件协调
   ================================================================ */

const AppState = {
    sessionId: null,
    pageCount: 0,
    filename: '',
    tocPageIndices: new Set(),
    entries: [],
    offset: 0,
    currentPreviewPage: 0,
};

/* ── 事件总线 ──────────────────────────────── */
const EventBus = {
    _handlers: {},
    on(event, handler) {
        if (!this._handlers[event]) this._handlers[event] = [];
        this._handlers[event].push(handler);
    },
    emit(event, data) {
        (this._handlers[event] || []).forEach(h => h(data));
    },
};

/* ── 工具函数 ──────────────────────────────── */
function setStatus(msg) {
    document.getElementById('statusText').textContent = msg;
}

function setButtonsEnabled(enabled) {
    document.getElementById('btnExtract').disabled = !enabled;
    document.getElementById('btnAi').disabled = !enabled;
    document.getElementById('btnSave').disabled = true;
}

function showProgress(title, message, progress) {
    const modal = document.getElementById('progressModal');
    document.getElementById('progressTitle').textContent = title;
    document.getElementById('progressMessage').textContent = message || '';
    document.getElementById('progressBar').style.width = (progress || 0) + '%';
    modal.style.display = 'flex';
}

function updateProgress(message, progress) {
    document.getElementById('progressMessage').textContent = message || '';
    document.getElementById('progressBar').style.width = (progress || 0) + '%';
}

function hideProgress() {
    document.getElementById('progressModal').style.display = 'none';
}

/* ── 初始化 ────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
    initFileUpload();
    initToolbarButtons();
    initResizers();
});

/* ── 文件上传 ──────────────────────────────── */
function initFileUpload() {
    const fileInput = document.getElementById('fileInput');
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setStatus('正在上传…');
        try {
            const result = await API.uploadPdf(file);
            AppState.sessionId = result.session_id;
            AppState.pageCount = result.page_count;
            AppState.filename = result.filename;
            AppState.tocPageIndices.clear();
            AppState.entries = [];
            AppState.offset = 0;

            document.getElementById('offsetInput').value = 0;

            setButtonsEnabled(true);
            setStatus(`已加载：${result.filename}，共 ${result.page_count} 页`);

            EventBus.emit('pdf-loaded', result);
        } catch (err) {
            alert('上传失败：' + err.message);
            setStatus('上传失败');
        }
        fileInput.value = '';
    });
}

/* ── 工具栏按钮 ────────────────────────────── */
function initToolbarButtons() {
    // 提取目录
    document.getElementById('btnExtract').addEventListener('click', async () => {
        if (AppState.tocPageIndices.size === 0) {
            alert('请先双击左侧列表选择目录页（可选多页）');
            return;
        }
        setStatus('正在提取文本…');
        try {
            const result = await API.extractText(
                AppState.sessionId,
                Array.from(AppState.tocPageIndices)
            );
            if (result.entries.length === 0) {
                alert('未能从所选目录页提取到条目。\n可能是扫描图片，请使用 AI 识别。');
                setStatus('提取失败');
                return;
            }
            AppState.entries = result.entries;
            document.getElementById('rawText').value = result.raw_text;
            document.getElementById('btnSave').disabled = false;
            EventBus.emit('entries-updated', result.entries);
            setStatus(`文本提取完成，共 ${result.entries.length} 条`);
        } catch (err) {
            alert('提取失败：' + err.message);
            setStatus('提取失败');
        }
    });

    // AI 识别
    document.getElementById('btnAi').addEventListener('click', async () => {
        if (AppState.tocPageIndices.size === 0) {
            alert('请先双击左侧列表选择目录页');
            return;
        }
        showProgress('AI 识别中…', '准备中…', 0);
        setStatus('AI 识别中…');

        try {
            await API.startAiRecognize(
                AppState.sessionId,
                Array.from(AppState.tocPageIndices),
                {
                    onProgress(progress, message) {
                        updateProgress(message, progress);
                        setStatus(message);
                    },
                    onComplete(entries, rawText, message) {
                        hideProgress();
                        document.getElementById('rawText').value =
                            '── AI 原始返回 ──\n' + rawText;
                        if (entries.length === 0) {
                            alert('AI 返回内容未能解析为目录条目。\n原始返回已显示在右下方。');
                            setStatus('AI 返回解析失败');
                            return;
                        }
                        AppState.entries = entries;
                        document.getElementById('btnSave').disabled = false;
                        EventBus.emit('entries-updated', entries);
                        setStatus(message || `AI 完成，共 ${entries.length} 条`);
                    },
                    onError(err) {
                        hideProgress();
                        alert('AI 识别失败：' + err);
                        setStatus('AI 识别失败');
                    },
                }
            );
        } catch (err) {
            hideProgress();
            alert('AI 识别失败：' + err.message);
            setStatus('AI 识别失败');
        }
    });

    // 保存书签
    document.getElementById('btnSave').addEventListener('click', async () => {
        if (AppState.entries.length === 0) {
            alert('目录条目为空，请先提取或手动添加。');
            return;
        }
        const offset = parseInt(document.getElementById('offsetInput').value) || 0;
        setStatus('正在保存…');
        try {
            const filename = await API.saveBookmarks(
                AppState.sessionId, AppState.entries, offset);
            setStatus(`已保存：${filename}`);
            alert(`已成功嵌入 ${AppState.entries.length} 条书签！\n文件已下载。`);
        } catch (err) {
            alert('保存失败：' + err.message);
            setStatus('保存失败');
        }
    });

    // AI 配置
    document.getElementById('btnAiConfig').addEventListener('click', () => {
        EventBus.emit('open-ai-config');
    });

    // 清除目录页选择
    document.getElementById('btnClearToc').addEventListener('click', () => {
        AppState.tocPageIndices.clear();
        EventBus.emit('toc-pages-changed');
        setStatus('已清除目录页选择');
    });
}

/* ── 拖拽分割条 ────────────────────────────── */
function initResizers() {
    initResizer('resizerLeft', 'leftPanel', 'left');
    initResizer('resizerRight', 'rightPanel', 'right');
}

function initResizer(resizerId, panelId, side) {
    const resizer = document.getElementById(resizerId);
    const panel = document.getElementById(panelId);
    let startX, startWidth;

    resizer.addEventListener('mousedown', (e) => {
        startX = e.clientX;
        startWidth = panel.offsetWidth;
        resizer.classList.add('active');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        const onMove = (e) => {
            const diff = e.clientX - startX;
            const newWidth = side === 'left'
                ? startWidth + diff
                : startWidth - diff;
            panel.style.width = Math.max(160, newWidth) + 'px';
        };

        const onUp = () => {
            resizer.classList.remove('active');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    });
}
