# Chrome Web Store listing — llmOverlay

Copy/paste material for the Developer Dashboard. Edit anything in _italics_.

---

## Product name
llmOverlay

## Summary (≤132 chars)
Highlight any ChatGPT or Claude reply and get an instant side-panel explanation grounded in that conversation.

## Category
Productivity

## Language
English

## Detailed description
llmOverlay turns any long ChatGPT or Claude answer into something you can interrogate
in place. Select a passage you don't understand, hit the keyboard shortcut
(Ctrl+Shift+E / ⌘+Shift+E), and a side panel opens with a focused explanation that
uses the surrounding conversation as context. Ask follow-up questions and it keeps
the thread.

Features
• Highlight-to-explain on chatgpt.com and claude.ai
• Side-panel Q&A grounded in the actual transcript, not generic answers
• Follow-up questions with session memory
• Bring your own API key — Anthropic (Claude) or OpenAI (GPT)
• One-click Clear to wipe the panel history

Privacy
llmOverlay has no server of its own. Your highlighted text and the chat transcript
are sent only to the provider you configured (Anthropic or OpenAI), using your own
API key. API keys and history stay in your browser. Full policy:
https://connorbatsell.github.io/LLMOverlay/privacy.html

You need your own Anthropic or OpenAI API key, entered on the extension's options page.

---

## Privacy practices tab

### Single purpose
Let users highlight text in an LLM chat (ChatGPT/Claude) and receive a contextual
explanation of that passage in a side panel.

### Permission justifications

- **sidePanel** — The core UI. Explanations and the Q&A interface are rendered in
  Chrome's side panel next to the chat.

- **storage** — Stores the user's API key and model preference locally
  (`storage.local`) and the per-tab Q&A history and captured highlight
  (`storage.session`, cleared when the browser closes). No remote storage.

- **activeTab** — Lets the extension read the highlighted text and visible
  transcript from the tab the user is actively viewing when they invoke the
  explain command.

- **tabs** — Used to identify the active LLM tab and associate the side panel and
  its session history with the correct tab id when the explain shortcut fires and
  when the panel reconnects.

- **alarms** — Keeps the background service worker alive during a streaming
  response so long answers aren't cut off when the worker would otherwise idle out.

- **Host permission `https://api.anthropic.com/*`** — Sends the highlighted passage,
  transcript, and question to the Anthropic API to generate the explanation, using
  the user's own key.

- **Host permission `https://api.openai.com/*`** — Same as above, for users who
  configure an OpenAI key instead.

- **Content scripts on `https://chatgpt.com/*` and `https://claude.ai/*`** — Read
  the highlighted selection and chat transcript on the two supported sites so the
  explanation can be grounded in the conversation. The extension runs on no other
  sites.

### Data usage disclosures (check these boxes)
- Collects **Website content** (the highlighted text + chat transcript) — used only
  to generate the requested explanation, transmitted to the chosen LLM provider.
- Collects **Authentication information** (the API key) — stored locally, sent only
  to the provider for auth.
- **Not sold or transferred to third parties** beyond the provider API call the user
  initiates.
- **Not used for** advertising, creditworthiness, or any purpose unrelated to the
  single purpose above.

### Remote code
No. All executable code is bundled in the package; no remote scripts are loaded.

### Privacy policy URL
https://connorbatsell.github.io/LLMOverlay/privacy.html

---

## Graphic assets still needed (you must create these images)
- **Store icon:** 128×128 PNG — you can reuse `public/icons/icon128.png`.
- **Screenshots:** at least 1, sized **1280×800** or **640×400** PNG/JPEG. Capture
  the side panel explaining a highlighted passage on claude.ai or chatgpt.com.
- _(Optional)_ Small promo tile 440×280.

## Distribution
- Visibility: _Public / Unlisted_ (your choice)
- Pricing: Free
- Regions: All
