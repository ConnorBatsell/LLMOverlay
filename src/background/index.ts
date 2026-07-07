import type {
  CapturePayload,
  ContentRequest,
  ContentResponse,
  PanelInbound,
  PanelOutbound,
  Provider,
  QAEntry
} from '../shared/messages';
import {
  clearTabHistory,
  loadApiKeys,
  loadModelPrefs,
  loadTabContext,
  loadTabHistory,
  saveTabContext,
  saveTabHistory
} from '../shared/storage';
import { SYSTEM_PROMPT, buildUserMessage } from './promptBuilder';
import { resolveProvider, runStream } from './providerClient';
import { startKeepAlive, stopKeepAlive } from './keepAlive';

interface PanelConn {
  port: chrome.runtime.Port;
  tabId: number | null;
}

const panelConns = new Map<number, PanelConn>();
const activeStreams = new Map<string, AbortController>();
const streamTab = new Map<string, number>();
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
        // Reuse a stored context if we have one; otherwise read the page the
        // panel just opened over so you can ask about it without highlighting.
        const ctx = (await loadTabContext(msg.tabId)) ?? (await autoCapture(msg.tabId));
        if (ctx) {
          post(port, {
            type: 'context-set',
            highlight: ctx.selection,
            pageTitle: ctx.page.title,
            hasSelection: !!ctx.selection
          });
        }
        notePanelReady(msg.tabId);
      }
    } else if (msg.type === 'ask') {
      await handleAsk(msg.tabId, msg.question);
    } else if (msg.type === 'clear') {
      await handleClear(msg.tabId);
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
  if (!isCapturablePage(activeTab.url)) {
    console.warn('[llmOverlay] cannot run on this page', activeTab.url);
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

  const payload = captureRes.payload;
  await saveTabContext(activeTab.id, payload);
  // Set the panel's focus (the highlight if any, else the whole page), then wait
  // for the user to ask. The page content + prior Q&A stay available for answers.
  await waitForPanel(activeTab.id);
  broadcast(activeTab.id, {
    type: 'context-set',
    highlight: payload.selection,
    pageTitle: payload.page.title,
    hasSelection: !!payload.selection
  });
}

/** Content scripts only run on http(s); skip chrome://, extension, file, etc. pages. */
function isCapturablePage(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

/** Read the page a freshly-opened panel is sitting over, and remember it. */
async function autoCapture(tabId: number): Promise<CapturePayload | null> {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab.url || !isCapturablePage(tab.url)) return null;
    const res = await sendCapture(tabId);
    if (res.type !== 'capture-result') return null;
    await saveTabContext(tabId, res.payload);
    return res.payload;
  } catch {
    return null;
  }
}

async function handleAsk(tabId: number | null, question: string): Promise<void> {
  if (tabId == null) return;
  const q = question.trim();
  if (!q) return;

  const payload = await loadTabContext(tabId);
  if (!payload) {
    await emitAskError(
      tabId,
      q,
      'Open the panel on a page (or press the shortcut) so I can read it before you ask.'
    );
    return;
  }

  const [keys, models] = await Promise.all([loadApiKeys(), loadModelPrefs()]);
  const provider = resolveProvider(models, keys);
  if (!provider) {
    await emitAskError(
      tabId,
      q,
      'No API key set. Add an Anthropic or OpenAI key in the extension Options.'
    );
    return;
  }
  // Carry forward everything already discussed in this docker so the answer stays
  // coherent across follow-ups and across multiple highlights.
  const history = await loadTabHistory(tabId);
  const priorQA = history.filter(e => e.status === 'done' && e.answer);
  await runAnswer(tabId, provider, payload, q, priorQA);
}

async function runAnswer(
  tabId: number,
  provider: Provider,
  payload: CapturePayload,
  question: string | null,
  priorQA: QAEntry[] = []
): Promise<void> {
  const id = makeId();
  const entry: QAEntry = {
    id,
    highlight: payload.selection,
    question: question ?? undefined,
    answer: '',
    ts: Date.now(),
    status: 'streaming'
  };
  await persistAppend(tabId, entry);
  await waitForPanel(tabId);
  broadcast(tabId, { type: 'qa-start', entry });

  const userMessage = buildUserMessage(
    payload.page,
    payload.selection,
    payload.highlightTurnIndex,
    question ?? undefined,
    priorQA
  );
  const [keys, models] = await Promise.all([loadApiKeys(), loadModelPrefs()]);

  const ac = new AbortController();
  activeStreams.set(id, ac);
  streamTab.set(id, tabId);
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
        broadcast(tabId, { type: 'qa-delta', id, text });
      }
    });
    broadcast(tabId, { type: 'qa-done', id });
    await persistUpdate(tabId, id, e => ({
      ...e,
      answer: acc,
      status: 'done'
    }));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    broadcast(tabId, { type: 'qa-error', id, error: msg });
    await persistUpdate(tabId, id, e => ({
      ...e,
      answer: acc,
      status: 'error',
      error: msg
    }));
  } finally {
    activeStreams.delete(id);
    streamTab.delete(id);
    if (activeStreams.size === 0) stopKeepAlive();
  }
}

async function handleClear(tabId: number | null): Promise<void> {
  if (tabId == null) return;
  // Cancel any answer still streaming for this tab so it can't repopulate history.
  for (const [id, t] of streamTab) {
    if (t === tabId) activeStreams.get(id)?.abort();
  }
  await clearTabHistory(tabId);
  broadcast(tabId, { type: 'cleared' });
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

async function emitAskError(tabId: number, question: string, error: string): Promise<void> {
  const entry: QAEntry = {
    id: makeId(),
    highlight: '',
    question,
    answer: '',
    ts: Date.now(),
    status: 'error',
    error
  };
  broadcast(tabId, { type: 'qa-start', entry });
  await persistAppend(tabId, entry);
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
  await chrome.storage.session.remove([`qa:tab:${tabId}`, `ctx:tab:${tabId}`]);
});
