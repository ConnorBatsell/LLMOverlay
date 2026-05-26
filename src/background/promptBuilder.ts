import type { ChatMessage } from '../shared/messages';

const MAX_TRANSCRIPT_CHARS = 24_000;

export const SYSTEM_PROMPT =
  'You are an inline explainer. The user is reading an LLM chat transcript and ' +
  'has highlighted a passage. Explain or expand on that passage using the ' +
  'preceding conversation as context. Be concise and concrete. If the highlight ' +
  'is ambiguous, state your interpretation. Do not invent facts not implied by ' +
  'the transcript or general knowledge.';

export function buildUserMessage(
  messages: ChatMessage[],
  highlight: string,
  highlightTurnIndex: number | null
): string {
  const transcript = formatTranscript(truncateTurns(messages, highlightTurnIndex));
  return [
    '<transcript>',
    transcript,
    '</transcript>',
    '',
    `<highlight>"${highlight.replace(/"/g, '\\"')}"</highlight>`,
    '',
    'Explain or expand on the highlighted passage specifically. Anchor your answer in the surrounding conversation; do not summarize the whole chat.'
  ].join('\n');
}

function formatTranscript(messages: ChatMessage[]): string {
  return messages
    .map(m => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n\n');
}

function truncateTurns(messages: ChatMessage[], pinIndex: number | null): ChatMessage[] {
  const cost = (m: ChatMessage) => m.content.length + m.role.length + 4;
  const total = messages.reduce((acc, m) => acc + cost(m), 0);
  if (total <= MAX_TRANSCRIPT_CHARS) return messages;

  const validPin = pinIndex != null && pinIndex >= 0 && pinIndex < messages.length
    ? pinIndex
    : null;

  const keepIdx = new Set<number>();
  let used = 0;
  if (validPin != null) {
    keepIdx.add(validPin);
    used += cost(messages[validPin]);
  }
  for (let i = messages.length - 1; i >= 0; i--) {
    if (keepIdx.has(i)) continue;
    const c = cost(messages[i]);
    if (used + c > MAX_TRANSCRIPT_CHARS) break;
    keepIdx.add(i);
    used += c;
  }

  return [...keepIdx].sort((a, b) => a - b).map(i => messages[i]);
}
