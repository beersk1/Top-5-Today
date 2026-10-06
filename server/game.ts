// The rules of the game: daily topics, matching typed answers, scoring and stats.

import { randomUUID } from 'node:crypto';
import type { LeaderboardEntry, ProfileHistoryEntry, RankedPick, Submission, Topic } from '../shared/types';
import { presetForDay, seededRandom } from './sample-data';
import { readTable, writeTable, type EntryRow, type SubmissionRow, type TopicRow } from './store';

// ---------- Dates ----------
// Every day runs on UTC time, so everyone gets the same question at the same moment.

export function utcDay(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(day: string, amount: number): string {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return utcDay(date);
}

export function closesAt(day: string): string {
  return `${day}T23:59:59.999Z`;
}

export function isClosed(topic: TopicRow): boolean {
  return Date.parse(closesAt(topic.day)) <= Date.now();
}

export function isValidDay(day: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(day) && utcDay(new Date(`${day}T00:00:00.000Z`)) === day;
}

// ---------- Topics ----------

export function findTopic(topicId: string): TopicRow | undefined {
  return readTable('topics').find((topic) => topic.id === topicId);
}

export function findTopicForDay(day: string): TopicRow | undefined {
  return readTable('topics').find((topic) => topic.day === day);
}

export function saveTopic(day: string, title: string, description: string): TopicRow {
  const topics = readTable('topics');
  const existing = topics.find((topic) => topic.day === day);
  if (existing) {
    existing.title = title;
    existing.description = description;
  } else {
    topics.push({ id: randomUUID(), day, title, description, createdAt: new Date().toISOString() });
  }
  writeTable('topics', topics);
  return topics.find((topic) => topic.day === day)!;
}

/** Returns the topic for a day, creating it from the built-in rotation if nobody scheduled one. */
export function getOrCreateTopicForDay(day: string): TopicRow {
  const existing = findTopicForDay(day);
  if (existing) return existing;
  const preset = presetForDay(day);
  const topic = saveTopic(day, preset.title, preset.description);
  addSamplePicks(topic, preset.samplePicks);
  return topic;
}

export function getTodayTopic(): TopicRow {
  return getOrCreateTopicForDay(utcDay());
}

export function submissionsFor(topicId: string): SubmissionRow[] {
  return readTable('submissions').filter((submission) => submission.topicId === topicId);
}

export function toTopic(topic: TopicRow): Topic {
  return {
    id: topic.id,
    date: topic.day,
    title: topic.title,
    description: topic.description,
    closesAt: closesAt(topic.day),
    submissionCount: submissionsFor(topic.id).length,
  };
}

// ---------- Matching what people type ----------
// "the dark knight", "The Dark Knight!" and "Dark Knight" should all count as the same pick.

export function normalizeLabel(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('en')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/** Number of single-letter edits needed to turn one string into the other. */
function editDistance(left: string, right: string): number {
  const row = Array.from({ length: right.length + 1 }, (_, i) => i);
  for (let i = 1; i <= left.length; i += 1) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const above = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (left[i - 1] === right[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return row[right.length];
}

/** 0 = nothing alike, 1 = identical. Uses whichever is higher: letter similarity or shared words. */
export function textSimilarity(left: string, right: string): number {
  if (!left || !right) return 0;
  const letterScore = 1 - editDistance(left, right) / Math.max(left.length, right.length);
  const leftWords = new Set(left.split(' '));
  const rightWords = new Set(right.split(' '));
  const sharedWords = [...leftWords].filter((word) => rightWords.has(word)).length;
  const wordScore = sharedWords / Math.max(1, new Set([...leftWords, ...rightWords]).size);
  return Math.max(letterScore, wordScore);
}

function findOrCreateEntry(entries: EntryRow[], topicId: string, input: string): EntryRow {
  const label = input.trim().replace(/\s+/g, ' ');
  const normalized = normalizeLabel(label);
  const topicEntries = entries.filter((entry) => entry.topicId === topicId);

  const exact = topicEntries.find((entry) => entry.normalized === normalized || entry.aliases.includes(normalized));
  // Close-enough typo match, e.g. "Spirted Away" -> "Spirited Away". Only for longer names.
  const nearest = exact
    ? undefined
    : topicEntries
        .map((entry) => ({ entry, score: textSimilarity(normalized, entry.normalized) }))
        .filter(({ entry, score }) => Math.min(normalized.length, entry.normalized.length) >= 5 && score >= 0.86)
        .sort((a, b) => b.score - a.score)[0]?.entry;

  const match = exact ?? nearest;
  if (match) {
    if (match.normalized !== normalized && !match.aliases.includes(normalized)) {
      match.aliases.push(normalized);
    }
    return match;
  }
  const entry: EntryRow = { id: randomUUID(), topicId, label, normalized, aliases: [] };
  entries.push(entry);
  return entry;
}

/** Turns typed answers into entries, matching existing ones where possible. */
export function resolveEntries(topicId: string, inputs: string[]): EntryRow[] {
  const entries = readTable('entries');
  const resolved = inputs.map((input) => findOrCreateEntry(entries, topicId, input));
  writeTable('entries', entries);
  return resolved;
}

export function entryLabel(entryId: string | null): string | null {
  if (!entryId) return null;
  return readTable('entries').find((entry) => entry.id === entryId)?.label ?? null;
}

// ---------- Submitting a list ----------

export function addSubmission(
  topicId: string,
  playerId: string,
  pickLabels: string[],
  prediction: string | null,
  submittedAt = new Date().toISOString(),
): SubmissionRow {
  const resolved = resolveEntries(topicId, pickLabels);
  const predictionEntry = prediction ? resolveEntries(topicId, [prediction])[0] : null;
  const submission: SubmissionRow = {
    id: randomUUID(),
    topicId,
    playerId,
    picks: resolved.map((entry, index) => ({ entryId: entry.id, label: entry.label, rank: index + 1 })),
    predictionEntryId: predictionEntry?.id ?? null,
    submittedAt,
  };
  const submissions = readTable('submissions');
  submissions.push(submission);
  writeTable('submissions', submissions);
  return submission;
}

/** Fills a brand-new topic with lists from the sample players (if there are any). */
export function addSamplePicks(topic: TopicRow, pool: string[]): void {
  const samplePlayers = readTable('players').filter((player) => player.isSample);
  if (!samplePlayers.length || pool.length < 5) return;
  const today = utcDay();
  const submittedAt = topic.day < today ? `${topic.day}T12:00:00.000Z` : new Date().toISOString();
  for (const player of samplePlayers) {
    const random = seededRandom(`${topic.day}:${player.name}`);
    // Shuffle with a bias so items near the top of the pool show up more often.
    const picks = pool
      .map((label, index) => ({ label, sortKey: random() * (1 + index * 0.3) }))
      .sort((a, b) => a.sortKey - b.sortKey)
      .slice(0, 5)
      .map(({ label }) => label);
    const prediction = random() < 0.6 ? pool[Math.floor(random() * 3)] : null;
    addSubmission(topic.id, player.id, picks, prediction, submittedAt);
  }
}

export function findSubmission(topicId: string, playerId: string): SubmissionRow | undefined {
  return readTable('submissions').find(
    (submission) => submission.topicId === topicId && submission.playerId === playerId,
  );
}

export function predictionCorrect(topic: TopicRow, predictionEntryId: string | null): boolean | null {
  if (!isClosed(topic)) return null;
  return Boolean(predictionEntryId && buildLeaderboard(topic.id)[0]?.entryId === predictionEntryId);
}

export function toSubmission(topic: TopicRow, submission: SubmissionRow): Submission {
  return {
    topicId: topic.id,
    picks: submission.picks,
    prediction: entryLabel(submission.predictionEntryId),
    predictionCorrect: predictionCorrect(topic, submission.predictionEntryId),
    submittedAt: submission.submittedAt,
  };
}

// ---------- Scoring ----------

/**
 * Crowd leaderboard. A #1 pick is worth 5 points, #2 is worth 4 ... #5 is worth 1.
 * Ties are broken by number of #1 votes, then alphabetically.
 */
export function buildLeaderboard(
  topicId: string,
  submissions: Array<{ picks: RankedPick[] }> = submissionsFor(topicId),
): LeaderboardEntry[] {
  const labels = new Map(
    readTable('entries')
      .filter((entry) => entry.topicId === topicId)
      .map((entry) => [entry.id, entry.label]),
  );
  const scores = new Map<string, { points: number; picks: number; firstPlaceCount: number }>();
  for (const submission of submissions) {
    for (const pick of submission.picks) {
      const score = scores.get(pick.entryId) ?? { points: 0, picks: 0, firstPlaceCount: 0 };
      score.points += Math.max(0, 6 - pick.rank);
      score.picks += 1;
      if (pick.rank === 1) score.firstPlaceCount += 1;
      scores.set(pick.entryId, score);
    }
  }
  const total = submissions.length;
  return [...scores.entries()]
    .map(([entryId, score]) => ({
      entryId,
      label: labels.get(entryId) ?? 'Unknown pick',
      points: score.points,
      pickPercent: total ? Math.round((score.picks / total) * 100) : 0,
      firstPlaceCount: score.firstPlaceCount,
    }))
    .sort((a, b) => b.points - a.points || b.firstPlaceCount - a.firstPlaceCount || a.label.localeCompare(b.label))
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

/**
 * How unusual a list is, from 0 (exactly what the crowd said) to 100 (nobody else agrees).
 * 65% comes from picking rare items, 35% from ranking items differently than the crowd.
 */
export function hotTakeScore(picks: RankedPick[], submissions: Array<{ picks: RankedPick[] }>): number {
  const total = Math.max(submissions.length, 1);
  const ranksByEntry = new Map<string, number[]>();
  for (const submission of submissions) {
    for (const pick of submission.picks) {
      ranksByEntry.set(pick.entryId, [...(ranksByEntry.get(pick.entryId) ?? []), pick.rank]);
    }
  }
  const count = Math.max(picks.length, 1);
  const rarity =
    picks.reduce((sum, pick) => sum + (1 - (ranksByEntry.get(pick.entryId)?.length ?? 0) / total), 0) / count;
  const rankDifference =
    picks.reduce((sum, pick) => {
      const ranks = ranksByEntry.get(pick.entryId) ?? [];
      const crowdRank = ranks.length ? ranks.reduce((a, b) => a + b, 0) / ranks.length : pick.rank;
      return sum + Math.abs(pick.rank - crowdRank) / 4;
    }, 0) / count;
  return Math.round(Math.min(100, Math.max(0, rarity * 65 + rankDifference * 35)));
}

/** How alike two lists are, from 0 to 1. 70% shared items, 30% similar ranking of those items. */
export function listSimilarity(left: RankedPick[], right: RankedPick[]): number {
  const rightRanks = new Map(right.map((pick) => [pick.entryId, pick.rank]));
  const shared = left.filter((pick) => rightRanks.has(pick.entryId));
  const rankDelta = shared.reduce((sum, pick) => sum + Math.abs(pick.rank - rightRanks.get(pick.entryId)!), 0);
  const rankMatch = shared.length ? 1 - rankDelta / (shared.length * 4) : 0;
  return Math.max(0, (shared.length / 5) * 0.7 + rankMatch * 0.3);
}

/** Short, human sentences shown under the results. */
export function buildInsights(
  yourPicks: RankedPick[],
  allSubmissions: SubmissionRow[],
  leaderboard: LeaderboardEntry[],
): string[] {
  const total = allSubmissions.length;
  const timesPicked = new Map<string, number>();
  for (const submission of allSubmissions) {
    for (const pick of submission.picks) {
      timesPicked.set(pick.entryId, (timesPicked.get(pick.entryId) ?? 0) + 1);
    }
  }
  const countFor = (entryId: string) => timesPicked.get(entryId) ?? 0;
  const yourEntryIds = new Set(yourPicks.map((pick) => pick.entryId));
  const insights: string[] = [];

  const leftOut = leaderboard.filter((entry) => !yourEntryIds.has(entry.entryId)).slice(0, 3);
  if (leftOut.length) {
    insights.push(`Popular picks you left out: ${leftOut.map((entry) => entry.label).join(', ')}.`);
  }
  const byPopularity = [...yourPicks].sort((a, b) => countFor(b.entryId) - countFor(a.entryId));
  const mostMainstream = byPopularity[0];
  const boldest = byPopularity[byPopularity.length - 1];
  if (mostMainstream) {
    const percent = Math.round((countFor(mostMainstream.entryId) / Math.max(total, 1)) * 100);
    insights.push(`Your most mainstream pick was ${mostMainstream.label} (${percent}% included it).`);
  }
  if (boldest) {
    insights.push(
      `Your boldest pick was ${boldest.label} (${countFor(boldest.entryId)} of ${total} lists included it).`,
    );
  }
  const fifth = yourPicks.find((pick) => pick.rank === 5);
  if (fifth && leaderboard[0]?.entryId === fifth.entryId) {
    insights.push("Your #5 was the crowd's overall #1 pick.");
  }
  return insights;
}

// ---------- Player stats ----------

export function playerHistory(playerId: string): ProfileHistoryEntry[] {
  const topics = readTable('topics');
  return readTable('submissions')
    .filter((submission) => submission.playerId === playerId)
    .map((submission) => ({ submission, topic: topics.find((topic) => topic.id === submission.topicId) }))
    .filter((row): row is { submission: SubmissionRow; topic: TopicRow } => Boolean(row.topic))
    .sort((a, b) => b.topic.day.localeCompare(a.topic.day))
    .map(({ submission, topic }) => ({
      topic: toTopic(topic),
      picks: submission.picks,
      prediction: entryLabel(submission.predictionEntryId),
      predictionCorrect: predictionCorrect(topic, submission.predictionEntryId),
      hotTakeScore: hotTakeScore(submission.picks, submissionsFor(topic.id)),
    }));
}

/** Days in a row with a submitted list, counting back from today (or yesterday if today isn't done yet). */
export function currentStreak(history: ProfileHistoryEntry[]): number {
  const days = new Set(history.map((item) => item.topic.date));
  const today = utcDay();
  let day = days.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (days.has(day)) {
    streak += 1;
    day = addDays(day, -1);
  }
  return streak;
}
