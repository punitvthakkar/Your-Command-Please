# Your Command Please

A Chrome extension that lets you control your browser with plain-text commands — no mouse required.

Open the command palette with **⌘⇧Space** (Mac) or **Ctrl+Shift+Space** (Windows/Linux), type what you want, and hit Enter.

---

## Screenshots

| Main popup | Dark mode with search | Add custom command |
|---|---|---|
| ![Main popup](screenshot-main.png) | ![Dark mode](screenshot-dark-search.png) | ![Add command](screenshot-add-command.png) |

---

## Built-in commands

| Command | What it does |
|---|---|
| `new google doc` / `new sheet` / `new slides` | Open a new Google Doc/Sheet/Slides |
| `new word file` / `new excel file` / `new powerpoint presentation` | Open a new Office file |
| `new gmail message` | Compose a new email |
| `new google calendar event` | Create a calendar event |
| `new notion doc` / `new figma project` / `new replit project` | Open new file in Notion/Figma/Replit |
| `history` / `downloads` / `settings` / `passwords` | Jump to Chrome pages |
| `extension manager` / `bookmark manager` | Jump to Chrome management pages |
| `new tab` / `new window` | Open a new tab or window |
| `pin` / `unpin` | Pin or unpin the current tab |
| `mute tab` / `unmute tab` | Toggle audio on the current tab |
| `save bookmark` | Bookmark the current page |
| `clear cache` / `clear cookies` | Clear cache or cookies and reload |
| `screenshot` | Capture a screenshot of the current page |
| `task manager` | Open the extensions manager |
| `link extract` | Extract all links from the current page |
| `search youtube` / `search amazon` / `search reddit` / … | Search a site (prompts for a search term) |

---

## Custom commands

### Add a URL command
Type `new command` → enter a name and the URL it should open.

### Add a search command
Type `new search command` → enter a name, then paste the search URL from the target site (search for `abc xyz pqr` on that site first and paste the resulting URL — the extension automatically extracts the search template).

---

## Pinning & organising

- Click the **📌** icon next to any command to pin it to the top of the list (max 3 pinned).
- Click **🗑️** to delete a command.
- Use **↑ / ↓** arrow keys to navigate suggestions.
- Press **Tab** to autocomplete the highlighted suggestion.

---

## Installation

1. Download or clone this repository.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the `Your Command Please` folder.
5. The extension icon will appear in your toolbar — or just press **⌘⇧Space** / **Ctrl+Shift+Space** to open it directly.

---

## Keyboard shortcut

The default shortcut is **⌘⇧Space** on Mac and **Ctrl+Shift+Space** on other platforms. You can change it at `chrome://extensions/shortcuts`.
