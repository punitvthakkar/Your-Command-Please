const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);

const elements = {
    commandInput: $('#commandInput'),
    suggestions: $('#suggestions'),
    autofill: $('#autofill'),
    mainContainer: $('#main-container'),
    newCommandContainer: $('#new-command-container'),
    newCommandName: $('#newCommandName'),
    newCommandUrl: $('#newCommandUrl'),
    saveNewCommand: $('#saveNewCommand'),
    newSearchCommandContainer: $('#new-search-command-container'),
    newSearchCommandName: $('#newSearchCommandName'),
    newSearchCommandUrl: $('#newSearchCommandUrl'),
    saveNewSearchCommand: $('#saveNewSearchCommand')
};

let commands = {
    'new google doc': 'https://docs.new',
    'new doc': 'https://docs.new',
    'new google sheet': 'https://sheets.new',
    'new sheet': 'https://sheets.new',
    'new google slides': 'https://slides.new',
    'new slides': 'https://slides.new',
    'new notion doc': 'https://www.notion.so/new',
    'new figma project': 'https://www.figma.com/new',
    'new replit project': 'https://replit.com/new',
    'new gmail message': 'https://mail.google.com/mail/u/0/#compose',
    'history': 'chrome://history',
    'downloads': 'chrome://downloads',
    'settings': 'chrome://settings',
    'passwords': 'chrome://password-manager/passwords',
    'pin': 'PIN_TAB',
    'unpin': 'UNPIN_TAB',
    'new tab': 'NEW_TAB',
    'new window': 'NEW_WINDOW',
    'extension manager': 'chrome://extensions',
    'bookmark manager': 'chrome://bookmarks',
    'screenshot': 'SCREENSHOT',
    'mute tab': 'mute_tab',
    'unmute tab': 'unmute_tab',
    'clear cache': 'clear_cache',
    'clear cookies': 'clear_cookies',
    'save bookmark': 'bookmark',
    'task manager': 'task_manager',
    'link extract': 'link_extract',
    'search amazon': 'amazon',
    'search youtube': 'youtube',
    'search flipkart': 'flipkart',
    'search spotify': 'spotify',
    'search twitter': 'twitter',
    'search reddit': 'reddit',
    'search bing': 'bing',
    'search gmail': 'gmail',
    'new command': 'new_command',
    'new search command': 'new_search_command',
    'new word file': 'https://docx.new',
    'new powerpoint presentation': 'https://pptx.new',
    'new excel file': 'https://excel.new',
    'new google calendar event': 'https://cal.new'
};

let selectedIndex = -1;
let commandHistory = [];
let pinnedCommands = [];
let visibleStartIndex = 0;
let visibleEndIndex = 0;

function loadData() {
    chrome.storage.local.get(['commandHistory', 'commands', 'pinnedCommands'], (result) => {
        commandHistory = result.commandHistory || [];
        commands = {...commands, ...result.commands};
        pinnedCommands = result.pinnedCommands || [];
        showAllCommands();
    });
}

function saveData() {
    chrome.storage.local.set({ commandHistory, commands, pinnedCommands });
}

function showSuggestions(input) {
    const commandKeys = Object.keys(commands);
    const matchedCommands = commandKeys.filter(cmd => cmd.includes(input.toLowerCase()));
    const pinnedHtml = pinnedCommands.map(cmd => createCommandHtml(cmd, true)).join('');
    const unpinnedHtml = matchedCommands
        .filter(cmd => !pinnedCommands.includes(cmd))
        .map(cmd => createCommandHtml(cmd, false))
        .join('');
    elements.suggestions.innerHTML = pinnedHtml + unpinnedHtml;
    selectedIndex = -1;
    updateVisibleRange();
}

function createCommandHtml(cmd, isPinned) {
    const pinIcon = isPinned ? '🔒' : '📌';
    return `<div class="command" data-cmd="${cmd}">
        <span class="command-text">${cmd}</span>
        <span class="command-actions">
            <span class="pin-icon" data-cmd="${cmd}">${pinIcon}</span>
            <span class="delete-icon" data-cmd="${cmd}">🗑️</span>
        </span>
    </div>`;
}

function showAutofill(input) {
    if (input.length >= 1) {
        const commandKeys = Object.keys(commands);
        const bestMatch = commandHistory.find(cmd => cmd.startsWith(input.toLowerCase())) ||
                          commandKeys.find(cmd => cmd.startsWith(input.toLowerCase()));
        elements.autofill.textContent = bestMatch || '';
        elements.autofill.style.display = bestMatch ? 'block' : 'none';
    } else {
        elements.autofill.style.display = 'none';
    }
}

