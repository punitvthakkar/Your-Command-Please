const $ = document.querySelector.bind(document);
const { BUILTIN, CATEGORY_ORDER, escapeHtml, fuzzyScore, frecency, recordUse, compute, loadState } = window.YCP;

const el = {
    input: $('#commandInput'),
    autofill: $('#autofill'),
    suggestions: $('#suggestions'),
    main: $('#main-container'),
    settingsBtn: $('#settingsBtn'),
    // prompt panel
    promptPanel: $('#prompt-container'),
    promptTitle: $('#promptTitle'),
    promptInput: $('#promptInput'),
    promptOk: $('#promptOk'),
    promptCancel: $('#promptCancel'),
    promptBack: $('#promptBack'),
    // edit panel
    editPanel: $('#edit-command-container'),
    editTitle: $('#editTitle'),
    editName: $('#editName'),
    editUrl: $('#editUrl'),
    editSave: $('#editSave'),
    editCancel: $('#editCancel'),
    editBack: $('#editBack'),
    // search command panel
    searchPanel: $('#search-command-container'),
    searchName: $('#searchName'),
    searchUrl: $('#searchUrl'),
    searchSave: $('#searchSave'),
    searchCancel: $('#searchCancel'),
    searchBack: $('#searchBack'),
    toast: $('#toast')
};

let state = { customCommands: {}, pinned: [], settings: {}, snippets: [], macros: [], stats: {}, history: [] };
let renderedRows = [];
let selectedIndex = -1;
let renderToken = 0;
let editingOriginalName = null;

/* ---------------- Theme ---------------- */
function applyTheme() {
    const t = state.settings.theme || 'auto';
    document.body.classList.remove('theme-dark', 'theme-light');
    if (t === 'dark') document.body.classList.add('theme-dark');
    else if (t === 'light') document.body.classList.add('theme-light');
}

/* ---------------- Command model ---------------- */
function iconForAction(action) {
    if (action.startsWith('SEARCH:')) return '🔍';
    if (action.startsWith('http')) return '🌐';
    if (action.startsWith('chrome://')) return '🧩';
    return '▶️';
}

function getAllCommands() {
    const list = BUILTIN.slice();
    for (const [name, action] of Object.entries(state.customCommands)) {
        list.push({ name, action, category: 'Custom', icon: iconForAction(action), custom: true });
    }
    state.snippets.forEach((s, i) => {
        list.push({ name: 'insert ' + s.name, action: 'SNIPPET:' + i, category: 'Snippets', icon: '📋', snippet: s });
    });
    state.macros.forEach((m, i) => {
        list.push({ name: m.name.toLowerCase(), action: 'MACRO:' + i, category: 'Macros', icon: '🧩', macro: m });
    });
    return list;
}

/* ---------------- Rendering ---------------- */
function rowHtml(row, index) {
    const selected = index === selectedIndex ? ' selected' : '';
    const isPinned = state.pinned.includes(row.cmd && row.cmd.name);
    let actions = '';
    if (!row.dynamic && row.cmd) {
        const pinGlyph = isPinned ? '★' : '☆';
        actions += `<button class="row-act pin" data-act="pin" title="${isPinned ? 'Unpin' : 'Pin'}">${pinGlyph}</button>`;
        if (row.cmd.custom) {
            actions += `<button class="row-act edit" data-act="edit" title="Edit">✎</button>`;
            actions += `<button class="row-act del" data-act="del" title="Delete">🗑</button>`;
        }
    }
    const badge = row.badge ? `<span class="badge">${escapeHtml(row.badge)}</span>` : '';
    const sub = row.sublabel ? `<span class="row-sub">${escapeHtml(row.sublabel)}</span>` : '';
    return `<div class="row${selected}" role="option" data-index="${index}">
        <span class="row-icon" aria-hidden="true">${escapeHtml(row.icon || '•')}</span>
        <span class="row-body">
            <span class="row-label">${escapeHtml(row.label)}</span>
            ${sub}
        </span>
        ${badge}
        <span class="row-actions">${actions}</span>
    </div>`;
}

