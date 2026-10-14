import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { createLogger, defineConfig, type Alias } from 'vite';

const apiPort = process.env.API_PORT || 3001;

// While the local server is starting (or has crashed), every /api request fails.
// Print one short note instead of a stack trace per request. Real server errors
// still show up in the [server] lines of the terminal.
const logger = createLogger();
const logError = logger.error;
let warnedServerDown = false;
logger.error = (message, options) => {
  if (message.includes('http proxy error')) {
    if (!warnedServerDown) {
      warnedServerDown = true;
      logger.warn(
        `Can't reach the local server on port ${apiPort} yet. Check the [server] lines above if this persists.`,
      );
    }
    return;
  }
  logError(message, options);
};

// Demo mode (`--mode demo`, used for GitHub Pages): the server code runs inside the browser.
// These swap its Node-only imports for the browser versions in src/demo/.
const demoAliases: Alias[] = [
  { find: /^\.\/store$/, replacement: path.resolve(import.meta.dirname, 'src/demo/store.ts') },
  { find: /^express$/, replacement: path.resolve(import.meta.dirname, 'src/demo/express.ts') },
  { find: /^node:crypto$/, replacement: path.resolve(import.meta.dirname, 'src/demo/crypto.ts') },
];

export default defineConfig(({ mode }) => ({
  customLogger: logger,
  // GitHub Pages serves the site from /<repo-name>/, which the workflow passes in as BASE_PATH.
  base: process.env.BASE_PATH || '/',
  plugins: [react(), tailwindcss()],
  resolve: { alias: mode === 'demo' ? demoAliases : [] },
  server: {
    port: 5173,
    // Send every /api request to the local server (server/index.ts).
    proxy: { '/api': `http://localhost:${apiPort}` },
  },
}));
