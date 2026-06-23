# llmOverlay — Privacy Policy

_Last updated: 2026-06-23_

llmOverlay is a Chrome extension that lets you highlight text inside an LLM chat
(ChatGPT or Claude) and get a side-panel explanation grounded in that conversation.
This policy explains exactly what data the extension touches and where it goes.

## Summary

- llmOverlay has **no backend server of its own.** It does not collect, transmit,
  or sell your data to the developer.
- The only network requests it makes are **directly from your browser to the LLM
  provider you configured** — Anthropic (`api.anthropic.com`) or OpenAI
  (`api.openai.com`) — using **your own API key.**
- Everything else stays **on your device** in Chrome's extension storage.

## What data is processed

When you trigger an explanation (keyboard shortcut or the side-panel question box),
the extension reads, from the active ChatGPT/Claude tab:

- the **passage you highlighted**, and
- the **surrounding chat transcript** (truncated to roughly 24,000 characters),
- your **typed question**, if any, and recent prior questions/answers in that tab's session.

This content is sent **only** to the LLM provider's API to generate the answer.

## What is stored, and where

- **API keys** — stored in `chrome.storage.local` on your device so the extension
  can authenticate to the provider. They are never sent anywhere except to that
  provider's API as the `Authorization` header.
- **Question/answer history and the captured highlight + transcript** — stored in
  `chrome.storage.session`, which Chrome clears automatically when the browser
  closes. The in-panel **Clear** button wipes it on demand.

No data is written to any remote database, analytics service, or developer-operated server.

## Third-party processing

Text you submit for explanation is processed by whichever provider you choose:

- **Anthropic** — see https://www.anthropic.com/legal/privacy
- **OpenAI** — see https://openai.com/policies/privacy-policy

Their handling of that data is governed by their own policies and your account
settings with them.

## What the extension does NOT do

- No analytics, telemetry, tracking, or advertising.
- No selling or sharing of data with third parties (beyond the provider API call
  you initiate).
- No access to pages other than `chatgpt.com` and `claude.ai`.

## Permissions

See `store-assets/STORE_LISTING.md` for a per-permission justification. In short,
permissions are scoped to reading the active LLM chat tab, storing your settings
and session history locally, and calling the two provider APIs.

## Contact

Questions about this policy: jbatsell65@gmail.com