function paint(rows, grouped) {
    // In grouped mode the list is rendered by category, but the incoming rows
    // are sorted by frecency. Reorder the array to match the on-screen order
    // FIRST, so that selectedIndex / data-index walk the list the same way the
    // eye does — otherwise arrow keys hop around and the list scroll lurches.
    if (grouped) {
        const byCat = {};
        rows.forEach(r => { (byCat[r.category] = byCat[r.category] || []).push(r); });
        const ordered = [];
        for (const cat of CATEGORY_ORDER) {
            if (byCat[cat]) { ordered.push(...byCat[cat]); delete byCat[cat]; }
        }
        for (const cat in byCat) ordered.push(...byCat[cat]); // any uncategorised
        rows = ordered;
    }

    renderedRows = rows;
    if (selectedIndex >= rows.length) selectedIndex = rows.length ? 0 : -1;

    if (!rows.length) {
        el.suggestions.innerHTML = `<div class="empty">No matches</div>`;
        return;
    }

    if (grouped) {
        let html = '', lastCat = null;
        rows.forEach((r, i) => {
            if (r.category !== lastCat) {
                html += `<div class="cat-head">${escapeHtml(r.category)}</div>`;
                lastCat = r.category;
            }
            html += rowHtml(r, i);
        });
        el.suggestions.innerHTML = html;
    } else {
        el.suggestions.innerHTML = rows.map((r, i) => rowHtml(r, i)).join('');
    }
    const selectedEl = el.suggestions.querySelector('.row.selected');
    if (selectedEl) ensureVisible(selectedEl);
}

/* ---------------- Row builders ---------------- */
function staticRow(cmd, badge) {
    return {
        cmd, icon: cmd.icon, label: cmd.name, category: cmd.category,
        badge: badge || null, dynamic: false,
        onRun: () => runCommand(cmd)
    };
}

/* ---------------- Main update loop ---------------- */
function update() {
    const raw = el.input.value;
    const q = raw.trim();
    const ql = q.toLowerCase();
    const token = ++renderToken;
    el.autofill.textContent = ''; // cleared unless a completion is set below
    selectedIndex = renderedRows.length && selectedIndex >= 0 ? selectedIndex : (q ? 0 : -1);

    // --- Dynamic modes: tab switcher / goto ---
    const tabMatch = ql.match(/^(?:tab|switch to tab|switch tab)\b\s*(.*)$/);
    const gotoMatch = ql.match(/^goto\b\s*(.*)$/);

    if (tabMatch) { renderTabs(tabMatch[1], token); showAutofill(''); return; }
    if (gotoMatch) { renderGoto(gotoMatch[1], token); showAutofill(''); return; }

    const rows = [];

    // --- Calculator / unit conversion ---
    if (state.settings.calculator && q) {
        const c = compute(q);
        if (c) {
            rows.push({
                icon: '🧮', label: '= ' + c.display, sublabel: 'Copy result to clipboard',
                badge: 'Result', dynamic: true,
                onRun: () => { copyText(String(c.value)); toast('Copied ' + c.display); closeSoon(); }
            });
        }
    }

    const all = getAllCommands();

    // --- Inline search args: "search youtube lofi beats" ---
    const inline = matchInlineSearch(all, q);
    if (inline) {
        rows.push({
            icon: inline.cmd.icon, label: `${inline.cmd.name} → “${inline.query}”`,
            sublabel: 'Search with your query', badge: 'Search', dynamic: true,
            onRun: () => { openSearch(inline.cmd.action, inline.query); }
        });
    }

    // --- Static commands ---
    if (!q) {
        // grouped, frecency-sorted within category, pinned first
        const pinnedRows = [];
        const rest = [];
        for (const cmd of all) {
            const row = staticRow(cmd, null);
            if (state.pinned.includes(cmd.name)) { row.category = 'Pinned'; pinnedRows.push(row); }
            else rest.push(row);
        }
        pinnedRows.sort((a, b) => state.pinned.indexOf(a.cmd.name) - state.pinned.indexOf(b.cmd.name));
        rest.sort((a, b) => frecency(state.stats, b.cmd.name) - frecency(state.stats, a.cmd.name));
        paint([...pinnedRows, ...rest], true);
        return;
    }

    // ranked flat
    const useFuzzy = state.settings.fuzzy !== false;
    const scored = [];
    for (const cmd of all) {
        const base = useFuzzy ? fuzzyScore(ql, cmd.name) : (cmd.name.includes(ql) ? 1 : 0);
        if (base <= 0) continue;
        const score = base + frecency(state.stats, cmd.name) * 0.5 + (state.pinned.includes(cmd.name) ? 3 : 0);
        scored.push({ cmd, score });
    }
    scored.sort((a, b) => b.score - a.score);
    scored.forEach(s => rows.push(staticRow(s.cmd, s.cmd.category)));

    // Fallback: search the web
    if (!rows.length) {
        rows.push({
            icon: '🔍', label: `Search Google for “${q}”`, badge: 'Web', dynamic: true,
            onRun: () => openSearch('SEARCH:https://www.google.com/search?q={searchTerm}', q)
        });
    }

    paint(rows, false);
    showAutofill(raw);
}

