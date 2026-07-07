const $ = document.querySelector.bind(document);
const { escapeHtml, loadState, DEFAULT_SETTINGS } = window.YCP;

let state = { customCommands: {}, pinned: [], settings: {}, snippets: [], macros: [], stats: {}, history: [] };

/* ---------- theme ---------- */
function applyTheme() {
    const t = state.settings.theme || 'auto';
    document.body.classList.remove('theme-dark', 'theme-light', 'options-tmp');
    document.body.classList.add('options');
    if (t === 'dark') document.body.classList.add('theme-dark');
    else if (t === 'light') document.body.classList.add('theme-light');
}

/* ---------- persistence ---------- */
function saveSync(partial) {
    Object.assign(state, partial);
    chrome.storage.sync.set({
        commands: state.customCommands,
        pinnedCommands: state.pinned,
        settings: state.settings,
        snippets: state.snippets,
        macros: state.macros
    });
}

/* ---------- preferences ---------- */
function bindPrefs() {
    $('#theme').value = state.settings.theme || 'auto';
    $('#pinLimit').value = state.settings.pinLimit || 3;
    $('#calculator').checked = state.settings.calculator !== false;
    $('#fuzzy').checked = state.settings.fuzzy !== false;

    $('#theme').addEventListener('change', (e) => {
        state.settings.theme = e.target.value; saveSync({}); applyTheme();
    });
    $('#pinLimit').addEventListener('change', (e) => {
        const v = Math.max(1, Math.min(20, parseInt(e.target.value) || 3));
        e.target.value = v; state.settings.pinLimit = v; saveSync({});
    });
    $('#calculator').addEventListener('change', (e) => { state.settings.calculator = e.target.checked; saveSync({}); });
    $('#fuzzy').addEventListener('change', (e) => { state.settings.fuzzy = e.target.checked; saveSync({}); });
}

/* ---------- snippets ---------- */
function renderSnippets() {
    const list = $('#snippetList');
    list.innerHTML = state.snippets.map((s, i) => `
        <div class="list-item">
            <div class="li-body">
                <div class="li-title">insert ${escapeHtml(s.name)}</div>
                <div class="li-sub">${escapeHtml(s.text)}</div>
            </div>
            <div class="li-actions">
                <button class="icon-btn sm" data-del-snip="${i}" title="Delete">🗑</button>
            </div>
        </div>`).join('') || '<p class="hint">No snippets yet.</p>';
}
function addSnippet() {
    const name = $('#snipName').value.trim();
    const text = $('#snipText').value;
    if (!name || !text.trim()) { toast('Name and text required'); return; }
    state.snippets.push({ name, text });
    saveSync({});
    $('#snipName').value = ''; $('#snipText').value = '';
    renderSnippets();
}

/* ---------- macros ---------- */
function renderMacros() {
    const list = $('#macroList');
    list.innerHTML = state.macros.map((m, i) => `
        <div class="list-item">
            <div class="li-body">
                <div class="li-title">${escapeHtml(m.name)}</div>
                <div class="li-sub">${escapeHtml(m.urls.length + ' tab(s): ' + m.urls.join(', '))}</div>
            </div>
            <div class="li-actions">
                <button class="icon-btn sm" data-del-macro="${i}" title="Delete">🗑</button>
            </div>
        </div>`).join('') || '<p class="hint">No macros yet.</p>';
}
function addMacro() {
    const name = $('#macroName').value.trim();
    const urls = $('#macroUrls').value.split('\n').map(u => u.trim()).filter(Boolean)
        .map(u => /^https?:\/\/|^chrome:\/\//.test(u) ? u : 'https://' + u);
    if (!name || !urls.length) { toast('Name and at least one URL required'); return; }
    state.macros.push({ name, urls });
    saveSync({});
    $('#macroName').value = ''; $('#macroUrls').value = '';
    renderMacros();
}

/* ---------- custom commands ---------- */
function renderCommands() {
    const list = $('#commandList');
    const entries = Object.entries(state.customCommands);
    $('#noCommands').style.display = entries.length ? 'none' : 'block';
    list.innerHTML = entries.map(([name, action]) => `
        <div class="list-item" data-name="${escapeHtml(name)}">
            <div class="li-body">
                <div class="li-title">${escapeHtml(name)}</div>
                <div class="li-sub">${escapeHtml(action.replace(/^SEARCH:/, '🔍 '))}</div>
            </div>
            <div class="li-actions">
                <button class="icon-btn sm" data-edit-cmd="${escapeHtml(name)}" title="Edit">✎</button>
                <button class="icon-btn sm" data-del-cmd="${escapeHtml(name)}" title="Delete">🗑</button>
            </div>
        </div>`).join('');
}
function editCommand(name) {
    const current = state.customCommands[name];
    const url = prompt(`Edit URL for “${name}”`, current);
    if (url === null) return;
    if (!url.trim()) { toast('URL cannot be empty'); return; }
    state.customCommands[name] = url.trim();
    saveSync({});
    renderCommands();
}

/* ---------- import / export ---------- */
function exportJson() {
    const data = {
        commands: state.customCommands, pinnedCommands: state.pinned,
        settings: state.settings, snippets: state.snippets, macros: state.macros
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'your-command-please-backup.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function importJson(file) {
    const reader = new FileReader();
    reader.onload = () => {
        try {
            const d = JSON.parse(reader.result);
            state.customCommands = Object.assign({}, state.customCommands, d.commands || {});
            if (Array.isArray(d.snippets)) state.snippets = state.snippets.concat(d.snippets);
            if (Array.isArray(d.macros)) state.macros = state.macros.concat(d.macros);
            if (Array.isArray(d.pinnedCommands)) state.pinned = d.pinnedCommands;
            if (d.settings) state.settings = Object.assign({}, state.settings, d.settings);
            saveSync({});
            renderAll();
            bindPrefs();
            toast('Import complete');
        } catch (e) {
            toast('Invalid JSON file');
        }
    };
    reader.readAsText(file);
}

/* ---------- toast ---------- */
let toastTimer = null;
function toast(msg) {
    const t = $('#toast');
    t.textContent = msg; t.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.add('hidden'), 1600);
}

function renderAll() { renderSnippets(); renderMacros(); renderCommands(); }

/* ---------- wiring ---------- */
$('#addSnippet').addEventListener('click', addSnippet);
$('#addMacro').addEventListener('click', addMacro);
$('#exportBtn').addEventListener('click', exportJson);
$('#importBtn').addEventListener('click', () => $('#importFile').click());
$('#importFile').addEventListener('change', (e) => { if (e.target.files[0]) importJson(e.target.files[0]); });

document.addEventListener('click', (e) => {
    const t = e.target;
    if (t.dataset.delSnip != null) { state.snippets.splice(+t.dataset.delSnip, 1); saveSync({}); renderSnippets(); }
    else if (t.dataset.delMacro != null) { state.macros.splice(+t.dataset.delMacro, 1); saveSync({}); renderMacros(); }
    else if (t.dataset.delCmd) { delete state.customCommands[t.dataset.delCmd]; state.pinned = state.pinned.filter(n => n !== t.dataset.delCmd); saveSync({}); renderCommands(); }
    else if (t.dataset.editCmd) { editCommand(t.dataset.editCmd); }
});

/* ---------- boot ---------- */
loadState((s) => {
    state = s;
    state.settings = Object.assign({}, DEFAULT_SETTINGS, state.settings);
    applyTheme();
    bindPrefs();
    renderAll();
});
