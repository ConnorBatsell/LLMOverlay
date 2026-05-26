import { pickAdapter } from './adapters';
import { installSelectionCache, readCache, readSelectionLive } from './selectionCache';
import type { ContentRequest, ContentResponse } from '../shared/messages';

const adapter = pickAdapter();

if (adapter) {
  installSelectionCache(adapter);

  chrome.runtime.onMessage.addListener((msg: ContentRequest, _sender, sendResponse) => {
    if (msg.type !== 'capture') return;
    try {
      const cached = readCache();
      const live = readSelectionLive();
      const selection = (cached?.text ?? '') || live;

      if (!selection) {
        const resp: ContentResponse = {
          type: 'capture-error',
          reason: 'No text is selected. Highlight a passage in the chat first.'
        };
        sendResponse(resp);
        return true;
      }

      const messages = adapter.getMessages();
      const resp: ContentResponse = {
        type: 'capture-result',
        payload: {
          selection,
          messages,
          host: adapter.host,
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
}