function matchInlineSearch(all, q) {
    let best = null;
    const ql = q.toLowerCase();
    for (const cmd of all) {
        if (!cmd.action.startsWith('SEARCH:')) continue;
        const prefix = cmd.name + ' ';
        if (ql.startsWith(prefix) && q.length > prefix.length) {
            if (!best || cmd.name.length > best.cmd.name.length) {
                best = { cmd, query: q.slice(prefix.length).trim() };
            }
        }
    }
    return best && best.query ? best : null;
}

/* ---------------- Dynamic providers ---------------- */
function renderTabs(filter, token) {
    chrome.tabs.query({}, (tabs) => {
        if (token !== renderToken) return;
        const f = filter.toLowerCase();
        const rows = tabs
            .map(t => ({ t, s: f ? Math.max(fuzzyScore(f, t.title || ''), fuzzyScore(f, t.url || '')) : 1 }))
            .filter(x => x.s > 0)
            .sort((a, b) => b.s - a.s)
            .slice(0, 30)
            .map(({ t }) => ({
                icon: t.favIconUrl ? '🔖' : '🗂️', label: t.title || t.url, sublabel: t.url,
                badge: t.active ? 'current' : null, dynamic: true,
                onRun: () => {
                    chrome.tabs.update(t.id, { active: true });
                    chrome.windows.update(t.windowId, { focused: true });
                    window.close();
                }
            }));
        selectedIndex = rows.length ? 0 : -1;
        paint(rows, false);
    });
}

function renderGoto(filter, token) {
    if (!filter) {
        selectedIndex = -1;
        paint([{ icon: '🧭', label: 'Type to search bookmarks & history…', dynamic: true, onRun: () => {} }], false);
        return;
    }
    Promise.all([
        new Promise(res => chrome.bookmarks.search(filter, res)),
        new Promise(res => chrome.history.search({ text: filter, maxResults: 12 }, res))
    ]).then(([bm, hist]) => {
        if (token !== renderToken) return;
        const seen = new Set();
        const rows = [];
        bm.filter(b => b.url).forEach(b => {
            if (seen.has(b.url)) return; seen.add(b.url);
            rows.push({ icon: '⭐', label: b.title || b.url, sublabel: b.url, badge: 'bookmark', dynamic: true,
                onRun: () => { chrome.tabs.create({ url: b.url }); window.close(); } });
        });
        hist.forEach(h => {
            if (seen.has(h.url)) return; seen.add(h.url);
            rows.push({ icon: '🕘', label: h.title || h.url, sublabel: h.url, badge: 'history', dynamic: true,
                onRun: () => { chrome.tabs.create({ url: h.url }); window.close(); } });
        });
        selectedIndex = rows.length ? 0 : -1;
        paint(rows.slice(0, 30), false);
    });
}

/* ---------------- Autofill ghost ---------------- */
function showAutofill(raw) {
    const q = raw.toLowerCase();
    if (!q) { el.autofill.textContent = ''; return; }
    const hit = state.history.find(c => c.startsWith(q)) ||
                (renderedRows.find(r => !r.dynamic && r.label.toLowerCase().startsWith(q)) || {}).label;
    el.autofill.textContent = hit && hit.toLowerCase() !== q ? raw + hit.slice(raw.length) : '';
}

/* ---------------- Execution ---------------- */
function runCommand(cmd) {
    const action = cmd.action;

    // UI transitions — do not close the popup
    if (action === 'NEW_COMMAND') { openEditor(null); return; }
    if (action === 'NEW_SEARCH') { openSearchCommand(); return; }
    if (action === 'OPEN_SETTINGS') { chrome.runtime.openOptionsPage(); window.close(); return; }
    if (action === 'SWITCH_TAB') { el.input.value = 'tab '; el.input.focus(); update(); return; }
    if (action === 'GOTO') { el.input.value = 'goto '; el.input.focus(); update(); return; }

    recordUse(cmd.name);
    pushHistory(cmd.name);

    if (action === 'COPY_URL' || action === 'COPY_TITLE') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const t = tabs[0];
            if (t) { copyText(action === 'COPY_URL' ? t.url : t.title); toast('Copied'); }
            closeSoon();
        });
        return;
    }

    if (action.startsWith('http') || action.startsWith('chrome://')) {
        chrome.tabs.create({ url: action });
        window.close();
    } else if (action.startsWith('SEARCH:')) {
        promptFor(`${cmd.name} — enter search term`).then(term => {
            if (term) openSearch(action, term);
        });
    } else if (action.startsWith('SNIPPET:')) {
        const snip = state.snippets[+action.slice(8)];
        if (snip) { chrome.runtime.sendMessage({ action: 'INSERT_SNIPPET', text: snip.text }); }
        window.close();
    } else if (action.startsWith('MACRO:')) {
        const macro = state.macros[+action.slice(6)];
        if (macro) macro.urls.forEach(u => chrome.tabs.create({ url: u }));
        window.close();
    } else {
        chrome.runtime.sendMessage({ action });
        window.close();
    }
}

