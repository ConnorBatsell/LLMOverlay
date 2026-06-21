import type { ChatMessage, QAEntry } from '../shared/messages';

const MAX_TRANSCRIPT_CHARS = 24_000;
const MAX_PRIOR_QA = 6;
const MAX_PRIOR_ANSWER_CHARS = 1_500;

export const SYSTEM_PROMPT =
  'You are an inline explainer and Q&A assistant. The user is reading an LLM chat ' +
  'transcript and has highlighted a passage. When the user asks a specific question, ' +
  'answer that question about the highlighted passage, using the preceding ' +
  'conversation and any prior discussion (earlier questions and answers in this ' +
  'session) as context. When no question is given, explain or expand on the ' +
  'highlighted passage. Be concise and concrete. If the highlight is ambiguous, ' +
  'state your interpretation. Do not invent facts not implied by the transcript or ' +
  'general knowledge.';

export function buildUserMessage(
  messages: ChatMessage[],
  highlight: string,
  highlightTurnIndex: number | null,
  question?: string,
  priorQA: QAEntry[] = []
): string {
  const transcript = formatTranscript(truncateTurns(messages, highlightTurnIndex));
  const q = question?.trim();
  const instruction = q
    ? [
        `<question>${q.replace(/</g, '&lt;')}</question>`,
        '',
        'Answer the question above specifically about the highlighted passage. ' +
          'Anchor your answer in the surrounding conversation and in the prior ' +
          'discussion above; do not summarize the whole chat.'
      ]
    : [
        'Explain or expand on the highlighted passage specifically. Anchor your answer ' +
          'in the surrounding conversation; do not summarize the whole chat.'
      ];
  return [
    '<transcript>',
    transcript,
    '</transcript>',
    '',
    ...formatPriorDiscussion(priorQA),
    `<highlight>"${highlight.replace(/"/g, '\\"')}"</highlight>`,
    '',
    ...instruction
  ].join('\n');
}

function formatPriorDiscussion(priorQA: QAEntry[]): string[] {
  const recent = priorQA.filter(e => e.answer).slice(-MAX_PRIOR_QA);
  if (!recent.length) return [];
  const blocks = recent.map(e => {
    const answer = e.answer.length > MAX_PRIOR_ANSWER_CHARS
      ? e.answer.slice(0, MAX_PRIOR_ANSWER_CHARS) + '…'
      : e.answer;
    const head = e.question?.trim()
      ? `Q: ${e.question.trim()}`
      : `Highlighted: "${e.highlight}"`;
    return `${head}\nA: ${answer}`;
  });
  return ['<prior_discussion>', blocks.join('\n\n'), '</prior_discussion>', ''];
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
