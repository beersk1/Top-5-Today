// The "database": one JSON file per table inside the data/ folder.
// Files are read on every request, so you can open and edit them in VS Code
// while the server is running. Delete the data/ folder (or run
// `npm run reset-data`) to start fresh.

import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { RankedPick } from '../shared/types';

export const DATA_DIR = path.resolve(import.meta.dirname, '..', 'data');

export type PlayerRow = {
  id: string;
  name: string;
  /** Sample players are made-up people who fill in picks automatically. */
  isSample: boolean;
  createdAt: string;
};

export type TopicRow = {
  id: string;
  /** YYYY-MM-DD (UTC). One topic per day. */
  day: string;
  title: string;
  description: string;
  createdAt: string;
};

/**
 * A distinct answer for a topic, e.g. "The Dark Knight".
 * Different spellings ("dark knight", "The Dark Knight!") all point at the same entry.
 */
export type EntryRow = {
  id: string;
  topicId: string;
  label: string;
  /** Lower-case, punctuation-free version of label used for matching. */
  normalized: string;
  /** Other normalized spellings people typed that matched this entry. */
  aliases: string[];
};

export type SubmissionRow = {
  id: string;
  topicId: string;
  playerId: string;
  picks: RankedPick[];
  predictionEntryId: string | null;
  submittedAt: string;
};

export type LeagueRow = {
  id: string;
  name: string;
  inviteCode: string;
  ownerId: string;
  memberIds: string[];
  createdAt: string;
};

type Tables = {
  players: PlayerRow[];
  topics: TopicRow[];
  entries: EntryRow[];
  submissions: SubmissionRow[];
  leagues: LeagueRow[];
};

export type TableName = keyof Tables;

function fileFor(table: TableName) {
  return path.join(DATA_DIR, `${table}.json`);
}

const SETUP_DONE_FILE = path.join(DATA_DIR, '.setup-done');

/** True once first-run setup has fully finished (see server/seed.ts). */
export function hasData(): boolean {
  return existsSync(SETUP_DONE_FILE);
}

export function markSetupDone(): void {
  writeFileSync(SETUP_DONE_FILE, `${new Date().toISOString()}\n`);
}

export function readTable<T extends TableName>(table: T): Tables[T] {
  const file = fileFor(table);
  if (!existsSync(file)) return [] as Tables[T];
  return JSON.parse(readFileSync(file, 'utf8')) as Tables[T];
}

export function writeTable<T extends TableName>(table: T, rows: Tables[T]): void {
  mkdirSync(DATA_DIR, { recursive: true });
  // Write to a temp file first, then swap it in, so a crash never leaves half a file.
  const file = fileFor(table);
  const temp = `${file}.tmp`;
  const contents = `${JSON.stringify(rows, null, 2)}\n`;
  writeFileSync(temp, contents);

  // On Windows, OneDrive, antivirus or an open editor can lock a file for a moment.
  // Retry the swap a few times before falling back to writing the file directly.
  for (let attempt = 1; attempt <= 10; attempt += 1) {
    try {
      renameSync(temp, file);
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== 'EPERM' && code !== 'EBUSY' && code !== 'EACCES') throw error;
      pause(attempt * 20);
    }
  }
  writeFileSync(file, contents);
  rmSync(temp, { force: true });
}

/** Blocks for a few milliseconds (used only between retries above). */
function pause(ms: number) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}
