/* ================================================================
   toc-editor.js — 右栏目录编辑组件
   ================================================================ */

(function () {
    let selectedRowIdx = -1;

    /* ── 监听条目更新 ──────────────────────────── */
    EventBus.on('entries-updated', (entries) => {
        selectedRowIdx = -1;
        refreshTable(entries);
    });

    /* ── 渲染表格 ──────────────────────────────── */
    function refreshTable(entries) {
        const tbody = document.getElementById('tocBody');
        tbody.innerHTML = '';

        entries = entries || AppState.entries;

        entries.forEach((entry, i) => {
            const tr = document.createElement('tr');
            tr.dataset.index = i;
            if (i === selectedRowIdx) tr.classList.add('selected');

            const levelIcons = { 1: '▶', 2: '▷', 3: '·' };
            const icon = levelIcons[entry.level] || '';

            tr.innerHTML = `
                <td>${entry.level}</td>
                <td class="level-indent-${entry.level}">
                    <span class="level-icon">${icon}</span>${entry.title}
                </td>
                <td>${entry.page}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    /* ── 表格交互 ──────────────────────────────── */
    document.addEventListener('DOMContentLoaded', () => {
        const tbody = document.getElementById('tocBody');

        // 单击选中行
        tbody.addEventListener('click', (e) => {
            const tr = e.target.closest('tr');
            if (!tr) return;
            selectedRowIdx = parseInt(tr.dataset.index);

            // 高亮行
            tbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
            tr.classList.add('selected');

            // 填充编辑区
            const entry = AppState.entries[selectedRowIdx];
            if (entry) {
                document.getElementById('editLevel').value = entry.level;
                document.getElementById('editTitle').value = entry.title;
                document.getElementById('editPage').value = entry.page;
            }
        });

        // 双击跳转预览
        tbody.addEventListener('dblclick', (e) => {
            const tr = e.target.closest('tr');
            if (!tr) return;
            const idx = parseInt(tr.dataset.index);
            const entry = AppState.entries[idx];
            if (!entry) return;

            const offset = parseInt(document.getElementById('offsetInput').value) || 0;
            const targetPage = entry.page + offset - 1; // 0-based
            if (targetPage >= 0 && targetPage < AppState.pageCount) {
                EventBus.emit('preview-page-changed', targetPage);
                // 也选中左栏对应页面
                const items = document.querySelectorAll('#pageList .page-item');
                items.forEach(item => item.classList.remove('selected'));
                if (items[targetPage]) items[targetPage].classList.add('selected');
            } else {
                alert(`页码 ${entry.page}（偏移后=${entry.page + offset}）超出范围`);
            }
        });

        // 应用修改
        document.getElementById('btnApply').addEventListener('click', () => {
            if (selectedRowIdx < 0 || selectedRowIdx >= AppState.entries.length) {
                alert('请先在表格中选择一行');
                return;
            }
            AppState.entries[selectedRowIdx].level = parseInt(document.getElementById('editLevel').value);
            AppState.entries[selectedRowIdx].title = document.getElementById('editTitle').value.trim();
            AppState.entries[selectedRowIdx].page = parseInt(document.getElementById('editPage').value);
            refreshTable();
        });

        // 插入新行
        document.getElementById('btnInsert').addEventListener('click', () => {
            const title = document.getElementById('editTitle').value.trim();
            if (!title) {
                document.getElementById('editTitle').focus();
                return;
            }
            const newEntry = {
                level: parseInt(document.getElementById('editLevel').value),
                title: title,
                page: parseInt(document.getElementById('editPage').value),
            };
            const insertAt = selectedRowIdx >= 0 ? selectedRowIdx + 1 : AppState.entries.length;
            AppState.entries.splice(insertAt, 0, newEntry);
            selectedRowIdx = insertAt;
            refreshTable();
            document.getElementById('btnSave').disabled = false;
        });

        // 删除
        document.getElementById('btnDelete').addEventListener('click', () => {
            if (selectedRowIdx < 0 || selectedRowIdx >= AppState.entries.length) return;
            AppState.entries.splice(selectedRowIdx, 1);
            if (selectedRowIdx >= AppState.entries.length) selectedRowIdx = AppState.entries.length - 1;
            refreshTable();
        });

        // 上移
        document.getElementById('btnMoveUp').addEventListener('click', () => {
            if (selectedRowIdx <= 0) return;
            const tmp = AppState.entries[selectedRowIdx];
            AppState.entries[selectedRowIdx] = AppState.entries[selectedRowIdx - 1];
            AppState.entries[selectedRowIdx - 1] = tmp;
            selectedRowIdx--;
            refreshTable();
        });

        // 下移
        document.getElementById('btnMoveDown').addEventListener('click', () => {
            if (selectedRowIdx < 0 || selectedRowIdx >= AppState.entries.length - 1) return;
            const tmp = AppState.entries[selectedRowIdx];
            AppState.entries[selectedRowIdx] = AppState.entries[selectedRowIdx + 1];
            AppState.entries[selectedRowIdx + 1] = tmp;
            selectedRowIdx++;
            refreshTable();
        });
    });

})();
