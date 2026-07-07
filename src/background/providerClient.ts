import type { Provider, ApiKeys, ModelPrefs } from '../shared/messages';
import { streamAnthropic } from './anthropic';
import { streamOpenAI } from './openai';

const DEFAULT_MODELS: Record<Provider, string> = {
  anthropic: 'claude-sonnet-4-6',
  openai: 'gpt-4o-mini'
};

/**
 * Choose the provider to send the request to. It no longer depends on which
 * site you're on (the extension runs everywhere now): honor the user's default
 * provider when its key is set, otherwise fall back to whichever key exists.
 */
export function resolveProvider(prefs: ModelPrefs, keys: ApiKeys): Provider | null {
  const pref = prefs.defaultProvider;
  if (pref === 'anthropic' && keys.anthropic) return 'anthropic';
  if (pref === 'openai' && keys.openai) return 'openai';
  if (keys.anthropic) return 'anthropic';
  if (keys.openai) return 'openai';
  return null;
}

export interface RunStreamArgs {
  provider: Provider;
  keys: ApiKeys;
  models: ModelPrefs;
  systemPrompt: string;
  userMessage: string;
  signal: AbortSignal;
  onDelta: (text: string) => void;
}

export async function runStream(args: RunStreamArgs): Promise<void> {
  const { provider, keys, models, systemPrompt, userMessage, signal, onDelta } = args;
  if (provider === 'anthropic') {
    if (!keys.anthropic) throw new Error('Anthropic API key missing. Add it in extension Options.');
    await streamAnthropic({
      apiKey: keys.anthropic,
      model: models.anthropicModel || DEFAULT_MODELS.anthropic,
      systemPrompt,
      userMessage,
      signal,
      onDelta
    });
    return;
  }
  if (provider === 'openai') {
    if (!keys.openai) throw new Error('OpenAI API key missing. Add it in extension Options.');
    await streamOpenAI({
      apiKey: keys.openai,
      model: models.openaiModel || DEFAULT_MODELS.openai,
      systemPrompt,
      userMessage,
      signal,
      onDelta
    });
    return;
  }
  throw new Error(`Unknown provider: ${provider}`);
}

export { DEFAULT_MODELS };
