// Demo mode only: runs the real server code (server/routes.ts) inside the browser,
// so the website works on GitHub Pages without a server. Data lives in localStorage,
// which means every visitor gets their own private copy.

import '../../server/routes';
import { seedIfEmpty } from '../../server/seed';
import { clearData } from './store';
import { handle } from './express';

export function demoRequest(method: string, path: string, headers: Record<string, string>, body: unknown) {
  seedIfEmpty();
  // Copy the data like a real network response would, so the page can't change stored objects.
  const result = handle(method, path, headers, body === undefined ? undefined : structuredClone(body));
  return { status: result.status, data: structuredClone(result.data) };
}

/** Wipes this browser's demo data. Fresh sample data is created on the next request. */
export function resetDemo() {
  clearData();
}
