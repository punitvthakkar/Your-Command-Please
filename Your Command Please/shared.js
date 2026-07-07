/* ============================================================
   Your Command Please — shared registry & utilities
   Loaded before popup.js and options.js. Exposes window.YCP.
   ============================================================ */
(function () {
    'use strict';

    // ---- Search endpoints (unified {searchTerm} template) ----
    const SEARCH = (u) => 'SEARCH:' + u;

    // ---- Built-in commands ------------------------------------
    // Each: { name, action, category, icon }
    const BUILTIN = [
        // Create
        { name: 'new tab',                        action: 'NEW_TAB',                                   category: 'Create',   icon: '➕' },
        { name: 'new window',                     action: 'NEW_WINDOW',                                category: 'Create',   icon: '🪟' },
        { name: 'new google doc',                 action: 'https://docs.new',                          category: 'Create',   icon: '📄' },
        { name: 'new doc',                        action: 'https://docs.new',                          category: 'Create',   icon: '📄' },
        { name: 'new google sheet',               action: 'https://sheets.new',                        category: 'Create',   icon: '📊' },
        { name: 'new sheet',                      action: 'https://sheets.new',                        category: 'Create',   icon: '📊' },
        { name: 'new google slides',              action: 'https://slides.new',                        category: 'Create',   icon: '📽️' },
        { name: 'new slides',                     action: 'https://slides.new',                        category: 'Create',   icon: '📽️' },
        { name: 'new notion doc',                 action: 'https://www.notion.so/new',                 category: 'Create',   icon: '🗒️' },
        { name: 'new figma project',              action: 'https://www.figma.com/new',                 category: 'Create',   icon: '🎨' },
        { name: 'new replit project',             action: 'https://replit.com/new',                    category: 'Create',   icon: '💻' },
        { name: 'new gmail message',              action: 'https://mail.google.com/mail/u/0/#compose', category: 'Create',   icon: '✉️' },
        { name: 'new word file',                  action: 'https://docx.new',                          category: 'Create',   icon: '📃' },
        { name: 'new powerpoint presentation',    action: 'https://pptx.new',                          category: 'Create',   icon: '📑' },
        { name: 'new excel file',                 action: 'https://excel.new',                         category: 'Create',   icon: '📈' },
        { name: 'new google calendar event',      action: 'https://cal.new',                           category: 'Create',   icon: '📅' },

        // Navigate (chrome pages)
        { name: 'history',                        action: 'chrome://history',                          category: 'Navigate', icon: '🕘' },
        { name: 'downloads',                      action: 'chrome://downloads',                        category: 'Navigate', icon: '⬇️' },
        { name: 'chrome settings',                action: 'chrome://settings',                         category: 'Navigate', icon: '⚙️' },
        { name: 'passwords',                      action: 'chrome://password-manager/passwords',       category: 'Navigate', icon: '🔑' },
        { name: 'extension manager',              action: 'chrome://extensions',                       category: 'Navigate', icon: '🧩' },
        { name: 'bookmark manager',               action: 'chrome://bookmarks',                        category: 'Navigate', icon: '📚' },
        { name: 'goto',                           action: 'GOTO',                                      category: 'Navigate', icon: '🧭' },

        // Tabs
        { name: 'switch to tab',                  action: 'SWITCH_TAB',                                category: 'Tabs',     icon: '🗂️' },
        { name: 'pin tab',                        action: 'PIN_TAB',                                   category: 'Tabs',     icon: '📌' },
        { name: 'unpin tab',                      action: 'UNPIN_TAB',                                 category: 'Tabs',     icon: '📌' },
        { name: 'mute tab',                       action: 'MUTE_TAB',                                  category: 'Tabs',     icon: '🔇' },
        { name: 'unmute tab',                     action: 'UNMUTE_TAB',                                category: 'Tabs',     icon: '🔊' },
        { name: 'duplicate tab',                  action: 'DUPLICATE_TAB',                             category: 'Tabs',     icon: '⧉' },
        { name: 'save all tabs',                  action: 'SAVE_ALL_TABS',                             category: 'Tabs',     icon: '💾' },

        // Browser
        { name: 'clear cache',                    action: 'CLEAR_CACHE',                               category: 'Browser',  icon: '🧹' },
        { name: 'clear cookies',                  action: 'CLEAR_COOKIES',                             category: 'Browser',  icon: '🍪' },
        { name: 'save bookmark',                  action: 'BOOKMARK',                                  category: 'Browser',  icon: '⭐' },

        // Page
        { name: 'screenshot',                     action: 'SCREENSHOT',                                category: 'Page',     icon: '✂️' },
        { name: 'copy screenshot',                action: 'COPY_SCREENSHOT',                           category: 'Page',     icon: '📋' },
        { name: 'full page screenshot',           action: 'FULL_SCREENSHOT',                           category: 'Page',     icon: '🖼️' },
        { name: 'reader mode',                    action: 'READER_MODE',                               category: 'Page',     icon: '📖' },
        { name: 'dark mode',                      action: 'DARK_MODE',                                 category: 'Page',     icon: '🌙' },
        { name: 'link extract',                   action: 'LINK_EXTRACT',                              category: 'Page',     icon: '🔗' },
        { name: 'copy url',                       action: 'COPY_URL',                                  category: 'Page',     icon: '📎' },
        { name: 'copy page title',                action: 'COPY_TITLE',                                category: 'Page',     icon: '🏷️' },

        // Search
        { name: 'search google',                  action: SEARCH('https://www.google.com/search?q={searchTerm}'),                   category: 'Search', icon: '🔍' },
        { name: 'search amazon',                  action: SEARCH('https://www.amazon.com/s?k={searchTerm}'),                        category: 'Search', icon: '🛒' },
        { name: 'search youtube',                 action: SEARCH('https://www.youtube.com/results?search_query={searchTerm}'),      category: 'Search', icon: '▶️' },
        { name: 'search flipkart',                action: SEARCH('https://www.flipkart.com/search?q={searchTerm}'),                 category: 'Search', icon: '🛍️' },
        { name: 'search spotify',                 action: SEARCH('https://open.spotify.com/search/{searchTerm}'),                   category: 'Search', icon: '🎵' },
        { name: 'search twitter',                 action: SEARCH('https://x.com/search?q={searchTerm}&src=typed_query'),            category: 'Search', icon: '🐦' },
        { name: 'search reddit',                  action: SEARCH('https://www.reddit.com/search?q={searchTerm}'),                   category: 'Search', icon: '👽' },
        { name: 'search bing',                    action: SEARCH('https://www.bing.com/search?q={searchTerm}'),                     category: 'Search', icon: '🔎' },
        { name: 'search gmail',                   action: SEARCH('https://mail.google.com/mail/u/0/#search/{searchTerm}'),          category: 'Search', icon: '📧' },

        // System
        { name: 'new command',                    action: 'NEW_COMMAND',                               category: 'System',   icon: '✨' },
        { name: 'new search command',             action: 'NEW_SEARCH',                                category: 'System',   icon: '🔧' },
        { name: 'extension settings',             action: 'OPEN_SETTINGS',                             category: 'System',   icon: '🎛️' }
    ];

    const CATEGORY_ORDER = ['Pinned', 'Result', 'Tabs', 'Navigate', 'Create', 'Search', 'Page', 'Browser', 'Snippets', 'Macros', 'System', 'Custom'];

    const DEFAULT_SETTINGS = {
        theme: 'auto',        // 'auto' | 'light' | 'dark'
        pinLimit: 3,
        calculator: true,
        fuzzy: true
    };

    // ---- Utilities --------------------------------------------
    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // Fuzzy subsequence match. Returns a score (>0 = match) or 0.
    function fuzzyScore(query, text) {
        query = query.toLowerCase();
        text = text.toLowerCase();
        if (!query) return 1;
        if (text.includes(query)) {
            // Strong bonus for substring; prefix beats mid-word.
            return 1000 - text.indexOf(query) * 4 - text.length * 0.2;
        }
        let qi = 0, score = 0, streak = 0;
        for (let ti = 0; ti < text.length && qi < query.length; ti++) {
            if (text[ti] === query[qi]) {
                qi++; streak++;
                score += 2 + streak;
                if (ti === 0 || text[ti - 1] === ' ') score += 6;
            } else {
                streak = 0;
            }
        }
        if (qi < query.length) return 0;
        return score - text.length * 0.1;
    }

    // ---- Frecency ----------------------------------------------
    function frecency(stats, name) {
        const s = stats && stats[name];
        if (!s) return 0;
        const ageDays = (Date.now() - s.last) / 86400000;
        const recency = ageDays < 1 ? 12 : ageDays < 7 ? 7 : ageDays < 30 ? 3 : 1;
        return s.count * 4 + recency;
    }

    function recordUse(name) {
        chrome.storage.local.get(['commandStats'], (r) => {
            const stats = r.commandStats || {};
            const prev = stats[name] || { count: 0, last: 0 };
            stats[name] = { count: prev.count + 1, last: Date.now() };
            chrome.storage.local.set({ commandStats: stats });
        });
    }

    // ---- Calculator & unit conversion -------------------------
    const LENGTH = { m: 1, meter: 1, meters: 1, km: 1000, cm: 0.01, mm: 0.001,
                     mi: 1609.344, mile: 1609.344, miles: 1609.344,
                     ft: 0.3048, feet: 0.3048, foot: 0.3048,
                     in: 0.0254, inch: 0.0254, inches: 0.0254,
                     yd: 0.9144, yard: 0.9144, yards: 0.9144 };
    const MASS = { g: 1, gram: 1, grams: 1, kg: 1000, mg: 0.001,
                   lb: 453.592, lbs: 453.592, pound: 453.592, pounds: 453.592,
                   oz: 28.3495, ounce: 28.3495, ounces: 28.3495 };

    function convertUnits(value, from, to) {
        from = from.toLowerCase(); to = to.toLowerCase();
        // Temperature
        const temps = { c: 'c', celsius: 'c', '°c': 'c', f: 'f', fahrenheit: 'f', '°f': 'f' };
        if (temps[from] && temps[to]) {
            if (temps[from] === temps[to]) return value;
            return temps[from] === 'c' ? value * 9 / 5 + 32 : (value - 32) * 5 / 9;
        }
        if (LENGTH[from] != null && LENGTH[to] != null) return value * LENGTH[from] / LENGTH[to];
        if (MASS[from] != null && MASS[to] != null) return value * MASS[from] / MASS[to];
        return null;
    }

    function round(n) {
        return Math.round(n * 1e6) / 1e6;
    }

    // Safe arithmetic evaluator (shunting-yard; no eval/Function).
    function evalArith(expr) {
        const tokens = expr.match(/(\d+\.?\d*|\.\d+|[+\-*/%^()])/g);
        if (!tokens) return null;
        const prec = { '+': 1, '-': 1, '*': 2, '/': 2, '%': 2, '^': 3 };
        const out = [], ops = [];
        let prev = null;
        for (let t of tokens) {
            if (/^[\d.]/.test(t)) {
                out.push(parseFloat(t));
                prev = 'num';
            } else if (t === '(') {
                ops.push(t); prev = '(';
            } else if (t === ')') {
                while (ops.length && ops[ops.length - 1] !== '(') out.push(ops.pop());
                if (!ops.length) return null;
                ops.pop(); prev = 'num';
            } else {
                // unary minus/plus
                if ((t === '-' || t === '+') && (prev === null || prev === 'op' || prev === '(')) {
                    out.push(0);
                }
                while (ops.length && ops[ops.length - 1] !== '(' &&
                       prec[ops[ops.length - 1]] >= prec[t] && t !== '^') {
                    out.push(ops.pop());
                }
                ops.push(t); prev = 'op';
            }
        }
        while (ops.length) {
            const op = ops.pop();
            if (op === '(') return null;
            out.push(op);
        }
        const st = [];
        for (let tok of out) {
            if (typeof tok === 'number') { st.push(tok); continue; }
            const b = st.pop(), a = st.pop();
            if (a === undefined || b === undefined) return null;
            switch (tok) {
                case '+': st.push(a + b); break;
                case '-': st.push(a - b); break;
                case '*': st.push(a * b); break;
                case '/': st.push(a / b); break;
                case '%': st.push(a % b); break;
                case '^': st.push(Math.pow(a, b)); break;
            }
        }
        return st.length === 1 && isFinite(st[0]) ? st[0] : null;
    }

    // Returns { display, value } or null.
    function compute(input) {
        const s = input.trim();
        if (!s) return null;

        // "20% of 240"
        let m = s.match(/^([\d.]+)\s*%\s*of\s*([\d.]+)$/i);
        if (m) {
            const v = round(parseFloat(m[1]) / 100 * parseFloat(m[2]));
            return { display: `${v}`, value: v };
        }

        // "10 km to mi"
        m = s.match(/^([\d.]+)\s*(°?[a-z]+)\s*(?:to|in)\s*(°?[a-z]+)$/i);
        if (m) {
            const v = convertUnits(parseFloat(m[1]), m[2], m[3]);
            if (v != null) {
                const r = round(v);
                return { display: `${r} ${m[3]}`, value: r };
            }
            return null;
        }

        // Pure arithmetic — must contain an operator to avoid matching bare numbers.
        if (/^[\d.\s+\-*/%^()]+$/.test(s) && /[+\-*/%^]/.test(s.replace(/^[-+]/, ''))) {
            const v = evalArith(s);
            if (v != null) {
                const r = round(v);
                return { display: `${r}`, value: r };
            }
        }
        return null;
    }

    // ---- State loading -----------------------------------------
    function loadState(cb) {
        chrome.storage.sync.get(['commands', 'pinnedCommands', 'settings', 'snippets', 'macros'], (sync) => {
            chrome.storage.local.get(['commandStats', 'commandHistory'], (local) => {
                cb({
                    customCommands: sync.commands || {},
                    pinned: sync.pinnedCommands || [],
                    settings: Object.assign({}, DEFAULT_SETTINGS, sync.settings || {}),
                    snippets: sync.snippets || [],
                    macros: sync.macros || [],
                    stats: local.commandStats || {},
                    history: local.commandHistory || []
                });
            });
        });
    }

    window.YCP = {
        BUILTIN, CATEGORY_ORDER, DEFAULT_SETTINGS,
        escapeHtml, fuzzyScore, frecency, recordUse,
        compute, convertUnits, evalArith, loadState
    };
})();
