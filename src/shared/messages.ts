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
  | { type: 'rehydrate'; entries: QAEntry[] };

export type PanelOutbound =
  | { type: 'panel-ready'; tabId: number | null }
  | { type: 'heartbeat' }
  | { type: 'retry'; id: string };
