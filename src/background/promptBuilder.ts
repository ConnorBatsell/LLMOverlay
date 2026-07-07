import type { ChatMessage, PageContext, QAEntry } from '../shared/messages';

const MAX_TRANSCRIPT_CHARS = 24_000;
const MAX_PAGE_CHARS = 24_000;
const MAX_PRIOR_QA = 6;
const MAX_PRIOR_ANSWER_CHARS = 1_500;

export const SYSTEM_PROMPT =
  'You are a browsing assistant embedded in the user\'s web browser. The user is reading a web ' +
  'page; you are given its title, URL, and extracted text, and sometimes a passage the user has ' +
  'highlighted. First familiarize yourself with the page, then answer the user\'s question. If a ' +
  'highlight is present, focus your answer on it and use the rest of the page as context. If no ' +
  'highlight is present, answer about the page as a whole. Use earlier questions and answers in ' +
  'this session as context for follow-ups. Be concise and concrete. If something is ambiguous, ' +
  'state your interpretation. Do not invent facts that are not supported by the page or by general ' +
  'knowledge.';

export function buildUserMessage(
  page: PageContext,
  highlight: string,
  highlightTurnIndex: number | null,
  question?: string,
  priorQA: QAEntry[] = []
): string {
  const body =
    page.messages && page.messages.length
      ? formatTranscript(truncateTurns(page.messages, highlightTurnIndex))
      : truncateText(page.text, MAX_PAGE_CHARS);

  const q = question?.trim();
  const hasHighlight = !!highlight.trim();

  const instruction = buildInstruction(q, hasHighlight);

  return [
    `<page title="${escapeAttr(page.title)}" url="${escapeAttr(page.url)}">`,
    body,
    '</page>',
    '',
    ...formatPriorDiscussion(priorQA),
    ...(hasHighlight
      ? [`<highlight>"${highlight.replace(/"/g, '\\"')}"</highlight>`, '']
      : []),
    ...instruction
  ].join('\n');
}

function buildInstruction(question: string | undefined, hasHighlight: boolean): string[] {
  if (question) {
    const q = `<question>${question.replace(/</g, '&lt;')}</question>`;
    if (hasHighlight) {
      return [
        q,
        '',
        'Answer the question above about the highlighted passage. Anchor your answer in the ' +
          'surrounding page content and the prior discussion; do not summarize the whole page.'
      ];
    }
    return [
      q,
      '',
      'Answer the question above using the page content above and the prior discussion.'
    ];
  }
  if (hasHighlight) {
    return [
      'Explain or expand on the highlighted passage specifically. Anchor your answer in the ' +
        'surrounding page content; do not summarize the whole page.'
    ];
  }
  return ['Briefly summarize what this page is and its key points.'];
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
      : e.highlight
        ? `Highlighted: "${e.highlight}"`
        : 'About the page:';
    return `${head}\nA: ${answer}`;
  });
  return ['<prior_discussion>', blocks.join('\n\n'), '</prior_discussion>', ''];
}

function formatTranscript(messages: ChatMessage[]): string {
  return messages
    .map(m => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n\n');
}

function truncateText(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + '\n…[truncated]' : text;
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
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
