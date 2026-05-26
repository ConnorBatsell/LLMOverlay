import type { PanelInbound, PanelOutbound } from '../shared/messages';

export interface PanelPort {
  send: (msg: PanelOutbound) => void;
  close: () => void;
}

export function connectPanel(onMessage: (msg: PanelInbound) => void): PanelPort {
  const port = chrome.runtime.connect({ name: 'panel' });

  port.onMessage.addListener((msg: PanelInbound) => onMessage(msg));

  let heartbeat: ReturnType<typeof setInterval> | null = null;
  heartbeat = setInterval(() => {
    try { port.postMessage({ type: 'heartbeat' } satisfies PanelOutbound); } catch { /* ignore */ }
  }, 20_000);

  port.onDisconnect.addListener(() => {
    if (heartbeat) clearInterval(heartbeat);
  });

  return {
    send: msg => {
      try { port.postMessage(msg); } catch { /* ignore */ }
    },
    close: () => {
      if (heartbeat) clearInterval(heartbeat);
      port.disconnect();
    }
  };
}

export async function getActiveTabId(): Promise<number | null> {
  try {
    const [t] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    return t?.id ?? null;
  } catch {
    return null;
  }
}
