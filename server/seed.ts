// Runs once, the first time the server starts with an empty data/ folder.

import { randomUUID } from 'node:crypto';
import { addDays, getOrCreateTopicForDay, utcDay } from './game';
import { ADD_SAMPLE_PLAYERS, SAMPLE_LEAGUE, SAMPLE_PLAYER_NAMES } from './sample-data';
import { rmSync } from 'node:fs';
import { DATA_DIR, hasData, markSetupDone, writeTable, type PlayerRow } from './store';

/** How many past days get a topic (with sample answers) so the archive isn't empty. */
const PAST_DAYS_TO_FILL = 6;

export function seedIfEmpty(): void {
  if (hasData()) return;
  // If a previous setup was interrupted, start it again from scratch.
  rmSync(DATA_DIR, { recursive: true, force: true });

  const now = new Date().toISOString();
  const samplePlayers: PlayerRow[] = ADD_SAMPLE_PLAYERS
    ? SAMPLE_PLAYER_NAMES.map((name) => ({ id: randomUUID(), name, isSample: true, createdAt: now }))
    : [];

  writeTable('players', samplePlayers);
  writeTable('topics', []);
  writeTable('entries', []);
  writeTable('submissions', []);
  writeTable('leagues', []);

  if (!samplePlayers.length) {
    markSetupDone();
    console.log('Created an empty data/ folder.');
    return;
  }

  const today = utcDay();
  for (let daysAgo = PAST_DAYS_TO_FILL; daysAgo >= 1; daysAgo -= 1) {
    getOrCreateTopicForDay(addDays(today, -daysAgo));
  }
  getOrCreateTopicForDay(today);

  writeTable('leagues', [
    {
      id: randomUUID(),
      name: SAMPLE_LEAGUE.name,
      inviteCode: SAMPLE_LEAGUE.inviteCode,
      ownerId: samplePlayers[0].id,
      memberIds: samplePlayers.map((player) => player.id),
      createdAt: now,
    },
  ]);
  markSetupDone();

  console.log(
    `Created data/ with ${samplePlayers.length} sample players and a sample league (invite code ${SAMPLE_LEAGUE.inviteCode}).`,
  );
}
