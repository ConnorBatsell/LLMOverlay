import type { SiteAdapter } from './adapters/types';

interface CachedSelection {
  text: string;
  turnIndex: number | null;
  fromAssistant: boolean;
  ts: number;
}

let cache: CachedSelection | null = null;

export function installSelectionCache(adapter: SiteAdapter | null): void {
  document.addEventListener('selectionchange', () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    const text = sel.toString().trim();
    if (!text) return;
    const anchor = sel.anchorNode;
    // Turn/role info only exists on known chat sites; elsewhere the selection is
    // still cached so it can be asked about as plain highlighted text.
    const fromAssistant = anchor && adapter ? adapter.isAssistantNode(anchor) : false;
    const turnIndex = anchor && adapter ? adapter.findTurnIndex(anchor) : null;
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
