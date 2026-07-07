export type Role = 'user' | 'assistant';

export interface ChatMessage {
  role: Role;
  content: string;
}

export type Provider = 'anthropic' | 'openai';

export interface ApiKeys {
  anthropic?: string;
  openai?: string;
}

export interface ModelPrefs {
  anthropicModel?: string;
  openaiModel?: string;
  /** Which provider to send requests to, regardless of which site you're on. */
  defaultProvider?: Provider;
}

/** A snapshot of the web page the user is on, used to ground the answer. */
export interface PageContext {
  title: string;
  url: string;
  host: string;
  /** Readable text extracted from the page. */
  text: string;
  /** Structured chat turns, present only when a known chat site (ChatGPT/Claude) matched. */
  messages?: ChatMessage[];
}

export interface CapturePayload {
  /** The highlighted passage, or '' when the user is asking about the whole page. */
  selection: string;
  page: PageContext;
  highlightTurnIndex: number | null;
}

export type ContentRequest =
  | { type: 'capture' };

export type ContentResponse =
  | { type: 'capture-result'; payload: CapturePayload }
  | { type: 'capture-error'; reason: string };

export interface QAEntry {
  id: string;
  highlight: string;
  /** The specific question asked about the highlight, if any. Absent for a plain "explain" request. */
  question?: string;
  answer: string;
  ts: number;
  status: 'streaming' | 'done' | 'error';
  error?: string;
}

export type PanelInbound =
  | { type: 'qa-start'; entry: QAEntry }
  | { type: 'qa-delta'; id: string; text: string }
  | { type: 'qa-done'; id: string }
  | { type: 'qa-error'; id: string; error: string }
  | { type: 'rehydrate'; entries: QAEntry[] }
  | { type: 'context-set'; highlight: string; pageTitle: string; hasSelection: boolean }
  | { type: 'cleared' };

export type PanelOutbound =
  | { type: 'panel-ready'; tabId: number | null }
  | { type: 'heartbeat' }
  | { type: 'ask'; tabId: number | null; question: string }
  | { type: 'clear'; tabId: number | null }
  | { type: 'retry'; id: string };