function openSearch(action, term) {
    const url = action.replace('SEARCH:', '').replace('{searchTerm}', encodeURIComponent(term));
    chrome.tabs.create({ url });
    window.close();
}

/* ---------------- Inline prompt ---------------- */
let promptResolver = null;
function promptFor(title) {
    return new Promise((resolve) => {
        promptResolver = resolve;
        el.promptTitle.textContent = title;
        el.promptInput.value = '';
        show(el.promptPanel);
        el.promptInput.focus();
    });
}
function resolvePrompt(val) {
    show(el.main);
    el.input.focus();
    const r = promptResolver; promptResolver = null;
    if (r) r(val);
}

/* ---------------- Editors ---------------- */
function openEditor(existing) {
    editingOriginalName = existing ? existing.name : null;
    el.editTitle.textContent = existing ? 'Edit Command' : 'New Command';
    el.editName.value = existing ? existing.name : '';
    el.editUrl.value = existing ? existing.action : '';
    show(el.editPanel);
    el.editName.focus();
}
function saveEditor() {
    const name = el.editName.value.trim().toLowerCase();
    const url = el.editUrl.value.trim();
    if (!name || !url) { toast('Name and URL required'); return; }
    if (editingOriginalName && editingOriginalName !== name) delete state.customCommands[editingOriginalName];
    state.customCommands[name] = url;
    persist();
    toast(`Saved “${name}”`);
    backToMain();
}
function openSearchCommand() {
    el.searchName.value = '';
    el.searchUrl.value = '';
    show(el.searchPanel);
    el.searchName.focus();
}
function saveSearchCommand() {
    const name = el.searchName.value.trim().toLowerCase();
    let url = el.searchUrl.value.trim();
    if (!name || !url) { toast('Name and URL required'); return; }
    url = url.replace('abc%20xyz%20pqr', '{searchTerm}')
             .replace('abc+xyz+pqr', '{searchTerm}')
             .replace('abc%2Bxyz%2Bpqr', '{searchTerm}')
             .replace('abc xyz pqr', '{searchTerm}');
    state.customCommands[name] = 'SEARCH:' + url;
    persist();
    toast(`Saved “${name}”`);
    backToMain();
}

/* ---------------- Pin / delete ---------------- */
function togglePin(name) {
    if (state.pinned.includes(name)) {
        state.pinned = state.pinned.filter(n => n !== name);
    } else {
        if (state.pinned.length >= (state.settings.pinLimit || 3)) {
            toast(`Pin limit is ${state.settings.pinLimit || 3} (change in Settings)`);
            return;
        }
        state.pinned.push(name);
    }
    persist();
    update();
}
function deleteCommand(name) {
    delete state.customCommands[name];
    state.pinned = state.pinned.filter(n => n !== name);
    persist();
    update();
}

/* ---------------- Persistence ---------------- */
function persist() {
    chrome.storage.sync.set({
        commands: state.customCommands,
        pinnedCommands: state.pinned,
        settings: state.settings,
        snippets: state.snippets,
        macros: state.macros
    });
}
function pushHistory(name) {
    state.history = [name, ...state.history.filter(c => c !== name)].slice(0, 10);
    chrome.storage.local.set({ commandHistory: state.history });
}

/* ---------------- View helpers ---------------- */
function show(panel) {
    [el.main, el.promptPanel, el.editPanel, el.searchPanel].forEach(p => p.classList.add('hidden'));
    panel.classList.remove('hidden');
}
function backToMain() {
    show(el.main);
    el.input.value = '';
    el.input.focus();
    update();
}
function copyText(t) { navigator.clipboard.writeText(t).catch(() => {}); }
let toastTimer = null;
function toast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.add('hidden'), 1600);
}
function closeSoon() { setTimeout(() => window.close(), 400); }

