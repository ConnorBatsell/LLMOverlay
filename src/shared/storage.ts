import type { ApiKeys, CapturePayload, ModelPrefs, QAEntry } from './messages';

const KEY_API = 'apiKeys';
const KEY_MODELS = 'modelPrefs';
const SESSION_PREFIX = 'qa:tab:';
const CTX_PREFIX = 'ctx:tab:';

export async function loadApiKeys(): Promise<ApiKeys> {
  const out = await chrome.storage.local.get(KEY_API);
  return (out[KEY_API] as ApiKeys | undefined) ?? {};
}

export async function saveApiKeys(keys: ApiKeys): Promise<void> {
  await chrome.storage.local.set({ [KEY_API]: keys });
}

export async function loadModelPrefs(): Promise<ModelPrefs> {
  const out = await chrome.storage.local.get(KEY_MODELS);
  return (out[KEY_MODELS] as ModelPrefs | undefined) ?? {};
}

export async function saveModelPrefs(prefs: ModelPrefs): Promise<void> {
  await chrome.storage.local.set({ [KEY_MODELS]: prefs });
}

export async function loadTabHistory(tabId: number): Promise<QAEntry[]> {
  const k = `${SESSION_PREFIX}${tabId}`;
  const out = await chrome.storage.session.get(k);
  return (out[k] as QAEntry[] | undefined) ?? [];
}

export async function saveTabHistory(tabId: number, entries: QAEntry[]): Promise<void> {
  const k = `${SESSION_PREFIX}${tabId}`;
  await chrome.storage.session.set({ [k]: entries });
}

export async function clearTabHistory(tabId: number): Promise<void> {
  const k = `${SESSION_PREFIX}${tabId}`;
  await chrome.storage.session.remove(k);
}

/** The most recent highlight + transcript captured for a tab, so follow-up questions can reuse it. */
export async function loadTabContext(tabId: number): Promise<CapturePayload | null> {
  const k = `${CTX_PREFIX}${tabId}`;
  const out = await chrome.storage.session.get(k);
  return (out[k] as CapturePayload | undefined) ?? null;
}

export async function saveTabContext(tabId: number, ctx: CapturePayload): Promise<void> {
  const k = `${CTX_PREFIX}${tabId}`;
  await chrome.storage.session.set({ [k]: ctx });
}

export async function clearTabContext(tabId: number): Promise<void> {
  const k = `${CTX_PREFIX}${tabId}`;
  await chrome.storage.session.remove(k);
}
