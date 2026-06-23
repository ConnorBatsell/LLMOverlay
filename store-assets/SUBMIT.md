# Submission checklist — llmOverlay → Chrome Web Store

The upload package is built at repo root: **`llmOverlay-0.1.0.zip`**
(rebuild any time with `npm run build`, then re-zip the `dist/` folder).

## Steps
1. Go to https://chrome.google.com/webstore/devconsole (sign in with the account
   that paid the $5 fee).
2. **Add new item** → upload `llmOverlay-0.1.0.zip`.
3. **Store listing** tab — paste fields from `STORE_LISTING.md`. Upload:
   - Store icon 128×128 (reuse `public/icons/icon128.png`).
   - At least one 1280×800 or 640×400 screenshot (see below).
4. **Privacy practices** tab — paste the single purpose, permission justifications,
   tick the data-usage boxes, answer "No remote code", and paste the privacy
   policy URL: https://connorbatsell.github.io/LLMOverlay/privacy.html (already
   live via GitHub Pages from `docs/`).
5. **Distribution** — choose visibility (Public/Unlisted), free, all regions.
6. **Save draft → Submit for review.**

## You still have to do by hand (can't be automated here)
- [ ] Take 1+ screenshots of the panel in action (1280×800).
- [x] ~~Host the privacy policy publicly~~ — live at
      https://connorbatsell.github.io/LLMOverlay/privacy.html
- [ ] Confirm the API-key options page works after a fresh install.

## Smoke-test before submitting
1. `chrome://extensions` → enable Developer mode → **Load unpacked** → select the
   `dist/` folder.
2. Open the options page, enter an Anthropic or OpenAI key.
3. On claude.ai or chatgpt.com, highlight a passage, press ⌘+Shift+E, confirm the
   side panel streams an answer.
4. If it all works, the zip from the same `dist/` is what you upload.

## Notes / likely review feedback
- Sending chat text to a third-party API is fine but reviewers will read the
  permission justifications closely — they're written to match the actual behavior.
- `tabs` is the broadest permission requested; it's used only to map the panel/
  session to the active tab id. If review pushes back, this is the one to defend or
  consider dropping.
- Version is `0.1.0` (from package.json). Bump it for every resubmission.
