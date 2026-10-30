const $ = document.querySelector.bind(document);
const { escapeHtml, loadState, DEFAULT_SETTINGS, applyTheme } = window.YCP;

let state = { customCommands: {}, pinned: [], settings: {}, snippets: [], macros: [], stats: {}, history: [] };

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

/* ---------- appearance (theme engine) ---------- */
let engine = null; // theme-engine.js, loaded once at boot
const DIAL_HINTS = {
    calm: 'Soft color, gentle motion, tighter corners',
    standard: 'True-to-seed color, crisp motion',
    expressive: 'Vivid color, bouncy motion, rounder corners'
};

function isDark() {
    const t = document.documentElement.dataset.theme;
    return t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
}
// Each swatch previews the scheme it would generate under the current style and mode
function swatchStyle(seed) {
    const c = engine.scheme(seed, state.settings.themeDial, isDark());
    return `--a:${c.primary};--b:${c.primaryContainer};--c:${c.secondary}`;
}
function renderSwatches() {
    if (!engine) return;
    const seed = engine.normalizeSeed(state.settings.themeSeed);
    const isMood = engine.MOODS.some(m => m.seed === seed);
    $('#swatches').innerHTML = engine.MOODS.map(m => `
        <label class="swatch">
            <input type="radio" name="seed" value="${m.seed}"${m.seed === seed ? ' checked' : ''}>
            <span class="swatch-art" style="${swatchStyle(m.seed)}"></span>
            <span class="swatch-name">${m.label}</span>
        </label>`).join('') + `
        <button type="button" class="swatch custom" id="customSwatch" aria-pressed="${!isMood}">
            <span class="swatch-art"${isMood ? '' : ` style="${swatchStyle(seed)}"`}>${isMood ? icon('add') : ''}</span>
            <span class="swatch-name">Custom</span>
        </button>`;
}
function applyAppearance() {
    applyTheme(state.settings).then(renderSwatches);
    $('#dialHint').textContent = DIAL_HINTS[state.settings.themeDial] || '';
}

// Live preview while the color picker is open; saved when the picker commits
let previewFrame = 0;
function previewSeed(hex) {
    cancelAnimationFrame(previewFrame);
    previewFrame = requestAnimationFrame(() => {
        state.settings.themeSeed = hex;
        applyAppearance();
    });
}

/* ---------- preferences ---------- */
function syncPrefs() {
    for (const [name, value] of [['theme', state.settings.theme || 'auto'], ['dial', state.settings.themeDial]]) {
        const r = $(`input[name="${name}"][value="${value}"]`);
        if (r) r.checked = true;
    }
    $('#pinLimit').value = state.settings.pinLimit || 3;
    $('#calculator').checked = state.settings.calculator !== false;
    $('#fuzzy').checked = state.settings.fuzzy !== false;
    applyAppearance();
}

function bindPrefs() {
    $('#swatches').addEventListener('change', (e) => {
        if (e.target.name !== 'seed') return;
        state.settings.themeSeed = e.target.value; saveSync({}); applyAppearance();
    });
    $('#swatches').addEventListener('click', (e) => {
        if (!e.target.closest('#customSwatch')) return;
        const picker = $('#customSeed');
        picker.value = engine ? engine.normalizeSeed(state.settings.themeSeed).toLowerCase() : '#5b4bdb';
        try { picker.showPicker(); } catch (err) { picker.click(); }
    });
    $('#customSeed').addEventListener('input', (e) => previewSeed(e.target.value.toUpperCase()));
    $('#customSeed').addEventListener('change', (e) => {
        state.settings.themeSeed = e.target.value.toUpperCase(); saveSync({}); applyAppearance();
    });
    document.querySelectorAll('input[name="dial"]').forEach(r => r.addEventListener('change', (e) => {
        state.settings.themeDial = e.target.value; saveSync({}); applyAppearance();
    }));
    document.querySelectorAll('input[name="theme"]').forEach(r => r.addEventListener('change', (e) => {
        state.settings.theme = e.target.value; saveSync({}); applyAppearance();
    }));
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', renderSwatches);

    $('#pinLimit').addEventListener('change', (e) => {
        const v = Math.max(1, Math.min(20, parseInt(e.target.value) || 3));
        e.target.value = v; state.settings.pinLimit = v; saveSync({});
    });
    $('#calculator').addEventListener('change', (e) => { state.settings.calculator = e.target.checked; saveSync({}); });
    $('#fuzzy').addEventListener('change', (e) => { state.settings.fuzzy = e.target.checked; saveSync({}); });
}

