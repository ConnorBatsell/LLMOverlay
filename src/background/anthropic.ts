import { parseSseStream } from './sse';

export interface AnthropicStreamArgs {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userMessage: string;
  signal: AbortSignal;
  onDelta: (text: string) => void;
}

const ENDPOINT = 'https://api.anthropic.com/v1/messages';
const VERSION = '2023-06-01';

export async function streamAnthropic(args: AnthropicStreamArgs): Promise<void> {
  const { apiKey, model, systemPrompt, userMessage, signal, onDelta } = args;

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    signal,
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': VERSION,
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system: systemPrompt,
      stream: true,
      messages: [{ role: 'user', content: userMessage }]
    })
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '');
    throw new Error(`Anthropic API ${res.status}: ${text || res.statusText}`);
  }

  for await (const ev of parseSseStream(res.body)) {
    if (ev.data === '[DONE]') return;
    let json: unknown;
    try {
      json = JSON.parse(ev.data);
    } catch {
      continue;
    }
    const obj = json as { type?: string; delta?: { type?: string; text?: string }; error?: { message?: string } };
    if (obj.type === 'content_block_delta' && obj.delta?.type === 'text_delta' && obj.delta.text) {
      onDelta(obj.delta.text);
    } else if (obj.type === 'message_stop') {
      return;
    } else if (obj.type === 'error') {
      throw new Error(obj.error?.message ?? 'Anthropic stream error');
    }
  }
}
