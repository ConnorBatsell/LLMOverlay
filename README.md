# llmOverlay

A Chrome extension that adds an "ask about this page in a side panel" workflow to **any web page**, without leaving the page you're reading.

## Workflow

1. Open any web page.
2. Open the side panel (click the extension's toolbar icon). It reads the page so you can ask about it right away.
3. Type a question about the page — or highlight a passage first and press <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>E</kbd> (mac) / <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>E</kbd> to focus the answer on that passage.
4. The answer streams into the side panel, grounded in the page's content. On **chatgpt.com** and **claude.ai** the structured chat transcript is used instead of raw page text for cleaner context.

The side panel keeps a running list of every Q&A from the current tab, persisted to `chrome.storage.session` so the list survives a panel reload but is dropped when the tab closes.

## Provider routing

The provider no longer depends on the site you're on. Pick a default in **Options**; requests go there, falling back to whichever key is set:

| Provider | API |
|---|---|
| Anthropic | `POST /v1/messages` |
| OpenAI | `POST /v1/chat/completions` |

Both calls are streamed (SSE) from the background service worker. Content scripts never see API keys.

## Build

```bash
npm install
npm run build
```

The unpacked extension is written to `dist/`.

## Load in Chrome

1. `chrome://extensions`
2. Toggle **Developer mode** on.
3. Click **Load unpacked** and select `dist/`.
4. Click the extension's **Options** entry. Paste your Anthropic and/or OpenAI API keys. Save.
5. (Optional) Visit `chrome://extensions/shortcuts` to rebind the keybind.

## Layout

```
src/
  background/      service worker: command listener, panel routing, API streaming
  content/         per-tab scripts: site adapters + selection cache
  sidepanel/       chrome.sidePanel React UI
  options/         API-key + model preferences UI
  shared/          message types, storage helpers
```

## Security note

API keys live in `chrome.storage.local`, which is **not encrypted**. Any other extension granted the `storage` permission can read them. Use scoped/restricted keys (especially for OpenAI) and treat this like a desktop password manager, not a vault. A future version may move keys behind a backend proxy.

## Non-goals (v1)

Firefox, Safari, mobile, mixed-provider queries, cross-device sync, image/file/voice handling. (Runs on `chrome://`, extension, and other non-http(s) pages are not supported — the content script can't be injected there.)