function executeCommand(cmd) {
    const action = commands[cmd.toLowerCase()];
    if (action) {
        if (action.startsWith('http') || action.startsWith('chrome://')) {
            chrome.tabs.create({ url: action });
        } else if (action === 'SCREENSHOT') {
            chrome.runtime.sendMessage({ action: 'SCREENSHOT' });
        } else if (['amazon', 'youtube', 'flipkart', 'spotify', 'twitter', 'reddit', 'bing', 'gmail'].includes(action)) {
            const searchTerm = prompt("Enter search term:");
            if (searchTerm) {
                const searchUrls = {
                    amazon: `https://www.amazon.com/s?k=${searchTerm}`,
                    youtube: `https://www.youtube.com/results?search_query=${searchTerm.replace(/ /g, '+')}`,
                    flipkart: `https://www.flipkart.com/search?q=${searchTerm.replace(/ /g, '%20')}`,
                    reddit: `https://www.reddit.com/search?q=${searchTerm.replace(/ /g, '+')}`,
                    bing: `https://www.bing.com/search?q=${searchTerm.replace(/ /g, '+')}`,
                    twitter: `https://x.com/search?q=${searchTerm.replace(/ /g, '%20')}&src=typed_query`,
                    spotify: `https://open.spotify.com/search/${searchTerm.replace(/ /g, '%20')}`,
                    gmail: `https://mail.google.com/mail/u/0/#search/${searchTerm.replace(/ /g, '+')}`
                };
                chrome.tabs.create({ url: searchUrls[action] });
            }
        } else if (action === 'new_command') {
            showNewCommandInterface();
        } else if (action === 'new_search_command') {
            showNewSearchCommandInterface();
        } else if (action.startsWith('SEARCH:')) {
            const searchTerm = prompt("Enter search term:");
            if (searchTerm) {
                const searchUrl = action.replace('SEARCH:', '').replace('{searchTerm}', encodeURIComponent(searchTerm));
                chrome.tabs.create({ url: searchUrl });
            }
        } else {
            chrome.runtime.sendMessage({ action: action });
        }
        updateCommandHistory(cmd.toLowerCase());
        if (action !== 'new_command' && action !== 'new_search_command') {
            window.close();
        }
    }
}

function showNewCommandInterface() {
    elements.mainContainer.style.display = 'none';
    elements.newCommandContainer.style.display = 'block';
    elements.newSearchCommandContainer.style.display = 'none';
    elements.newCommandName.focus();
}

function showNewSearchCommandInterface() {
    elements.mainContainer.style.display = 'none';
    elements.newCommandContainer.style.display = 'none';
    elements.newSearchCommandContainer.style.display = 'block';
    elements.newSearchCommandName.focus();
}

function updateCommandHistory(cmd) {
    commandHistory = [cmd, ...commandHistory.filter(c => c !== cmd)].slice(0, 10);
    saveData();
}

function updateVisibleRange() {
    const container = elements.suggestions;
    const suggestions = container.children;
    const containerTop = container.scrollTop;
    const containerBottom = containerTop + container.clientHeight;

    visibleStartIndex = Array.from(suggestions).findIndex(el => el.offsetTop + el.offsetHeight > containerTop);
    visibleEndIndex = Array.from(suggestions).findIndex(el => el.offsetTop > containerBottom) - 1;
    if (visibleEndIndex === -2) visibleEndIndex = suggestions.length - 1;
}

function navigateSuggestions(direction) {
    const suggestionElements = elements.suggestions.children;
    if (suggestionElements.length === 0) return;

    if (selectedIndex === -1) {
        selectedIndex = direction > 0 ? visibleStartIndex : visibleEndIndex;
    } else {
        selectedIndex = (selectedIndex + direction + suggestionElements.length) % suggestionElements.length;
    }

    Array.from(suggestionElements).forEach((suggestion, index) => {
        if (index === selectedIndex) {
            suggestion.classList.add('selected');
            elements.commandInput.value = suggestion.querySelector('.command-text').textContent.trim();
            elements.autofill.textContent = suggestion.querySelector('.command-text').textContent.trim();
            ensureVisibility(suggestion);
        } else {
            suggestion.classList.remove('selected');
        }
    });
}

function ensureVisibility(element) {
    const container = elements.suggestions;
    const containerHeight = container.clientHeight;
    const elementHeight = element.clientHeight;
    const elementTop = element.offsetTop;
    const elementBottom = elementTop + elementHeight;

    if (elementTop < container.scrollTop) {
        container.scrollTop = elementTop;
    } else if (elementBottom > container.scrollTop + containerHeight) {
        container.scrollTop = elementBottom - containerHeight;
    }

    updateVisibleRange();
}

const debouncedShowSuggestions = debounce((input) => {
    showSuggestions(input);
    showAutofill(input);
}, 50);

