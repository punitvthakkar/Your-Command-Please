chrome.action.onClicked.addListener((tab) => {
    chrome.action.openPopup();
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case 'PIN_TAB':
            chrome.tabs.update({ pinned: true });
            break;
        case 'UNPIN_TAB':
            chrome.tabs.update({ pinned: false });
            break;
        case 'NEW_TAB':
            chrome.tabs.create({});
            break;
        case 'NEW_WINDOW':
            chrome.windows.create({});
            break;
        case 'SCREENSHOT':
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                if (tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, {action: "startScreenshot"}, function(response) {
                        if (chrome.runtime.lastError) {
                            console.error("Error sending message:", chrome.runtime.lastError);
                        }
                    });
                } else {
                    console.error("No active tab found");
                }
            });
            break;
        case 'mute_tab':
            chrome.tabs.update(null, { muted: true });
            break;
        case 'unmute_tab':
            chrome.tabs.update(null, { muted: false });
            break;
        case 'clear_cache':
            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                chrome.browsingData.remove({ 
                    since: 0
                }, {
                    cache: true
                }, function () {
                    chrome.tabs.reload(tabs[0].id);
                });
            });
            break;
        case 'clear_cookies':
            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                chrome.cookies.getAll({ url: tabs[0].url }, function (cookies) {
                    for (let i = 0; i < cookies.length; i++) {
                        chrome.cookies.remove({ url: tabs[0].url, name: cookies[i].name });
                    }
                    chrome.tabs.reload(tabs[0].id);
                });
            });
            break;
        case 'bookmark':
            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    function: () => document.title
                }, function(results) {
                    chrome.bookmarks.create({
                        title: results[0].result,
                        url: tabs[0].url
                    });
                });
            });
            break;
        case 'task_manager':
            chrome.management.getSelf(function(result) {
                chrome.tabs.create({ url: "chrome://extensions/" });
            });
            break;
        case 'link_extract':
            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                chrome.tabs.sendMessage(tabs[0].id, { action: "extractLinks" });
            });
            break;
        case 'new_command':
            chrome.storage.local.get(['commands'], (result) => {
                let commands = result.commands || {};
                chrome.tabs.create({ url: 'popup.html?mode=new_command' }, (tab) => {
                    chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo, tab) {
                        if (tabId === tab.id && changeInfo.status === 'complete') {
                            chrome.tabs.onUpdated.removeListener(listener);
                            chrome.tabs.sendMessage(tabId, { action: 'get_new_command' }, (response) => {
                                if (response) {
                                    commands[response.commandName] = response.commandUrl;
                                    chrome.storage.local.set({ commands: commands });
                                }
                            });
                        }
                    });
                });
            });
            break;
    }
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "captureArea") {
        chrome.tabs.captureVisibleTab(null, {format: 'png'}, function(dataUrl) {
            chrome.tabs.sendMessage(sender.tab.id, {
                action: "processScreenshot",
                dataUrl: dataUrl,
                area: request.area
            });
        });
    }
});