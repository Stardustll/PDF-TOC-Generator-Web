/* ================================================================
   page-list.js — 左栏页面列表组件
   ================================================================ */

(function () {
    let lastToggleIdx = -1;

    /* ── PDF 加载后渲染页面列表 ──────────────── */
    EventBus.on('pdf-loaded', (data) => {
        const listEl = document.getElementById('pageList');
        listEl.innerHTML = '';
        lastToggleIdx = -1;

        for (let i = 0; i < data.page_count; i++) {
            const item = document.createElement('div');
            item.className = 'page-item';
            item.dataset.index = i;
            item.innerHTML = `
                <span class="page-badge">${i + 1}</span>
                <span class="page-label">第 ${i + 1} 页</span>
            `;
            listEl.appendChild(item);
        }

        // 选中第一页
        if (data.page_count > 0) {
            selectPageItem(0);
            EventBus.emit('preview-page-changed', 0);
        }
    });

    /* ── 事件委托 ──────────────────────────────── */
    document.addEventListener('DOMContentLoaded', () => {
        const listEl = document.getElementById('pageList');

        listEl.addEventListener('click', (e) => {
            const item = e.target.closest('.page-item');
            if (!item) return;
            const idx = parseInt(item.dataset.index);

            if (e.ctrlKey || e.metaKey) {
                // Ctrl+点击：切换目录页
                toggleTocPage(idx);
            } else if (e.shiftKey && lastToggleIdx >= 0) {
                // Shift+点击：范围选择
                const start = Math.min(lastToggleIdx, idx);
                const end = Math.max(lastToggleIdx, idx);
                for (let i = start; i <= end; i++) {
                    AppState.tocPageIndices.add(i);
                }
                refreshTocMarks();
                updateTocStatus();
            } else {
                // 普通点击：预览
                selectPageItem(idx);
                EventBus.emit('preview-page-changed', idx);
            }
        });

        listEl.addEventListener('dblclick', (e) => {
            const item = e.target.closest('.page-item');
            if (!item) return;
            const idx = parseInt(item.dataset.index);
            toggleTocPage(idx);
        });
    });

    /* ── 目录页标记切换 ────────────────────────── */
    function toggleTocPage(idx) {
        if (AppState.tocPageIndices.has(idx)) {
            AppState.tocPageIndices.delete(idx);
        } else {
            AppState.tocPageIndices.add(idx);
        }
        lastToggleIdx = idx;
        refreshTocMarks();
        updateTocStatus();
        EventBus.emit('toc-pages-changed');
    }

    /* ── 刷新目录页标记 ────────────────────────── */
    function refreshTocMarks() {
        const items = document.querySelectorAll('#pageList .page-item');
        items.forEach(item => {
            const idx = parseInt(item.dataset.index);
            const isToc = AppState.tocPageIndices.has(idx);
            item.classList.toggle('toc-page', isToc);
            const label = item.querySelector('.page-label');
            label.textContent = `第 ${idx + 1} 页${isToc ? ' ✔' : ''}`;
        });
    }

    /* ── 选中页面 ──────────────────────────────── */
    function selectPageItem(idx) {
        const items = document.querySelectorAll('#pageList .page-item');
        items.forEach(item => item.classList.remove('selected'));
        if (items[idx]) items[idx].classList.add('selected');
        AppState.currentPreviewPage = idx;
    }

    /* ── 更新状态栏 ────────────────────────────── */
    function updateTocStatus() {
        const count = AppState.tocPageIndices.size;
        if (count === 0) {
            setStatus('双击或 Ctrl+点击选择目录页');
        } else {
            const pages = Array.from(AppState.tocPageIndices)
                .sort((a, b) => a - b)
                .map(i => i + 1);
            setStatus(`已选 ${count} 页为目录页：[${pages.join(', ')}]`);
        }
    }

    /* ── 监听外部清除事件 ──────────────────────── */
    EventBus.on('toc-pages-changed', () => {
        refreshTocMarks();
    });

    /* ── 滚动同步：预览滚动时更新选中页 ────────── */
    EventBus.on('visible-page-changed', (pageIndex) => {
        selectPageItem(pageIndex);
        // 将选中项滚动到页面列表可见区域
        const items = document.querySelectorAll('#pageList .page-item');
        if (items[pageIndex]) {
            items[pageIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    });

})();
