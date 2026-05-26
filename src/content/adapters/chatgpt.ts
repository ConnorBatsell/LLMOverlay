// LAST VERIFIED: 2026-05-06
// chatgpt.com message DOM uses [data-message-author-role] on each turn.
import type { SiteAdapter } from './types';
import type { ChatMessage, Role } from '../../shared/messages';

const TURN_SELECTOR = '[data-message-author-role]';

function readTurns(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(TURN_SELECTOR));
}

function turnRole(el: HTMLElement): Role | null {
  const r = el.getAttribute('data-message-author-role');
  if (r === 'user' || r === 'assistant') return r;
  return null;
}

function turnContent(el: HTMLElement): string {
  const md = el.querySelector('.markdown') ?? el.querySelector('[data-message-id]') ?? el;
  return (md.textContent ?? '').trim();
}

export const chatgptAdapter: SiteAdapter = {
  host: 'chatgpt.com',

  getMessages(): ChatMessage[] {
    const out: ChatMessage[] = [];
    for (const el of readTurns()) {
      const role = turnRole(el);
      if (!role) continue;
      const content = turnContent(el);
      if (!content) continue;
      out.push({ role, content });
    }
    return out;
  },

  isAssistantNode(node: Node): boolean {
    const el = node instanceof Element ? node : node.parentElement;
    if (!el) return false;
    const turn = el.closest<HTMLElement>(TURN_SELECTOR);
    return !!turn && turnRole(turn) === 'assistant';
  },

  findTurnIndex(node: Node): number | null {
    const el = node instanceof Element ? node : node.parentElement;
    if (!el) return null;
    const turn = el.closest<HTMLElement>(TURN_SELECTOR);
    if (!turn) return null;
    const turns = readTurns();
    const idx = turns.indexOf(turn);
    return idx >= 0 ? idx : null;
  }
};