function saveNewCommandFunction() {
    const commandName = elements.newCommandName.value.trim().toLowerCase();
    const commandUrl = elements.newCommandUrl.value.trim();
    if (commandName && commandUrl) {
        commands[commandName] = commandUrl;
        saveData();
        showSavedConfirmation(commandName);
    }
}

function saveNewSearchCommandFunction() {
    const commandName = elements.newSearchCommandName.value.trim().toLowerCase();
    let searchUrl = elements.newSearchCommandUrl.value.trim();
    if (commandName && searchUrl) {
        searchUrl = searchUrl.replace('abc%20xyz%20pqr', '{searchTerm}')
                             .replace('abc+xyz+pqr', '{searchTerm}')
                             .replace('abc%2Bxyz%2Bpqr', '{searchTerm}')
                             .replace('abc xyz pqr', '{searchTerm}');
        commands[commandName] = `SEARCH:${searchUrl}`;
        saveData();
        showSavedConfirmation(commandName);
    }
}

function showSavedConfirmation(commandName) {
    const confirmationMessage = document.createElement('div');
    confirmationMessage.textContent = `Command "${commandName}" saved successfully!`;
    confirmationMessage.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: #4CAF50;
        color: white;
        padding: 15px;
        border-radius: 5px;
        text-align: center;
        z-index: 1000;
    `;
    document.body.appendChild(confirmationMessage);
    setTimeout(() => {
        document.body.removeChild(confirmationMessage);
        resetInterface();
    }, 1500);
}

function resetInterface() {
    elements.newCommandName.value = '';
    elements.newCommandUrl.value = '';
    elements.newSearchCommandName.value = '';
    elements.newSearchCommandUrl.value = '';
    elements.mainContainer.style.display = 'block';
    elements.newCommandContainer.style.display = 'none';
    elements.newSearchCommandContainer.style.display = 'none';
    elements.commandInput.value = '';
    showAllCommands();
    elements.commandInput.focus();
}

function deleteCommand(cmd) {
    delete commands[cmd];
    pinnedCommands = pinnedCommands.filter(c => c !== cmd);
    saveData();
    showAllCommands();
}

function togglePinCommand(cmd) {
    if (pinnedCommands.includes(cmd)) {
        pinnedCommands = pinnedCommands.filter(c => c !== cmd);
    } else {
        if (pinnedCommands.length >= 3) {
            alert('You can pin a maximum of 3 commands.');
            return;
        }
        pinnedCommands.unshift(cmd);
    }
    saveData();
    showAllCommands();
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

function showAllCommands() {
    showSuggestions('');
}

elements.commandInput.addEventListener('input', (e) => debouncedShowSuggestions(e.target.value));

elements.suggestions.addEventListener('click', (e) => {
    const cmd = e.target.closest('.command')?.dataset.cmd;
    if (cmd) {
        if (e.target.classList.contains('delete-icon')) {
            deleteCommand(cmd);
        } else if (e.target.classList.contains('pin-icon')) {
            togglePinCommand(cmd);
        } else {
            executeCommand(cmd);
        }
    }
});

elements.commandInput.addEventListener('keydown', (e) => {
    switch (e.key) {
        case 'Enter':
            const cmd = elements.autofill.style.display === 'block' ? elements.autofill.textContent :
                        document.querySelector('#suggestions .selected')?.querySelector('.command-text').textContent.trim() ||
                        e.target.value;
            executeCommand(cmd);
            break;
        case 'ArrowUp':
            e.preventDefault();
            navigateSuggestions(-1);
            break;
        case 'ArrowDown':
            e.preventDefault();
            navigateSuggestions(1);
            break;
        case 'Tab':
            e.preventDefault();
            if (elements.autofill.style.display === 'block') {
                elements.commandInput.value = elements.autofill.textContent;
                elements.autofill.style.display = 'none';
                showSuggestions(elements.commandInput.value);
            }
            break;
    }
});

elements.newCommandName.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') elements.newCommandUrl.focus();
});

elements.newCommandUrl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveNewCommandFunction();
});

elements.newSearchCommandName.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') elements.newSearchCommandUrl.focus();
});

elements.newSearchCommandUrl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveNewSearchCommandFunction();
});

elements.suggestions.addEventListener('scroll', updateVisibleRange);

elements.saveNewCommand.addEventListener('click', saveNewCommandFunction);
elements.saveNewSearchCommand.addEventListener('click', saveNewSearchCommandFunction);

window.onload = () => {
    elements.commandInput.focus();
    loadData();
};

// Check for system dark mode preference
if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.body.classList.add('dark-mode');
}

// Listen for changes in system dark mode preference
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (e.matches) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
});