# llmOverlay

A Chrome extension that adds a "highlight → explain in a side panel" workflow to **chatgpt.com** and **claude.ai**, without polluting the main chat thread

## Workflow

1. Open a chat in chatgpt.com or claude.ai.
2. Highlight any word or phrase in an assistant's reply.
3. Press <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>E</kbd> (mac) or <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>E</kbd>.
4. The Chrome side panel opens with a streamed explanation, grounded in the **full chat transcript** scraped from the page. The original chat is untouched.

The side panel keeps a running list of every Q&A from the current tab, persisted to `chrome.storage.session` so the list survives a panel reload but is dropped when the tab closes.

## Provider routing

| Site | API |
|---|---|
| `claude.ai` | Anthropic — `POST /v1/messages` |
| `chatgpt.com` | OpenAI — `POST /v1/chat/completions` |

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

Firefox, Safari, mobile, sites other than chatgpt.com / claude.ai, mixed-provider queries, cross-device sync, image/file/voice handling.
1212
