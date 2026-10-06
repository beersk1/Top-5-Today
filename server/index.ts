// Starts the local server.
//   npm run dev   -> this runs on port 3001, and the website (Vite) on port 5173 forwards /api calls here
//   npm start     -> this also serves the built website from dist/, so everything is on port 3001

import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import { HttpError, router } from './routes';
import { seedIfEmpty } from './seed';

// Named API_PORT (not PORT) so it never clashes with tools that set PORT for the website.
const PORT = Number(process.env.API_PORT) || 3001;
const serveWebsite = process.argv.includes('--serve-website');

seedIfEmpty();

const app = express();
app.use(express.json());
app.use('/api', router);

if (serveWebsite) {
  const distDir = path.resolve(import.meta.dirname, '..', 'dist');
  app.use(express.static(distDir));
  // Any other URL (e.g. /leagues) gets the app's index.html and the browser handles the page.
  app.get('/{*path}', (_req, res) => res.sendFile(path.join(distDir, 'index.html')));
}

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  console.error(error);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
