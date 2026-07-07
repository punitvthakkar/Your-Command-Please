/* ============================================================
   Your Command Please — background service worker
   ============================================================ */

function activeTab() {
    return new Promise((resolve) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => resolve(tabs[0]));
    });
}

/* -------- Injected page functions -------- */
function pageToggleReader() {
    const ID = '__ycp_reader_overlay__';
    const ex = document.getElementById(ID);
    if (ex) { ex.remove(); document.documentElement.style.overflow = ''; return; }
    const src = document.querySelector('article, [role="main"], main') || document.body;
    const overlay = document.createElement('div');
    overlay.id = ID;
    overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;overflow:auto;background:#f7f5ef;';
    const article = document.createElement('div');
    article.style.cssText = 'max-width:720px;margin:0 auto;padding:72px 24px;color:#1a1a1a;font:19px/1.75 Georgia,-apple-system,serif;';
    article.innerHTML = src.innerHTML;
    const btn = document.createElement('button');
    btn.textContent = '✕ Close reader';
    btn.style.cssText = 'position:fixed;top:16px;right:16px;padding:8px 14px;border:none;border-radius:10px;background:#1a1a1a;color:#fff;cursor:pointer;font:14px -apple-system,sans-serif;';
    btn.onclick = () => { overlay.remove(); document.documentElement.style.overflow = ''; };
    overlay.appendChild(btn);
    overlay.appendChild(article);
    document.body.appendChild(overlay);
    document.documentElement.style.overflow = 'hidden';
}

function pageToggleDark() {
    const ID = '__ycp_dark_mode__';
    const ex = document.getElementById(ID);
    if (ex) { ex.remove(); return; }
    const s = document.createElement('style');
    s.id = ID;
    s.textContent = 'html{filter:invert(1) hue-rotate(180deg)!important;background:#fff!important}' +
        'img,video,picture,canvas,iframe,svg,[style*="background-image"]{filter:invert(1) hue-rotate(180deg)!important}';
    document.documentElement.appendChild(s);
}

function pageInsertSnippet(text) {
    const a = document.activeElement;
    if (a && (a.tagName === 'TEXTAREA' || a.tagName === 'INPUT')) {
        const s = a.selectionStart ?? a.value.length;
        const e = a.selectionEnd ?? a.value.length;
        a.value = a.value.slice(0, s) + text + a.value.slice(e);
        a.selectionStart = a.selectionEnd = s + text.length;
        a.dispatchEvent(new Event('input', { bubbles: true }));
    } else if (a && a.isContentEditable) {
        document.execCommand('insertText', false, text);
    } else {
        navigator.clipboard.writeText(text);
    }
}

/* -------- Action dispatch -------- */
async function handleAction(action, req) {
    const tab = await activeTab();
    switch (action) {
        case 'NEW_TAB': chrome.tabs.create({}); break;
        case 'NEW_WINDOW': chrome.windows.create({}); break;
        case 'PIN_TAB': if (tab) chrome.tabs.update(tab.id, { pinned: true }); break;
        case 'UNPIN_TAB': if (tab) chrome.tabs.update(tab.id, { pinned: false }); break;
        case 'MUTE_TAB': if (tab) chrome.tabs.update(tab.id, { muted: true }); break;
        case 'UNMUTE_TAB': if (tab) chrome.tabs.update(tab.id, { muted: false }); break;
        case 'DUPLICATE_TAB': if (tab) chrome.tabs.duplicate(tab.id); break;

        case 'SAVE_ALL_TABS':
            chrome.tabs.query({ currentWindow: true }, (tabs) => {
                const title = 'Saved Tabs — ' + new Date().toLocaleString();
                chrome.bookmarks.create({ title }, (folder) => {
                    tabs.forEach(t => t.url && chrome.bookmarks.create({ parentId: folder.id, title: t.title, url: t.url }));
                });
            });
            break;

        case 'CLEAR_CACHE':
            chrome.browsingData.remove({ since: 0 }, { cache: true }, () => tab && chrome.tabs.reload(tab.id));
            break;

        case 'CLEAR_COOKIES':
            if (!tab) break;
            chrome.cookies.getAll({ url: tab.url }, (cookies) => {
                cookies.forEach(c => chrome.cookies.remove({ url: tab.url, name: c.name }));
                chrome.tabs.reload(tab.id);
            });
            break;

        case 'BOOKMARK':
            if (tab) chrome.bookmarks.create({ title: tab.title, url: tab.url });
            break;

        case 'READER_MODE':
            if (tab) chrome.scripting.executeScript({ target: { tabId: tab.id }, func: pageToggleReader });
            break;
        case 'DARK_MODE':
            if (tab) chrome.scripting.executeScript({ target: { tabId: tab.id }, func: pageToggleDark });
            break;

        case 'INSERT_SNIPPET':
            if (tab) chrome.scripting.executeScript({ target: { tabId: tab.id }, func: pageInsertSnippet, args: [req.text || ''] });
            break;

        case 'LINK_EXTRACT':
            if (tab) chrome.tabs.sendMessage(tab.id, { action: 'extractLinks' });
            break;

        case 'SCREENSHOT':
            if (tab) chrome.tabs.sendMessage(tab.id, { action: 'startScreenshot', output: 'download' });
            break;
        case 'COPY_SCREENSHOT':
            if (tab) chrome.tabs.sendMessage(tab.id, { action: 'startScreenshot', output: 'clipboard' });
            break;
        case 'FULL_SCREENSHOT':
            if (tab) chrome.tabs.sendMessage(tab.id, { action: 'fullPageShot' });
            break;
    }
}

/* -------- Message routing -------- */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Content script asks background to capture the visible viewport.
    if (request.action === 'captureVisible' || request.action === 'captureArea') {
        chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
            if (request.action === 'captureArea' && sender.tab) {
                chrome.tabs.sendMessage(sender.tab.id, {
                    action: 'processScreenshot', dataUrl, area: request.area, output: request.output
                });
            } else {
                sendResponse({ dataUrl });
            }
        });
        return true; // async response
    }

    handleAction(request.action, request);
});

/* -------- Keyboard command shortcuts -------- */
if (chrome.commands && chrome.commands.onCommand) {
    chrome.commands.onCommand.addListener((command) => {
        const map = {
            mute_tab: 'MUTE_TAB', unmute_tab: 'UNMUTE_TAB',
            clear_cache: 'CLEAR_CACHE', clear_cookies: 'CLEAR_COOKIES',
            bookmark: 'BOOKMARK', reader_mode: 'READER_MODE', dark_mode: 'DARK_MODE'
        };
        if (map[command]) handleAction(map[command], {});
    });
}
