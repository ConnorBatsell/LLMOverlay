import { defineManifest } from '@crxjs/vite-plugin';
import pkg from './package.json' with { type: 'json' };

export default defineManifest({
  manifest_version: 3,
  name: 'llmOverlay',
  version: pkg.version,
  description: pkg.description,
  minimum_chrome_version: '116',
  permissions: ['sidePanel', 'storage', 'activeTab', 'alarms', 'tabs'],
  host_permissions: [
    'https://api.anthropic.com/*',
    'https://api.openai.com/*'
  ],
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module'
  },
  content_scripts: [
    {
      matches: ['https://chatgpt.com/*', 'https://claude.ai/*'],
      js: ['src/content/index.ts'],
      run_at: 'document_idle'
    }
  ],
  side_panel: {
    default_path: 'src/sidepanel/index.html'
  },
  options_ui: {
    page: 'src/options/index.html',
    open_in_tab: true
  },
  action: {
    default_title: 'llmOverlay — open side panel'
  },
  commands: {
    'explain-selection': {
      suggested_key: {
        default: 'Ctrl+Shift+E',
        mac: 'Command+Shift+E'
      },
      description: 'Explain the highlighted passage in the side panel'
    }
  }
});
