import { pickAdapter } from './adapters';
import { extractPageContext } from './pageContext';
import { installSelectionCache, readCache, readSelectionLive } from './selectionCache';
import type { ContentRequest, ContentResponse } from '../shared/messages';

// Runs on every http(s) page. A site adapter (ChatGPT/Claude) is used when
// available for clean transcript turns; otherwise we fall back to the generic
// page-text extractor so any page can be asked about.
const adapter = pickAdapter();
installSelectionCache(adapter);

chrome.runtime.onMessage.addListener((msg: ContentRequest, _sender, sendResponse) => {
  if (msg.type !== 'capture') return;
  try {
    const cached = readCache();
    const live = readSelectionLive();
    const selection = (cached?.text ?? '') || live;

    const resp: ContentResponse = {
      type: 'capture-result',
      payload: {
        // May be '' — that means "ask about the whole page", which is fine.
        selection,
        page: extractPageContext(),
        highlightTurnIndex: cached?.turnIndex ?? null
      }
    };
    sendResponse(resp);
  } catch (err) {
    const resp: ContentResponse = {
      type: 'capture-error',
      reason: err instanceof Error ? err.message : String(err)
    };
    sendResponse(resp);
  }
  return true;
});
