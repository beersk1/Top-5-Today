// Every URL the app calls lives here. All of them start with /api (see server/index.ts).
// The browser says who is playing by sending an `x-player-id` header.

import { randomBytes, randomUUID } from 'node:crypto';
import { Router, type Request } from 'express';
import type {
  ArchivedTopic,
  League,
  LeagueToday,
  PlannedTopic,
  Player,
  Profile,
  Suggestion,
  TodayResponse,
  TopicResults,
} from '../shared/types';
import {
  addSubmission,
  buildInsights,
  buildLeaderboard,
  currentStreak,
  findSubmission,
  findTopic,
  findTopicForDay,
  getTodayTopic,
  hotTakeScore,
  isClosed,
  isValidDay,
  listSimilarity,
  normalizeLabel,
  playerHistory,
  saveTopic,
  submissionsFor,
  textSimilarity,
  toSubmission,
  toTopic,
  utcDay,
} from './game';
import { readTable, writeTable, type LeagueRow, type PlayerRow } from './store';

export const router = Router();

/** Throw this to send an error message back to the browser with a status code. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

// ---------- Small helpers ----------

function currentPlayer(req: Request): PlayerRow {
  const id = req.get('x-player-id');
  const player = id ? readTable('players').find((p) => p.id === id && !p.isSample) : undefined;
  if (!player) throw new HttpError(401, 'Pick a player first.');
  return player;
}

/** Reads a required text field and checks its length. */
function text(value: unknown, field: string, min: number, max: number): string {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (trimmed.length < min || trimmed.length > max) {
    throw new HttpError(400, `${field} must be ${min}–${max} characters.`);
  }
  return trimmed;
}

function requireTopic(topicId: string) {
  const topic = findTopic(topicId);
  if (!topic) throw new HttpError(404, 'Topic not found.');
  return topic;
}

function toPlayer(player: PlayerRow): Player {
  return { id: player.id, name: player.name, createdAt: player.createdAt };
}

function toLeague(league: LeagueRow): League {
  return {
    id: league.id,
    name: league.name,
    inviteCode: league.inviteCode,
    memberCount: league.memberIds.length,
    createdAt: league.createdAt,
  };
}

// ---------- Health ----------

router.get('/health', (_req, res) => {
  res.json({ ok: true });
});

// ---------- Players (replaces sign-in) ----------

router.get('/players', (_req, res) => {
  const players: Player[] = readTable('players')
    .filter((player) => !player.isSample)
    .map(toPlayer);
  res.json(players);
});

router.post('/players', (req, res) => {
  const name = text(req.body?.name, 'Name', 1, 40);
  const players = readTable('players');
  if (players.some((player) => player.name.toLowerCase() === name.toLowerCase())) {
    throw new HttpError(409, 'That name is already taken. Pick a different one.');
  }
  const player: PlayerRow = { id: randomUUID(), name, isSample: false, createdAt: new Date().toISOString() };
  players.push(player);
  writeTable('players', players);
  res.status(201).json(toPlayer(player));
});

// ---------- Today's topic ----------

router.get('/today', (req, res) => {
  const player = currentPlayer(req);
  const topic = getTodayTopic();
  const submission = findSubmission(topic.id, player.id);
  const response: TodayResponse = {
    topic: toTopic(topic),
    hasSubmitted: Boolean(submission),
    submission: submission ? toSubmission(topic, submission) : null,
  };
  res.json(response);
});

/** Autocomplete while typing a pick: answers other people already gave for this topic. */
router.get('/topics/:topicId/suggestions', (req, res) => {
  const topic = requireTopic(req.params.topicId);
  const query = normalizeLabel(typeof req.query.q === 'string' ? req.query.q : '');
  if (query.length < 2) {
    res.json([]);
    return;
  }
  const timesPicked = new Map<string, number>();
  for (const submission of submissionsFor(topic.id)) {
    for (const pick of submission.picks) {
      timesPicked.set(pick.entryId, (timesPicked.get(pick.entryId) ?? 0) + 1);
    }
  }
  const suggestions: Suggestion[] = readTable('entries')
    .filter((entry) => entry.topicId === topic.id)
    .map((entry) => ({
      id: entry.id,
      label: entry.label,
      pickCount: timesPicked.get(entry.id) ?? 0,
      score: Math.max(textSimilarity(query, entry.normalized), entry.normalized.includes(query) ? 0.9 : 0),
    }))
    .filter(({ score }) => score >= 0.45)
    .sort((a, b) => b.score - a.score || b.pickCount - a.pickCount)
    .slice(0, 8)
    .map(({ id, label, pickCount }) => ({ id, label, pickCount }));
  res.json(suggestions);
});

