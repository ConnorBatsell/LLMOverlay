// LAST VERIFIED: 2026-05-06
// claude.ai turns: user messages have data-testid="user-message"; assistant turns
// live in containers with the .font-claude-message class on the rendered body.
import type { SiteAdapter } from './types';
import type { ChatMessage, Role } from '../../shared/messages';

const USER_SELECTOR = '[data-testid="user-message"]';
const ASSISTANT_SELECTOR = '.font-claude-message, [data-is-streaming]';

interface Turn {
  el: HTMLElement;
  role: Role;
}

function readTurns(): Turn[] {
  const nodes = Array.from(
    document.querySelectorAll<HTMLElement>(`${USER_SELECTOR}, ${ASSISTANT_SELECTOR}`)
  );
  const turns: Turn[] = [];
  for (const el of nodes) {
    const role: Role = el.matches(USER_SELECTOR) ? 'user' : 'assistant';
    if (role === 'assistant') {
      const isInsideUser = el.closest(USER_SELECTOR);
      if (isInsideUser) continue;
    }
    turns.push({ el, role });
  }
  turns.sort((a, b) => {
    const cmp = a.el.compareDocumentPosition(b.el);
    if (cmp & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
    if (cmp & Node.DOCUMENT_POSITION_PRECEDING) return 1;
    return 0;
  });
  return turns;
}

function turnContent(el: HTMLElement): string {
  return (el.textContent ?? '').trim();
}

export const claudeAdapter: SiteAdapter = {
  host: 'claude.ai',

  getMessages(): ChatMessage[] {
    const out: ChatMessage[] = [];
    for (const t of readTurns()) {
      const content = turnContent(t.el);
      if (!content) continue;
      out.push({ role: t.role, content });
    }
    return out;
  },

  isAssistantNode(node: Node): boolean {
    const el = node instanceof Element ? node : node.parentElement;
    if (!el) return false;
    const inAssistant = el.closest<HTMLElement>(ASSISTANT_SELECTOR);
    const inUser = el.closest<HTMLElement>(USER_SELECTOR);
    return !!inAssistant && !inUser;
  },

  findTurnIndex(node: Node): number | null {
    const el = node instanceof Element ? node : node.parentElement;
    if (!el) return null;
    const container =
      el.closest<HTMLElement>(USER_SELECTOR) ??
      el.closest<HTMLElement>(ASSISTANT_SELECTOR);
    if (!container) return null;
    const turns = readTurns();
    const idx = turns.findIndex(t => t.el === container);
    return idx >= 0 ? idx : null;
  }
};
