export type SseEvent = { event: string | null; data: string };

export async function* parseSseStream(
  body: ReadableStream<Uint8Array>
): AsyncGenerator<SseEvent, void, void> {
  const decoder = new TextDecoder('utf-8');
  const reader = body.getReader();
  let buf = '';
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buf.indexOf('\n\n')) >= 0) {
        const block = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        const ev = parseBlock(block);
        if (ev) yield ev;
      }
    }
    if (buf.trim()) {
      const ev = parseBlock(buf);
      if (ev) yield ev;
    }
  } finally {
    try { reader.releaseLock(); } catch { /* ignore */ }
  }
}

function parseBlock(block: string): SseEvent | null {
  let event: string | null = null;
  const dataLines: string[] = [];
  for (const line of block.split('\n')) {
    if (!line || line.startsWith(':')) continue;
    if (line.startsWith('event:')) {
      event = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).replace(/^ /, ''));
    }
  }
  if (!dataLines.length) return null;
  return { event, data: dataLines.join('\n') };
}