/* ---------------- Keyboard nav ---------------- */
// Scroll only within the suggestions list (never the popup body), and keep a
// preceding category header on screen when landing on a section's first row.
function ensureVisible(node) {
    const c = el.suggestions;
    // When landing on a section's first row, treat its category header as the
    // top of the region to reveal, so the header scrolls in with the row.
    let topNode = node;
    const prev = node.previousElementSibling;
    if (prev && prev.classList.contains('cat-head')) topNode = prev;
    const cRect = c.getBoundingClientRect();
    const topRect = topNode.getBoundingClientRect();
    const botRect = node.getBoundingClientRect();
    // Scroll the minimum needed to keep the selected row (and its header) in view.
    if (topRect.top < cRect.top) {
        c.scrollTop -= (cRect.top - topRect.top);
    } else if (botRect.bottom > cRect.bottom) {
        c.scrollTop += (botRect.bottom - cRect.bottom);
    }
}

function move(delta) {
    if (!renderedRows.length) return;
    selectedIndex = (selectedIndex + delta + renderedRows.length) % renderedRows.length;
    let selNode = null;
    el.suggestions.querySelectorAll('.row').forEach(node => {
        const on = +node.dataset.index === selectedIndex;
        node.classList.toggle('selected', on);
        if (on) selNode = node;
    });
    if (selNode) ensureVisible(selNode);
}
function runSelected() {
    const row = renderedRows[selectedIndex] || renderedRows[0];
    if (row) row.onRun();
}

/* ---------------- Wiring ---------------- */
el.input.addEventListener('input', () => { selectedIndex = el.input.value.trim() ? 0 : -1; update(); });
el.input.addEventListener('keydown', (e) => {
    switch (e.key) {
        case 'ArrowDown': e.preventDefault(); if (!renderedRows.length) update(); move(1); break;
        case 'ArrowUp': e.preventDefault(); if (!renderedRows.length) update(); move(-1); break;
        case 'Enter': e.preventDefault(); runSelected(); break;
        case 'Tab':
            if (el.autofill.textContent) {
                e.preventDefault();
                el.input.value = el.autofill.textContent;
                el.autofill.textContent = '';
                update();
            }
            break;
        case 'Escape': window.close(); break;
    }
});

el.suggestions.addEventListener('click', (e) => {
    const rowEl = e.target.closest('.row');
    if (!rowEl) return;
    const row = renderedRows[+rowEl.dataset.index];
    if (!row) return;
    const actBtn = e.target.closest('.row-act');
    if (actBtn && row.cmd) {
        const act = actBtn.dataset.act;
        if (act === 'pin') togglePin(row.cmd.name);
        else if (act === 'edit') openEditor({ name: row.cmd.name, action: row.cmd.action });
        else if (act === 'del') deleteCommand(row.cmd.name);
        return;
    }
    row.onRun();
});

el.settingsBtn.addEventListener('click', () => { chrome.runtime.openOptionsPage(); window.close(); });

// prompt panel
el.promptOk.addEventListener('click', () => resolvePrompt(el.promptInput.value.trim()));
el.promptCancel.addEventListener('click', () => resolvePrompt(null));
el.promptBack.addEventListener('click', () => resolvePrompt(null));
el.promptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') resolvePrompt(el.promptInput.value.trim());
    if (e.key === 'Escape') resolvePrompt(null);
});

// edit panel
el.editSave.addEventListener('click', saveEditor);
el.editCancel.addEventListener('click', backToMain);
el.editBack.addEventListener('click', backToMain);
el.editName.addEventListener('keydown', (e) => { if (e.key === 'Enter') el.editUrl.focus(); });
el.editUrl.addEventListener('keydown', (e) => { if (e.key === 'Enter') saveEditor(); });

// search command panel
el.searchSave.addEventListener('click', saveSearchCommand);
el.searchCancel.addEventListener('click', backToMain);
el.searchBack.addEventListener('click', backToMain);
el.searchName.addEventListener('keydown', (e) => { if (e.key === 'Enter') el.searchUrl.focus(); });
el.searchUrl.addEventListener('keydown', (e) => { if (e.key === 'Enter') saveSearchCommand(); });

/* ---------------- Boot ---------------- */
loadState((s) => {
    state = s;
    applyTheme();
    el.input.focus();
    update();
});
