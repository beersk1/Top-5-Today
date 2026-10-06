import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { createLogger, defineConfig } from 'vite';

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
      logger.warn(`Can't reach the local server on port ${apiPort} yet. Check the [server] lines above if this persists.`);
    }
    return;
  }
  logError(message, options);
};

export default defineConfig({
  customLogger: logger,
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Send every /api request to the local server (server/index.ts).
    proxy: { '/api': `http://localhost:${apiPort}` },
  },
});
