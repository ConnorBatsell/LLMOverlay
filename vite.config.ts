import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.config';

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        sidepanel: 'src/sidepanel/index.html',
        options: 'src/options/index.html'
      }
    }
  },
  server: {
    port: 5173,
    strictPort: true,
    hmr: { port: 5174 }
  }
});
