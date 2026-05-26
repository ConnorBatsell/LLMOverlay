import type { SiteAdapter } from './adapters/types';

interface CachedSelection {
  text: string;
  turnIndex: number | null;
  fromAssistant: boolean;
  ts: number;
}

let cache: CachedSelection | null = null;

export function installSelectionCache(adapter: SiteAdapter): void {
  document.addEventListener('selectionchange', () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    const text = sel.toString().trim();
    if (!text) return;
    const anchor = sel.anchorNode;
    if (!anchor) return;
    const fromAssistant = adapter.isAssistantNode(anchor);
    const turnIndex = adapter.findTurnIndex(anchor);
    cache = { text, turnIndex, fromAssistant, ts: Date.now() };
  }, { passive: true });
}

export function readCache(): CachedSelection | null {
  return cache;
}

export function readSelectionLive(): string {
  const sel = window.getSelection();
  return sel ? sel.toString().trim() : '';
}