router.post('/topics/:topicId/submissions', (req, res) => {
  const player = currentPlayer(req);
  const topic = requireTopic(req.params.topicId);
  if (isClosed(topic)) throw new HttpError(400, 'This topic has closed.');
  if (findSubmission(topic.id, player.id)) throw new HttpError(409, 'Your list is already locked for today.');

  const rawPicks: unknown = req.body?.picks;
  if (!Array.isArray(rawPicks) || rawPicks.length !== 5) {
    throw new HttpError(400, 'Send exactly five picks.');
  }
  const picks = rawPicks.map((pick, i) => text(pick, `Pick #${i + 1}`, 1, 120));
  if (picks.some((pick) => !normalizeLabel(pick))) {
    throw new HttpError(400, 'Each pick needs at least one letter or number.');
  }
  if (new Set(picks.map(normalizeLabel)).size !== 5) {
    throw new HttpError(400, 'Choose five different picks.');
  }
  const rawPrediction = typeof req.body?.prediction === 'string' ? req.body.prediction.trim() : '';
  const prediction = rawPrediction ? text(rawPrediction, 'Prediction', 1, 120) : null;

  const submission = addSubmission(topic.id, player.id, picks, prediction);
  // Two different spellings can still match the same entry (e.g. a typo of another pick).
  if (new Set(submission.picks.map((pick) => pick.entryId)).size !== 5) {
    writeTable(
      'submissions',
      readTable('submissions').filter((row) => row.id !== submission.id),
    );
    throw new HttpError(400, 'Two of your picks look like the same thing. Choose five different picks.');
  }
  res.status(201).json(toSubmission(topic, submission));
});

router.get('/topics/:topicId/results', (req, res) => {
  const player = currentPlayer(req);
  const topic = requireTopic(req.params.topicId);
  const submission = findSubmission(topic.id, player.id);
  if (!submission) throw new HttpError(403, 'Submit your own top five before viewing results.');

  const allSubmissions = submissionsFor(topic.id);
  const leaderboard = buildLeaderboard(topic.id, allSubmissions);
  const yours = toSubmission(topic, submission);
  const response: TopicResults = {
    topic: toTopic(topic),
    totalSubmissions: allSubmissions.length,
    leaderboard: leaderboard.slice(0, 5),
    yourPicks: submission.picks.map((pick) => ({
      ...pick,
      otherUserCount: new Set(
        allSubmissions
          .filter((other) => other.playerId !== player.id && other.picks.some((item) => item.entryId === pick.entryId))
          .map((other) => other.playerId),
      ).size,
    })),
    hotTakeScore: hotTakeScore(submission.picks, allSubmissions),
    prediction: yours.prediction,
    predictionCorrect: yours.predictionCorrect,
    insights: buildInsights(submission.picks, allSubmissions, leaderboard),
  };
  res.json(response);
});

// ---------- Archive ----------

router.get('/archive', (_req, res) => {
  const today = utcDay();
  const archive: ArchivedTopic[] = readTable('topics')
    .filter((topic) => topic.day < today)
    .sort((a, b) => b.day.localeCompare(a.day))
    .map((topic) => ({ topic: toTopic(topic), topPicks: buildLeaderboard(topic.id).slice(0, 5) }));
  res.json(archive);
});

// ---------- Leagues ----------

router.get('/leagues', (req, res) => {
  const player = currentPlayer(req);
  const leagues = readTable('leagues')
    .filter((league) => league.memberIds.includes(player.id))
    .map(toLeague);
  res.json(leagues);
});

router.post('/leagues', (req, res) => {
  const player = currentPlayer(req);
  const name = text(req.body?.name, 'League name', 2, 48);
  const leagues = readTable('leagues');
  const league: LeagueRow = {
    id: randomUUID(),
    name,
    inviteCode: randomBytes(4).toString('hex').toUpperCase(),
    ownerId: player.id,
    memberIds: [player.id],
    createdAt: new Date().toISOString(),
  };
  leagues.push(league);
  writeTable('leagues', leagues);
  res.status(201).json(toLeague(league));
});

router.post('/leagues/join', (req, res) => {
  const player = currentPlayer(req);
  const code = text(req.body?.inviteCode, 'Invite code', 6, 16).toUpperCase();
  const leagues = readTable('leagues');
  const league = leagues.find((item) => item.inviteCode === code);
  if (!league) throw new HttpError(404, 'That invite code was not found.');
  if (!league.memberIds.includes(player.id)) {
    league.memberIds.push(player.id);
    writeTable('leagues', leagues);
  }
  res.json(toLeague(league));
});

