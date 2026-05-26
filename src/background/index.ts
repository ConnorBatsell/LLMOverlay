import type {
  ContentRequest,
  ContentResponse,
  PanelInbound,
  PanelOutbound,
  QAEntry
} from '../shared/messages';
import { loadApiKeys, loadModelPrefs, loadTabHistory, saveTabHistory } from '../shared/storage';
import { SYSTEM_PROMPT, buildUserMessage } from './promptBuilder';
import { pickProvider, runStream } from './providerClient';
import { startKeepAlive, stopKeepAlive } from './keepAlive';

interface PanelConn {
  port: chrome.runtime.Port;
  tabId: number | null;
}

const panelConns = new Map<number, PanelConn>();
const activeStreams = new Map<string, AbortController>();
const panelWaiters = new Map<number, Array<() => void>>();

let panelSeq = 0;

function notePanelReady(tabId: number): void {
  const queue = panelWaiters.get(tabId);
  if (!queue) return;
  panelWaiters.delete(tabId);
  for (const resolve of queue) resolve();
}

function waitForPanel(tabId: number, timeoutMs = 1500): Promise<void> {
  for (const conn of panelConns.values()) {
    if (conn.tabId === tabId) return Promise.resolve();
  }
  return new Promise<void>(resolve => {
    const queue = panelWaiters.get(tabId) ?? [];
    queue.push(resolve);
    panelWaiters.set(tabId, queue);
    setTimeout(() => {
      const list = panelWaiters.get(tabId);
      if (!list) return;
      const i = list.indexOf(resolve);
      if (i >= 0) list.splice(i, 1);
      if (list.length === 0) panelWaiters.delete(tabId);
      resolve();
    }, timeoutMs);
  });
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch(err => console.warn('[llmOverlay] setPanelBehavior failed', err));
});

chrome.runtime.onConnect.addListener(port => {
  if (port.name !== 'panel') return;
  const connId = ++panelSeq;
  const conn: PanelConn = { port, tabId: null };
  panelConns.set(connId, conn);

  port.onMessage.addListener(async (msg: PanelOutbound) => {
    if (msg.type === 'panel-ready') {
      conn.tabId = msg.tabId;
      if (msg.tabId != null) {
        const entries = await loadTabHistory(msg.tabId);
        if (entries.length) post(port, { type: 'rehydrate', entries });
        notePanelReady(msg.tabId);
      }
    } else if (msg.type === 'retry') {
      // Retry handled by user via re-triggering the chord; no-op for now.
      console.log('[llmOverlay] retry requested for', msg.id);
    }
  });

  port.onDisconnect.addListener(() => {
    panelConns.delete(connId);
  });
});

chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command !== 'explain-selection') return;
  await handleExplainCommand(tab);
});

async function handleExplainCommand(tab?: chrome.tabs.Tab): Promise<void> {
  const activeTab = tab ?? (await getActiveTab());
  if (!activeTab?.id || !activeTab.url) {
    console.warn('[llmOverlay] no active tab');
    return;
  }
  const host = new URL(activeTab.url).hostname;
  const provider = pickProvider(host);
  if (!provider) {
    console.warn('[llmOverlay] unsupported host', host);
    return;
  }

  try {
    await chrome.sidePanel.open({ tabId: activeTab.id });
  } catch (err) {
    console.warn('[llmOverlay] sidePanel.open failed', err);
  }

  const captureRes = await sendCapture(activeTab.id);
  if (captureRes.type === 'capture-error') {
    const id = makeId();
    const entry: QAEntry = {
      id,
      highlight: '',
      answer: '',
      ts: Date.now(),
      status: 'error',
      error: captureRes.reason
    };
    broadcast(activeTab.id, { type: 'qa-start', entry });
    await persistAppend(activeTab.id, entry);
    return;
  }

  const { selection, messages, highlightTurnIndex } = captureRes.payload;
  const id = makeId();
  const entry: QAEntry = {
    id,
    highlight: selection,
    answer: '',
    ts: Date.now(),
    status: 'streaming'
  };
  await persistAppend(activeTab.id, entry);
  await waitForPanel(activeTab.id);
  broadcast(activeTab.id, { type: 'qa-start', entry });

  const userMessage = buildUserMessage(messages, selection, highlightTurnIndex);
  const [keys, models] = await Promise.all([loadApiKeys(), loadModelPrefs()]);

  const ac = new AbortController();
  activeStreams.set(id, ac);
  startKeepAlive();

  let acc = '';
  try {
    await runStream({
      provider,
      keys,
      models,
      systemPrompt: SYSTEM_PROMPT,
      userMessage,
      signal: ac.signal,
      onDelta: text => {
        acc += text;
        broadcast(activeTab.id!, { type: 'qa-delta', id, text });
      }
    });
    broadcast(activeTab.id, { type: 'qa-done', id });
    await persistUpdate(activeTab.id, id, e => ({
      ...e,
      answer: acc,
      status: 'done'
    }));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    broadcast(activeTab.id, { type: 'qa-error', id, error: msg });
    await persistUpdate(activeTab.id, id, e => ({
      ...e,
      answer: acc,
      status: 'error',
      error: msg
    }));
  } finally {
    activeStreams.delete(id);
    if (activeStreams.size === 0) stopKeepAlive();
  }
}

async function sendCapture(tabId: number): Promise<ContentResponse> {
  const req: ContentRequest = { type: 'capture' };
  try {
    return await chrome.tabs.sendMessage<ContentRequest, ContentResponse>(tabId, req);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return {
      type: 'capture-error',
      reason: `Could not reach the page (${reason}). Reload the chat tab and try again.`
    };
  }
}

async function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  const [t] = await chrome.tabs.query({ active: true, currentWindow: true });
  return t;
}

function post(port: chrome.runtime.Port, msg: PanelInbound): void {
  try { port.postMessage(msg); } catch { /* port closed */ }
}

function broadcast(tabId: number, msg: PanelInbound): void {
  for (const conn of panelConns.values()) {
    if (conn.tabId === tabId || conn.tabId === null) post(conn.port, msg);
  }
}

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function persistAppend(tabId: number, entry: QAEntry): Promise<void> {
  const list = await loadTabHistory(tabId);
  list.push(entry);
  await saveTabHistory(tabId, list);
}

async function persistUpdate(
  tabId: number,
  id: string,
  fn: (e: QAEntry) => QAEntry
): Promise<void> {
  const list = await loadTabHistory(tabId);
  const i = list.findIndex(e => e.id === id);
  if (i < 0) return;
  list[i] = fn(list[i]);
  await saveTabHistory(tabId, list);
}

chrome.tabs.onRemoved.addListener(async tabId => {
  await chrome.storage.session.remove(`qa:tab:${tabId}`);
});
