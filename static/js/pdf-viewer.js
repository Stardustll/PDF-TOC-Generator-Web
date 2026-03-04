/* ================================================================
   pdf-viewer.js — pdf.js 集成，连续滚动渲染 + IntersectionObserver 虚拟渲染
   ================================================================ */

(function () {
    let pdfDoc = null;
    let currentScale = 1.0;
    const renderedPages = new Map(); // pageNum -> canvas wrapper
    let observer = null;
    const container = () => document.getElementById('pdfViewer');
    const viewerContainer = () => document.getElementById('pdfViewerContainer');

    /* ── 加载 PDF ──────────────────────────────── */
    EventBus.on('pdf-loaded', async (data) => {
        const url = API.getPdfUrl(data.session_id);
        const viewer = container();
        viewer.innerHTML = '';
        renderedPages.clear();
        currentScale = parseInt(document.getElementById('zoomSlider').value) / 100;

        try {
            // 动态导入 pdf.js (ES module)
            const pdfjsLib = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs');
            pdfjsLib.GlobalWorkerOptions.workerSrc =
                'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';

            pdfDoc = await pdfjsLib.getDocument(url).promise;
            setupPlaceholders();
            setupObserver();
        } catch (err) {
            console.error('pdf.js 加载失败:', err);
            viewer.innerHTML = '<div class="empty-state">PDF 加载失败</div>';
        }
    });

    /* ── 创建页面占位符 ────────────────────────── */
    function setupPlaceholders() {
        const viewer = container();
        viewer.innerHTML = '';

        for (let i = 1; i <= pdfDoc.numPages; i++) {
            const wrapper = document.createElement('div');
            wrapper.className = 'pdf-page-wrapper';
            wrapper.dataset.pageNum = i;

            // 先用默认尺寸占位，后续渲染时校正
            wrapper.style.width = '600px';
            wrapper.style.height = '800px';

            viewer.appendChild(wrapper);
        }

        // 获取第一页尺寸来设定默认
        pdfDoc.getPage(1).then(page => {
            const viewport = page.getViewport({ scale: currentScale });
            const wrappers = viewer.querySelectorAll('.pdf-page-wrapper');
            wrappers.forEach(w => {
                w.style.width = viewport.width + 'px';
                w.style.height = viewport.height + 'px';
            });
        });
    }

    /* ── IntersectionObserver 虚拟渲染 ─────────── */
    function setupObserver() {
        if (observer) observer.disconnect();

        const vc = viewerContainer();
        observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const pageNum = parseInt(entry.target.dataset.pageNum);
                if (entry.isIntersecting) {
                    renderPage(pageNum, entry.target);
                } else {
                    // 释放远离视口的页面
                    unrenderPage(pageNum, entry.target);
                }
            });
        }, {
            root: vc,
            rootMargin: '600px 0px',
            threshold: 0,
        });

        const wrappers = container().querySelectorAll('.pdf-page-wrapper');
        wrappers.forEach(w => observer.observe(w));
    }

    /* ── 渲染单页 ──────────────────────────────── */
    async function renderPage(pageNum, wrapper) {
        if (renderedPages.has(pageNum)) return;
        renderedPages.set(pageNum, true); // 标记渲染中

        try {
            const page = await pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale: currentScale });

            wrapper.style.width = viewport.width + 'px';
            wrapper.style.height = viewport.height + 'px';

            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            const ctx = canvas.getContext('2d');
            await page.render({ canvasContext: ctx, viewport }).promise;

            // 可能在渲染过程中被 unrender 了
            if (!renderedPages.has(pageNum)) {
                return;
            }

            wrapper.innerHTML = '';
            wrapper.appendChild(canvas);
            renderedPages.set(pageNum, canvas);
        } catch (err) {
            console.error(`渲染第 ${pageNum} 页失败:`, err);
            renderedPages.delete(pageNum);
        }
    }

    /* ── 释放页面 ──────────────────────────────── */
    function unrenderPage(pageNum, wrapper) {
        if (!renderedPages.has(pageNum)) return;
        renderedPages.delete(pageNum);
        // 保留占位尺寸，移除 canvas
        const canvas = wrapper.querySelector('canvas');
        if (canvas) {
            wrapper.removeChild(canvas);
        }
    }

    /* ── 滚动到指定页 ─────────────────────────── */
    window.scrollToPage = function (pageIndex) {
        const wrappers = container().querySelectorAll('.pdf-page-wrapper');
        if (pageIndex >= 0 && pageIndex < wrappers.length) {
            wrappers[pageIndex].scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    /* ── 缩放控制 ──────────────────────────────── */
    let zoomTimeout = null;
    document.addEventListener('DOMContentLoaded', () => {
        const slider = document.getElementById('zoomSlider');
        const label = document.getElementById('zoomLabel');

        slider.addEventListener('input', () => {
            label.textContent = slider.value + '%';
            clearTimeout(zoomTimeout);
            zoomTimeout = setTimeout(() => {
                currentScale = parseInt(slider.value) / 100;
                if (pdfDoc) {
                    // 记住当前滚动位置对应的页面
                    const topPage = findTopVisiblePage();
                    renderedPages.clear();
                    setupPlaceholders();
                    setupObserver();
                    // 恢复到之前的页面
                    if (topPage > 0) {
                        setTimeout(() => scrollToPage(topPage - 1), 50);
                    }
                }
            }, 300);
        });
    });

    /* ── 找到当前视口顶部对应的页面 ──────────── */
    function findTopVisiblePage() {
        const vc = viewerContainer();
        const scrollTop = vc.scrollTop;
        const wrappers = container().querySelectorAll('.pdf-page-wrapper');
        for (let i = 0; i < wrappers.length; i++) {
            const rect = wrappers[i].offsetTop;
            if (rect + wrappers[i].offsetHeight > scrollTop) {
                return i + 1;
            }
        }
        return 1;
    }

    /* ── 滚动同步：检测当前可见页并通知页面列表 ── */
    let scrollSyncTimeout = null;
    let isScrollingByCode = false; // 防止代码触发的滚动引起循环

    function setupScrollSync() {
        const vc = viewerContainer();
        vc.addEventListener('scroll', () => {
            if (isScrollingByCode) return;
            clearTimeout(scrollSyncTimeout);
            scrollSyncTimeout = setTimeout(() => {
                const topPage = findTopVisiblePage();
                if (topPage > 0) {
                    const pageIndex = topPage - 1;
                    if (AppState.currentPreviewPage !== pageIndex) {
                        EventBus.emit('visible-page-changed', pageIndex);
                    }
                }
            }, 100);
        });
    }

    document.addEventListener('DOMContentLoaded', setupScrollSync);

    /* ── 监听跳转事件 ─────────────────────────── */
    EventBus.on('preview-page-changed', (pageIndex) => {
        isScrollingByCode = true;
        scrollToPage(pageIndex);
        // smooth scroll 完成后重新允许滚动同步
        setTimeout(() => { isScrollingByCode = false; }, 600);
    });

})();