router.get('/leagues/:leagueId/today', (req, res) => {
  const player = currentPlayer(req);
  const league = readTable('leagues').find((item) => item.id === req.params.leagueId);
  if (!league) throw new HttpError(404, 'League not found.');
  if (!league.memberIds.includes(player.id)) throw new HttpError(403, 'Join this league to view its picks.');

  const topic = getTodayTopic();
  const ownSubmission = findSubmission(topic.id, player.id);
  if (!ownSubmission) throw new HttpError(403, 'Submit your own top five before viewing league picks.');

  const players = readTable('players');
  const todaysSubmissions = submissionsFor(topic.id);
  const members = league.memberIds.map((memberId) => ({
    playerId: memberId,
    name: players.find((p) => p.id === memberId)?.name ?? 'Unknown player',
    submission: todaysSubmissions.find((s) => s.playerId === memberId),
  }));

  const others = members
    .filter((member) => member.playerId !== player.id && member.submission)
    .map((member) => ({ name: member.name, score: listSimilarity(ownSubmission.picks, member.submission!.picks) }))
    .sort((a, b) => b.score - a.score);

  const leagueSubmissions = members.flatMap((member) => (member.submission ? [member.submission] : []));
  const response: LeagueToday = {
    league: toLeague(league),
    topic: toTopic(topic),
    members: members.map((member) => ({
      playerId: member.playerId,
      name: member.name,
      submitted: Boolean(member.submission),
      picks: member.submission?.picks ?? [],
    })),
    similarity: {
      mostSimilar: others[0]?.name ?? null,
      leastSimilar: others.length > 1 ? others[others.length - 1].name : null,
    },
    leaderboard: buildLeaderboard(topic.id, leagueSubmissions).slice(0, 5),
  };
  res.json(response);
});

// ---------- Profile ----------

router.get('/profile', (req, res) => {
  const player = currentPlayer(req);
  const history = playerHistory(player.id);
  const resolved = history.filter((item) => item.prediction !== null && item.predictionCorrect !== null);
  const correct = resolved.filter((item) => item.predictionCorrect).length;
  const profile: Profile = {
    name: player.name,
    streak: currentStreak(history),
    predictionAccuracy: resolved.length ? Math.round((correct / resolved.length) * 100) : 0,
    averageHotTakeScore: history.length
      ? Math.round(history.reduce((sum, item) => sum + item.hotTakeScore, 0) / history.length)
      : 0,
    history,
  };
  res.json(profile);
});

// ---------- Topic planner ----------
// Anyone can schedule questions. A topic is locked once a real player submits a list.

function realSubmissionCount(topicId: string): number {
  const samplePlayerIds = new Set(
    readTable('players')
      .filter((player) => player.isSample)
      .map((player) => player.id),
  );
  return submissionsFor(topicId).filter((submission) => !samplePlayerIds.has(submission.playerId)).length;
}

router.get('/planner/topics', (_req, res) => {
  const today = utcDay();
  const topics: PlannedTopic[] = readTable('topics')
    .filter((topic) => topic.day >= today)
    .sort((a, b) => a.day.localeCompare(b.day))
    .map((topic) => ({ ...toTopic(topic), editable: realSubmissionCount(topic.id) === 0 }));
  res.json(topics);
});

router.put('/planner/topics/:day', (req, res) => {
  const day = req.params.day;
  if (!isValidDay(day) || day < utcDay()) throw new HttpError(400, 'Choose today or a future date.');
  const title = text(req.body?.title, 'Question', 3, 140);
  const description = typeof req.body?.description === 'string' ? req.body.description.trim().slice(0, 500) : '';

  const existing = findTopicForDay(day);
  if (existing) {
    if (realSubmissionCount(existing.id) > 0) {
      throw new HttpError(409, 'This topic already has submissions and can no longer be edited.');
    }
    // Sample answers were for the old question, so clear them out.
    writeTable(
      'submissions',
      readTable('submissions').filter((row) => row.topicId !== existing.id),
    );
    writeTable(
      'entries',
      readTable('entries').filter((row) => row.topicId !== existing.id),
    );
  }
  const topic = saveTopic(day, title, description);
  const planned: PlannedTopic = { ...toTopic(topic), editable: true };
  res.json(planned);
});
