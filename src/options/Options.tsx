import { useEffect, useState } from 'react';
import {
  loadApiKeys, saveApiKeys, loadModelPrefs, saveModelPrefs
} from '../shared/storage';
import type { ApiKeys, ModelPrefs } from '../shared/messages';

const DEFAULTS = {
  anthropicModel: 'claude-sonnet-4-6',
  openaiModel: 'gpt-4o-mini'
};

export function Options() {
  const [keys, setKeys] = useState<ApiKeys>({});
  const [models, setModels] = useState<ModelPrefs>({});
  const [status, setStatus] = useState<string>('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void Promise.all([loadApiKeys(), loadModelPrefs()]).then(([k, m]) => {
      setKeys(k);
      setModels(m);
    });
  }, []);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await Promise.all([saveApiKeys(keys), saveModelPrefs(models)]);
      setStatus('Saved.');
    } catch (err) {
      setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
      setTimeout(() => setStatus(''), 2000);
    }
  };

  return (
    <main>
      <h1>llmOverlay — Options</h1>
      <p className="sub">
        Configure API keys for the providers used on each site. Keys are stored locally in this
        browser profile.
      </p>

      <div className="warn">
        <strong>Heads up:</strong> keys are stored unencrypted in <code>chrome.storage.local</code>.
        Any extension you install with the <code>storage</code> permission could read them. Treat
        this like a desktop password manager, not a vault. Use scoped/limited keys when possible.
      </div>

      <form onSubmit={onSave}>
        <fieldset>
          <legend>API keys</legend>
          <div className="field">
            <label htmlFor="anthropic">Anthropic API key (used on claude.ai)</label>
            <input
              id="anthropic"
              type="password"
              autoComplete="off"
              placeholder="sk-ant-..."
              value={keys.anthropic ?? ''}
              onChange={e => setKeys({ ...keys, anthropic: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="openai">OpenAI API key (used on chatgpt.com)</label>
            <input
              id="openai"
              type="password"
              autoComplete="off"
              placeholder="sk-..."
              value={keys.openai ?? ''}
              onChange={e => setKeys({ ...keys, openai: e.target.value })}
            />
          </div>
        </fieldset>

        <fieldset>
          <legend>Models</legend>
          <div className="field">
            <label htmlFor="anthropic-model">Anthropic model</label>
            <input
              id="anthropic-model"
              type="text"
              placeholder={DEFAULTS.anthropicModel}
              value={models.anthropicModel ?? ''}
              onChange={e => setModels({ ...models, anthropicModel: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="openai-model">OpenAI model</label>
            <input
              id="openai-model"
              type="text"
              placeholder={DEFAULTS.openaiModel}
              value={models.openaiModel ?? ''}
              onChange={e => setModels({ ...models, openaiModel: e.target.value })}
            />
          </div>
        </fieldset>

        <div className="row">
          <button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
          <span className="status">{status}</span>
        </div>
      </form>

      <p className="sub" style={{ marginTop: 22 }}>
        Keybind: rebind at{' '}
        <a href="chrome://extensions/shortcuts" target="_blank" rel="noopener noreferrer">
          chrome://extensions/shortcuts
        </a>{' '}
        (Chrome won't open chrome:// links from a page; copy-paste it).
      </p>
    </main>
  );
}
