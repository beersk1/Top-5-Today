// Shapes of the data the server sends to the browser.
// Both server/ and src/ import from this file, so they always agree.

export type Player = {
  id: string;
  name: string;
  createdAt: string;
};

/** One item in someone's ranked list. rank 1 is the top pick. */
export type RankedPick = {
  entryId: string;
  label: string;
  rank: number;
};

export type Topic = {
  id: string;
  /** Calendar day in YYYY-MM-DD (UTC). */
  date: string;
  title: string;
  description: string;
  /** ISO timestamp; submissions close at the end of the UTC day. */
  closesAt: string;
  submissionCount: number;
};

export type Submission = {
  topicId: string;
  picks: RankedPick[];
  prediction: string | null;
  /** null until the day closes. */
  predictionCorrect: boolean | null;
  submittedAt: string;
};

export type TodayResponse = {
  topic: Topic;
  hasSubmitted: boolean;
  submission: Submission | null;
};

export type Suggestion = {
  id: string;
  label: string;
  pickCount: number;
};

export type LeaderboardEntry = {
  rank: number;
  entryId: string;
  label: string;
  points: number;
  pickPercent: number;
  firstPlaceCount: number;
};

export type TopicResults = {
  topic: Topic;
  totalSubmissions: number;
  leaderboard: LeaderboardEntry[];
  yourPicks: Array<RankedPick & { otherUserCount: number }>;
  hotTakeScore: number;
  prediction: string | null;
  predictionCorrect: boolean | null;
  insights: string[];
};

export type ArchivedTopic = {
  topic: Topic;
  topPicks: LeaderboardEntry[];
};

export type League = {
  id: string;
  name: string;
  inviteCode: string;
  memberCount: number;
  createdAt: string;
};

export type LeagueMember = {
  playerId: string;
  name: string;
  submitted: boolean;
  picks: RankedPick[];
};

export type LeagueToday = {
  league: League;
  topic: Topic;
  members: LeagueMember[];
  similarity: { mostSimilar: string | null; leastSimilar: string | null };
  leaderboard: LeaderboardEntry[];
};

export type ProfileHistoryEntry = {
  topic: Topic;
  picks: RankedPick[];
  prediction: string | null;
  predictionCorrect: boolean | null;
  hotTakeScore: number;
};

export type Profile = {
  name: string;
  streak: number;
  predictionAccuracy: number;
  averageHotTakeScore: number;
  history: ProfileHistoryEntry[];
};

/** A topic as shown on the topic planner page. */
export type PlannedTopic = Topic & {
  /** False once a real (non-sample) player has submitted a list. */
  editable: boolean;
};

export type TopicInput = {
  title: string;
  description: string;
};
