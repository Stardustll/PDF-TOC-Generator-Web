/* ================================================================
   api.js — 后端 API 调用封装层
   ================================================================ */

const API = {
    /** 上传 PDF 文件 */
    async uploadPdf(file) {
        const form = new FormData();
        form.append('file', file);
        const resp = await fetch('/api/pdf/upload', { method: 'POST', body: form });
        if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            throw new Error(err.error || `上传失败 (${resp.status})`);
        }
        return resp.json();
    },

    /** 获取 PDF 文件 URL（供 pdf.js 使用）*/
    getPdfUrl(sessionId) {
        return `/api/pdf/${sessionId}/file`;
    },

    /** 文本提取 */
    async extractText(sessionId, pageIndices) {
        const resp = await fetch('/api/toc/extract-text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId, page_indices: pageIndices }),
        });
        if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            throw new Error(err.error || `提取失败 (${resp.status})`);
        }
        return resp.json();
    },

    /** 启动 AI 识别任务 */
    async startAiRecognize(sessionId, pageIndices, callbacks) {
        const resp = await fetch('/api/ai/recognize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId, page_indices: pageIndices }),
        });
        const data = await resp.json();
        if (data.error) throw new Error(data.error);

        const es = new EventSource(`/api/ai/status/${data.task_id}`);
        es.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            if (msg.heartbeat) return;
            if (msg.done) {
                es.close();
                if (msg.error) callbacks.onError(msg.error);
                else callbacks.onComplete(msg.entries, msg.raw_text, msg.message);
            } else {
                callbacks.onProgress(msg.progress, msg.message);
            }
        };
        es.onerror = () => { es.close(); callbacks.onError('连接中断'); };
        return es;
    },

    /** 获取 AI 配置 */
    async getAiConfig() {
        const resp = await fetch('/api/ai/config');
        return resp.json();
    },

    /** 保存 AI 配置 */
    async saveAiConfig(cfg) {
        const resp = await fetch('/api/ai/config', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cfg),
        });
        return resp.json();
    },

    /** 测试连通性 */
    async testConnection(apiUrl, apiKey) {
        const resp = await fetch('/api/ai/test-connection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ api_url: apiUrl, api_key: apiKey }),
        });
        return resp.json();
    },

    /** 保存书签并下载 */
    async saveBookmarks(sessionId, entries, offset) {
        const resp = await fetch('/api/pdf/save-bookmarks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId, entries, offset }),
        });
        if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            throw new Error(err.error || `保存失败 (${resp.status})`);
        }
        // 触发下载 — 直接用本地文件名拼接，避免 Content-Disposition 编码问题
        const blob = await resp.blob();
        const baseName = (AppState.filename || 'output')
            .replace(/\.pdf$/i, '');
        const filename = baseName + '_带目录.pdf';

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return filename;
    },
};
