import type { PageContext, ChatMessage } from '../shared/messages';
import { pickAdapter } from './adapters';

// Cap the extracted page text so a huge page can't blow the request size. The
// prompt builder truncates again for the model; this is just a sane ceiling.
const MAX_TEXT_CHARS = 40_000;

/**
 * Snapshot whatever page the user is on: title, URL, and readable text. On a
 * known chat site (ChatGPT/Claude) we additionally pull the structured
 * transcript so the model gets clean turns instead of scraped text.
 */
export function extractPageContext(): PageContext {
  const adapter = pickAdapter();
  const messages = adapter ? safeMessages(adapter) : undefined;
  return {
    title: (document.title || location.hostname).trim(),
    url: location.href,
    host: location.hostname,
    text: extractReadableText(),
    messages: messages && messages.length ? messages : undefined
  };
}

function safeMessages(adapter: { getMessages(): ChatMessage[] }): ChatMessage[] | undefined {
  try {
    return adapter.getMessages();
  } catch {
    return undefined;
  }
}

function extractReadableText(): string {
  // Prefer the main content region when the page marks one; fall back to body.
  // innerText already skips script/style/hidden nodes and reflects on-screen text.
  const root =
    document.querySelector<HTMLElement>('main') ??
    document.querySelector<HTMLElement>('article') ??
    document.body;
  if (!root) return '';
  const raw = root.innerText ?? root.textContent ?? '';
  const text = raw
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return text.length > MAX_TEXT_CHARS
    ? text.slice(0, MAX_TEXT_CHARS) + '\n…[page truncated]'
    : text;
}
