import { parseSseStream } from './sse';

export interface OpenAIStreamArgs {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userMessage: string;
  signal: AbortSignal;
  onDelta: (text: string) => void;
}

const ENDPOINT = 'https://api.openai.com/v1/chat/completions';

export async function streamOpenAI(args: OpenAIStreamArgs): Promise<void> {
  const { apiKey, model, systemPrompt, userMessage, signal, onDelta } = args;

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    signal,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ]
    })
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '');
    throw new Error(`OpenAI API ${res.status}: ${text || res.statusText}`);
  }

  for await (const ev of parseSseStream(res.body)) {
    if (ev.data === '[DONE]') return;
    let json: unknown;
    try {
      json = JSON.parse(ev.data);
    } catch {
      continue;
    }
    const obj = json as {
      choices?: { delta?: { content?: string }; finish_reason?: string }[];
      error?: { message?: string };
    };
    if (obj.error) throw new Error(obj.error.message ?? 'OpenAI stream error');
    const text = obj.choices?.[0]?.delta?.content;
    if (text) onDelta(text);
    if (obj.choices?.[0]?.finish_reason) return;
  }
}
