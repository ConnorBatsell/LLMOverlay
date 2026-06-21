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
}

export interface CapturePayload {
  selection: string;
  messages: ChatMessage[];
  host: string;
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
  | { type: 'context-set'; highlight: string }
  | { type: 'cleared' };

export type PanelOutbound =
  | { type: 'panel-ready'; tabId: number | null }
  | { type: 'heartbeat' }
  | { type: 'ask'; tabId: number | null; question: string }
  | { type: 'clear'; tabId: number | null }
  | { type: 'retry'; id: string };
