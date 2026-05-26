import { useEffect, useRef, useState } from 'react';
import type { PanelInbound, QAEntry } from '../shared/messages';
import { connectPanel, getActiveTabId } from './api';

export function App() {
  const [entries, setEntries] = useState<QAEntry[]>([]);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;

    const port = connectPanel((msg: PanelInbound) => {
      setEntries(prev => apply(prev, msg));
    });

    void (async () => {
      const tabId = await getActiveTabId();
      if (!alive) return;
      port.send({ type: 'panel-ready', tabId });
    })();

    return () => {
      alive = false;
      port.close();
    };
  }, []);

  useEffect(() => {
    const node = listRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [entries]);

  return (
    <div className="app">
      <header className="app__header">
        <span className="app__title">llmOverlay</span>
        <span className="app__hint">Cmd/Ctrl+Shift+E to explain</span>
      </header>
      <div className="app__list" ref={listRef}>
        {entries.length === 0 ? <EmptyState /> : entries.map(e => <Entry key={e.id} entry={e} />)}
      </div>
    </div>
  );
}

function apply(prev: QAEntry[], msg: PanelInbound): QAEntry[] {
  switch (msg.type) {
    case 'rehydrate':
      return msg.entries;
    case 'qa-start':
      return prev.some(e => e.id === msg.entry.id) ? prev : [...prev, msg.entry];
    case 'qa-delta': {
      const next = prev.slice();
      const i = next.findIndex(e => e.id === msg.id);
      if (i >= 0) next[i] = { ...next[i], answer: next[i].answer + msg.text };
      return next;
    }
    case 'qa-done': {
      const next = prev.slice();
      const i = next.findIndex(e => e.id === msg.id);
      if (i >= 0) next[i] = { ...next[i], status: 'done' };
      return next;
    }
    case 'qa-error': {
      const next = prev.slice();
      const i = next.findIndex(e => e.id === msg.id);
      if (i >= 0) next[i] = { ...next[i], status: 'error', error: msg.error };
      return next;
    }
  }
}

function EmptyState() {
  return (
    <div className="empty">
      <div style={{ marginBottom: 6, color: 'var(--fg)' }}>Nothing yet.</div>
      Open <strong>chatgpt.com</strong> or <strong>claude.ai</strong>, highlight a phrase
      in an assistant reply, then press <kbd>Cmd/Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>E</kbd>.
      An explanation will stream in here without touching the chat thread.
    </div>
  );
}

function Entry({ entry }: { entry: QAEntry }) {
  const onCopy = () => {
    void navigator.clipboard.writeText(entry.answer);
  };
  return (
    <article className="entry">
      {entry.highlight && <div className="entry__highlight">"{entry.highlight}"</div>}
      {entry.status === 'error' && entry.error ? (
        <div className="entry__error">⚠ {entry.error}</div>
      ) : (
        <div
          className={
            'entry__answer' + (entry.status === 'streaming' ? ' entry__answer--streaming' : '')
          }
        >
          {entry.answer}
        </div>
      )}
      <footer className="entry__footer">
        <span>{new Date(entry.ts).toLocaleTimeString()}</span>
        {entry.answer && (
          <button className="entry__copy" onClick={onCopy} type="button">copy</button>
        )}
      </footer>
    </article>
  );
}
