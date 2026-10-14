// Demo mode only: the same functions as server/store.ts, but saving to this browser's
// localStorage instead of JSON files. vite.config.ts swaps this in for the demo build.

import type { TableName, Tables } from '../../server/store';

export type { EntryRow, LeagueRow, PlayerRow, SubmissionRow, TableName, TopicRow } from '../../server/store';

export const DATA_DIR = 'browser storage';

const PREFIX = 'top5-demo:';
const SETUP_DONE_KEY = `${PREFIX}setup-done`;

export function hasData(): boolean {
  return localStorage.getItem(SETUP_DONE_KEY) !== null;
}

export function markSetupDone(): void {
  localStorage.setItem(SETUP_DONE_KEY, new Date().toISOString());
}

export function clearData(): void {
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith(PREFIX)) localStorage.removeItem(key);
  }
}

export function readTable<T extends TableName>(table: T): Tables[T] {
  const saved = localStorage.getItem(PREFIX + table);
  return (saved ? JSON.parse(saved) : []) as Tables[T];
}

export function writeTable<T extends TableName>(table: T, rows: Tables[T]): void {
  localStorage.setItem(PREFIX + table, JSON.stringify(rows));
}
