/* ============================================================
   Your Command Please — content script
   Handles: area screenshot (download/clipboard), full-page
   screenshot stitching, and link extraction.
   ============================================================ */

function ycpToast(msg) {
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);' +
        'background:rgba(30,30,34,.92);color:#fff;padding:10px 18px;border-radius:12px;' +
        'font:14px -apple-system,sans-serif;z-index:2147483647;box-shadow:0 8px 24px rgba(0,0,0,.4)';
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 1800);
}

function dataUrlToBlob(dataUrl) {
    const [head, b64] = dataUrl.split(',');
    const mime = head.match(/:(.*?);/)[1];
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
}

async function outputCanvas(canvas, output, name) {
    canvas.toBlob(async (blob) => {
        if (output === 'clipboard') {
            try {
                await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                ycpToast('Screenshot copied to clipboard');
            } catch (e) {
                ycpToast('Clipboard blocked — downloading instead');
                downloadBlob(blob, name);
            }
        } else {
            downloadBlob(blob, name);
        }
    }, 'image/png');
}

function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* -------- Area selection -------- */
function startAreaSelection(output) {
    let startX, startY, endX, endY, selecting = false;
    const overlay = document.createElement('div');
    const box = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.4);cursor:crosshair;z-index:2147483646';
    box.style.cssText = 'position:fixed;border:2px dashed #0a84ff;background:rgba(10,132,255,.12);z-index:2147483647';
    document.body.appendChild(overlay);
    document.body.appendChild(box);

    function cleanup() { overlay.remove(); box.remove(); }
    overlay.addEventListener('mousedown', (e) => {
        selecting = true; startX = e.clientX; startY = e.clientY;
        box.style.left = startX + 'px'; box.style.top = startY + 'px';
        box.style.width = box.style.height = '0px';
    });
    overlay.addEventListener('mousemove', (e) => {
        if (!selecting) return;
        endX = e.clientX; endY = e.clientY;
        box.style.left = Math.min(startX, endX) + 'px';
        box.style.top = Math.min(startY, endY) + 'px';
        box.style.width = Math.abs(endX - startX) + 'px';
        box.style.height = Math.abs(endY - startY) + 'px';
    });
    overlay.addEventListener('mouseup', (e) => {
        if (!selecting) return;
        selecting = false;
        endX = e.clientX; endY = e.clientY;
        const dpr = window.devicePixelRatio || 1;
        const area = {
            x: Math.min(startX, endX) * dpr, y: Math.min(startY, endY) * dpr,
            width: Math.abs(endX - startX) * dpr, height: Math.abs(endY - startY) * dpr
        };
        cleanup();
        if (area.width < 4 || area.height < 4) return;
        chrome.runtime.sendMessage({ action: 'captureArea', area, output });
    });
    document.addEventListener('keydown', function esc(e) {
        if (e.key === 'Escape') { cleanup(); document.removeEventListener('keydown', esc); }
    });
}

/* -------- Full page capture -------- */
async function fullPageShot() {
    const dpr = window.devicePixelRatio || 1;
    const de = document.documentElement;
    const totalH = Math.max(de.scrollHeight, document.body.scrollHeight);
    const totalW = Math.max(de.scrollWidth, document.body.scrollWidth);
    const viewH = window.innerHeight;
    const originalScroll = window.scrollY;
    const originalOverflow = de.style.overflow;
    de.style.overflow = 'hidden';

    const canvas = document.createElement('canvas');
    canvas.width = totalW * dpr;
    canvas.height = totalH * dpr;
    const ctx = canvas.getContext('2d');

    ycpToast('Capturing full page…');
    try {
        for (let y = 0; y < totalH; y += viewH) {
            window.scrollTo(0, y);
            await new Promise(r => setTimeout(r, 550)); // settle + respect capture rate limit (~2/s)
            const resp = await chrome.runtime.sendMessage({ action: 'captureVisible' });
            if (!resp || !resp.dataUrl) continue;
            const img = await loadImage(resp.dataUrl);
            const drawY = Math.min(y, totalH - viewH); // last frame overlaps to avoid overflow
            ctx.drawImage(img, 0, drawY * dpr);
        }
        await outputCanvas(canvas, 'download', 'full-page.png');
    } finally {
        de.style.overflow = originalOverflow;
        window.scrollTo(0, originalScroll);
    }
}

function loadImage(src) {
    return new Promise((resolve) => { const i = new Image(); i.onload = () => resolve(i); i.src = src; });
}

/* -------- Message handling -------- */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'startScreenshot') {
        startAreaSelection(request.output || 'download');
    } else if (request.action === 'fullPageShot') {
        fullPageShot();
    } else if (request.action === 'processScreenshot') {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.onload = () => {
            canvas.width = request.area.width;
            canvas.height = request.area.height;
            ctx.drawImage(img,
                request.area.x, request.area.y, request.area.width, request.area.height,
                0, 0, request.area.width, request.area.height);
            outputCanvas(canvas, request.output, 'screenshot.png');
        };
        img.src = request.dataUrl;
    } else if (request.action === 'extractLinks') {
        const links = [...document.querySelectorAll('a[href]')].map(a => a.href);
        navigator.clipboard.writeText([...new Set(links)].join('\n'))
            .then(() => ycpToast(`Copied ${new Set(links).size} links`))
            .catch(() => {});
    }
});
