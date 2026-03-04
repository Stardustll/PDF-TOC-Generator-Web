/* ================================================================
   ai-config.js — AI 配置弹窗
   ================================================================ */

(function () {
    const modal = () => document.getElementById('aiConfigModal');

    /* ── 打开配置弹窗 ─────────────────────────── */
    EventBus.on('open-ai-config', async () => {
        const m = modal();
        m.style.display = 'flex';

        // 加载当前配置
        try {
            const cfg = await API.getAiConfig();
            document.getElementById('cfgApiUrl').value = cfg.api_url || '';
            document.getElementById('cfgApiKey').value = cfg.api_key || '';
            document.getElementById('cfgMaxTokens').value = cfg.max_tokens || 4096;

            // 模型
            const modelSelect = document.getElementById('cfgModel');
            if (cfg.model) {
                // 确保当前模型在选项中
                let found = false;
                for (let opt of modelSelect.options) {
                    if (opt.value === cfg.model) { found = true; break; }
                }
                if (!found) {
                    const opt = document.createElement('option');
                    opt.value = cfg.model;
                    opt.textContent = cfg.model;
                    modelSelect.insertBefore(opt, modelSelect.firstChild);
                }
                modelSelect.value = cfg.model;
            }
        } catch (err) {
            console.error('加载配置失败:', err);
        }

        document.getElementById('cfgTestStatus').textContent = '';
    });

    /* ── 初始化事件 ────────────────────────────── */
    document.addEventListener('DOMContentLoaded', () => {
        // 关闭
        document.getElementById('aiConfigClose').addEventListener('click', closeModal);
        document.getElementById('cfgCancelBtn').addEventListener('click', closeModal);
        modal().querySelector('.modal-overlay').addEventListener('click', closeModal);

        // 显示/隐藏 API Key
        document.getElementById('cfgShowKey').addEventListener('change', (e) => {
            document.getElementById('cfgApiKey').type =
                e.target.checked ? 'text' : 'password';
        });

        // 检测连通性
        document.getElementById('cfgTestBtn').addEventListener('click', testConnection);
        document.getElementById('cfgRefreshModels').addEventListener('click', testConnection);

        // 保存
        document.getElementById('cfgSaveBtn').addEventListener('click', saveConfig);
    });

    /* ── 关闭弹窗 ──────────────────────────────── */
    function closeModal() {
        modal().style.display = 'none';
    }

    /* ── 测试连通性 ────────────────────────────── */
    async function testConnection() {
        const statusEl = document.getElementById('cfgTestStatus');
        const testBtn = document.getElementById('cfgTestBtn');
        const refreshBtn = document.getElementById('cfgRefreshModels');

        const apiUrl = document.getElementById('cfgApiUrl').value.trim();
        const apiKey = document.getElementById('cfgApiKey').value.trim();

        if (!apiUrl) {
            statusEl.textContent = '请填写 API URL';
            statusEl.style.color = '#dc2626';
            return;
        }

        testBtn.disabled = true;
        refreshBtn.disabled = true;
        statusEl.textContent = '正在获取模型列表…';
        statusEl.style.color = '#64748b';

        try {
            const result = await API.testConnection(apiUrl, apiKey);
            if (result.ok && result.models) {
                const modelSelect = document.getElementById('cfgModel');
                const currentVal = modelSelect.value;
                modelSelect.innerHTML = '';
                result.models.forEach(m => {
                    const opt = document.createElement('option');
                    opt.value = m;
                    opt.textContent = m;
                    modelSelect.appendChild(opt);
                });
                // 恢复之前选择的模型
                if (result.models.includes(currentVal)) {
                    modelSelect.value = currentVal;
                }
                statusEl.textContent = `✅ 获取到 ${result.models.length} 个模型`;
                statusEl.style.color = '#16a34a';
            } else {
                statusEl.textContent = `❌ ${result.error || '连接失败'}`;
                statusEl.style.color = '#dc2626';
            }
        } catch (err) {
            statusEl.textContent = `❌ ${err.message}`;
            statusEl.style.color = '#dc2626';
        } finally {
            testBtn.disabled = false;
            refreshBtn.disabled = false;
        }
    }

    /* ── 保存配置 ──────────────────────────────── */
    async function saveConfig() {
        const apiUrl = document.getElementById('cfgApiUrl').value.trim();
        const model = document.getElementById('cfgModel').value.trim();

        if (!apiUrl) {
            alert('API URL 不能为空');
            return;
        }
        if (!model) {
            alert('模型名称不能为空');
            return;
        }

        try {
            await API.saveAiConfig({
                api_url: apiUrl.replace(/\/+$/, ''),
                api_key: document.getElementById('cfgApiKey').value.trim(),
                model: model,
                max_tokens: parseInt(document.getElementById('cfgMaxTokens').value) || 4096,
            });
            setStatus(`AI 配置已保存：${model}`);
            closeModal();
        } catch (err) {
            alert('保存失败：' + err.message);
        }
    }

})();