// Subtitle shows the real shortcut, or where to set one
function showShortcut() {
    chrome.commands.getAll((cmds) => {
        const open = cmds.find(c => c.name === '_execute_action');
        const line = $('#shortcutLine');
        if (open && open.shortcut) line.innerHTML = `Open the palette with <kbd>${escapeHtml(open.shortcut)}</kbd>`;
        else line.textContent = 'Set a shortcut at chrome://extensions/shortcuts';
    });
}

/* ---------- snippets ---------- */
function renderSnippets() {
    const list = $('#snippetList');
    list.innerHTML = state.snippets.map((s, i) => `
        <div class="item">
            <div class="li-body">
                <div class="li-title">insert ${escapeHtml(s.name)}</div>
                <div class="li-sub">${escapeHtml(s.text)}</div>
            </div>
            <div class="li-actions">
                <button class="icon-btn" data-del-snip="${i}" title="Delete" aria-label="Delete">${icon('delete')}</button>
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
        <div class="item">
            <div class="li-body">
                <div class="li-title">${escapeHtml(m.name)}</div>
                <div class="li-sub">${escapeHtml(m.urls.length + ' tab(s): ' + m.urls.join(', '))}</div>
            </div>
            <div class="li-actions">
                <button class="icon-btn" data-del-macro="${i}" title="Delete" aria-label="Delete">${icon('delete')}</button>
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
    $('#noCommands').hidden = entries.length > 0;
    list.innerHTML = entries.map(([name, action]) => `
        <div class="item" data-name="${escapeHtml(name)}">
            <div class="li-body">
                <div class="li-title">${escapeHtml(name)}</div>
                <div class="li-sub">${escapeHtml(action.replace(/^SEARCH:/, 'Search: '))}</div>
            </div>
            <div class="li-actions">
                <button class="icon-btn" data-edit-cmd="${escapeHtml(name)}" title="Edit" aria-label="Edit">${icon('edit')}</button>
                <button class="icon-btn" data-del-cmd="${escapeHtml(name)}" title="Delete" aria-label="Delete">${icon('delete')}</button>
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
            syncPrefs();
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
document.querySelectorAll('[data-icon]').forEach(n => { n.innerHTML = icon(n.dataset.icon); });
$('#exportBtn').innerHTML = icon('download') + 'Export JSON';
$('#importBtn').innerHTML = icon('upload') + 'Import JSON';
$('#addSnippet').addEventListener('click', addSnippet);
$('#addMacro').addEventListener('click', addMacro);
$('#exportBtn').addEventListener('click', exportJson);
$('#importBtn').addEventListener('click', () => $('#importFile').click());
$('#importFile').addEventListener('change', (e) => { if (e.target.files[0]) importJson(e.target.files[0]); });

document.addEventListener('click', (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.delSnip != null) { state.snippets.splice(+t.dataset.delSnip, 1); saveSync({}); renderSnippets(); }
    else if (t.dataset.delMacro != null) { state.macros.splice(+t.dataset.delMacro, 1); saveSync({}); renderMacros(); }
    else if (t.dataset.delCmd) { delete state.customCommands[t.dataset.delCmd]; state.pinned = state.pinned.filter(n => n !== t.dataset.delCmd); saveSync({}); renderCommands(); }
    else if (t.dataset.editCmd) { editCommand(t.dataset.editCmd); }
});

/* ---------- boot ---------- */
loadState((s) => {
    state = s;
    state.settings = Object.assign({}, DEFAULT_SETTINGS, state.settings);
    bindPrefs();
    syncPrefs();
    renderAll();
    showShortcut();
    import('./theme-engine.js').then((m) => { engine = m; renderSwatches(); });
});
