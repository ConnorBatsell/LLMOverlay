import { useEffect, useRef, useState } from 'react';
import type { PanelInbound, QAEntry } from '../shared/messages';
import { connectPanel, getActiveTabId, type PanelPort } from './api';

export function App() {
  const [entries, setEntries] = useState<QAEntry[]>([]);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const tabIdRef = useRef<number | null>(null);
  const portRef = useRef<PanelPort | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;

    const port = connectPanel((msg: PanelInbound) => {
      if (msg.type === 'context-set') {
        setHighlight(msg.highlight);
        return;
      }
      setEntries(prev => apply(prev, msg));
    });
    portRef.current = port;

    void (async () => {
      const tabId = await getActiveTabId();
      if (!alive) return;
      tabIdRef.current = tabId;
      port.send({ type: 'panel-ready', tabId });
    })();

    return () => {
      alive = false;
      portRef.current = null;
      port.close();
    };
  }, []);

  useEffect(() => {
    const node = listRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [entries]);

  const submit = () => {
    const q = question.trim();
    if (!q || !highlight || !portRef.current) return;
    portRef.current.send({ type: 'ask', tabId: tabIdRef.current, question: q });
    setQuestion('');
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const clearHistory = () => {
    setEntries([]);
    portRef.current?.send({ type: 'clear', tabId: tabIdRef.current });
  };

  const openOptions = () => {
    chrome.runtime.openOptionsPage();
  };

  return (
    <div className="app">
      <header className="app__header">
        <span className="app__title">llmOverlay</span>
        <button
          className="app__clear"
          type="button"
          onClick={clearHistory}
          disabled={entries.length === 0}
          title="Clear all chat history in this panel"
        >
          Clear
        </button>
      </header>
      <div className="app__options-bar">
        <span className="app__hint">Cmd/Ctrl+Shift+E to capture</span>
        <button
          className="app__options"
          type="button"
          onClick={openOptions}
          title="Open extension options to set your API keys"
        >
          ⚙ Options &amp; API keys
        </button>
      </div>
      <div className="app__list" ref={listRef}>
        {entries.length === 0 ? <EmptyState /> : entries.map(e => <Entry key={e.id} entry={e} />)}
      </div>
      <div className="composer">
        {highlight && (
          <div className="composer__context" title={highlight}>
            <span className="composer__context-label">Asking about</span>
            <span className="composer__context-text">{highlight}</span>
          </div>
        )}
        <div className="composer__row">
          <textarea
            className="composer__input"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={onKeyDown}
            rows={2}
            disabled={!highlight}
            placeholder={
              highlight
                ? 'Ask a question about the highlight…'
                : 'Highlight text in the chat, then press Cmd/Ctrl+Shift+E'
            }
          />
          <button
            className="composer__send"
            type="button"
            onClick={submit}
            disabled={!highlight || !question.trim()}
          >
            Ask
          </button>
        </div>
      </div>
    </div>
  );
}

function apply(prev: QAEntry[], msg: PanelInbound): QAEntry[] {
  switch (msg.type) {
    case 'rehydrate':
      return msg.entries;
    case 'cleared':
      return [];
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
    default:
      return prev;
  }
}

function EmptyState() {
  return (
    <div className="empty">
      <div style={{ marginBottom: 6, color: 'var(--fg)' }}>Nothing yet.</div>
      Open <strong>chatgpt.com</strong> or <strong>claude.ai</strong>, highlight a phrase
      in an assistant reply, then press <kbd>Cmd/Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>E</kbd>.
      The highlight lands in the box below — type a specific question about it to get an
      answer. The docker keeps the full chat context and everything you've asked, so each
      follow-up builds on the last — all without touching the chat thread.
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
      {entry.question && <div className="entry__question">{entry.question}</div>}
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
