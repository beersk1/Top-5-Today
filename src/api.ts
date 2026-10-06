// Everything the website asks the local server for.
// Each `use...` hook loads data (with caching and loading/error states from React Query).

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ArchivedTopic,
  League,
  LeagueToday,
  PlannedTopic,
  Player,
  Profile,
  Submission,
  Suggestion,
  TodayResponse,
  TopicInput,
  TopicResults,
} from '../shared/types';

const PLAYER_KEY = 'top5-player-id';

export function getSavedPlayerId(): string | null {
  try {
    return localStorage.getItem(PLAYER_KEY);
  } catch {
    return null;
  }
}

export function savePlayerId(id: string | null) {
  try {
    if (id) localStorage.setItem(PLAYER_KEY, id);
    else localStorage.removeItem(PLAYER_KEY);
  } catch {
    // Storage blocked (e.g. private window). The app still works until the tab closes.
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  const playerId = getSavedPlayerId();
  if (playerId) headers['x-player-id'] = playerId;
  if (body !== undefined) headers['content-type'] = 'application/json';

  const response = await fetch(`/api${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(response.status, data?.error ?? `Request failed (${response.status}).`);
  }
  return data as T;
}

// ---------- Reading data ----------

// If the server isn't up yet (e.g. it's still starting), keep checking every 2 seconds.
const retryWhileDown = {
  retry: false,
  refetchInterval: (query: { state: { status: string } }) => (query.state.status === 'error' ? 2000 : false),
} as const;

export const useServerHealth = () =>
  useQuery({ queryKey: ['health'], queryFn: () => request<{ ok: boolean }>('/health'), ...retryWhileDown });

export const usePlayers = () =>
  useQuery({ queryKey: ['players'], queryFn: () => request<Player[]>('/players'), ...retryWhileDown });

export const useToday = () => useQuery({ queryKey: ['today'], queryFn: () => request<TodayResponse>('/today') });

export const useSuggestions = (topicId: string, query: string) =>
  useQuery({
    queryKey: ['suggestions', topicId, query],
    queryFn: () => request<Suggestion[]>(`/topics/${topicId}/suggestions?q=${encodeURIComponent(query)}`),
    enabled: query.length >= 2,
    placeholderData: keepPreviousData,
  });

export const useResults = (topicId: string) =>
  useQuery({ queryKey: ['results', topicId], queryFn: () => request<TopicResults>(`/topics/${topicId}/results`) });

export const useArchive = () =>
  useQuery({ queryKey: ['archive'], queryFn: () => request<ArchivedTopic[]>('/archive') });

export const useLeagues = () => useQuery({ queryKey: ['leagues'], queryFn: () => request<League[]>('/leagues') });

export const useLeagueToday = (leagueId: string, enabled: boolean) =>
  useQuery({
    queryKey: ['league-today', leagueId],
    queryFn: () => request<LeagueToday>(`/leagues/${leagueId}/today`),
    enabled,
  });

export const useProfile = () => useQuery({ queryKey: ['profile'], queryFn: () => request<Profile>('/profile') });

export const usePlannedTopics = () =>
  useQuery({ queryKey: ['planned-topics'], queryFn: () => request<PlannedTopic[]>('/planner/topics') });

// ---------- Changing data ----------
// After any change we refresh all loaded data. The app is small, so this is simplest.

function useAction<Input, Output>(action: (input: Input) => Promise<Output>) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: action, onSuccess: () => queryClient.invalidateQueries() });
}

export const useCreatePlayer = () => useAction((name: string) => request<Player>('/players', 'POST', { name }));

export const useSubmitPicks = (topicId: string) =>
  useAction((input: { picks: string[]; prediction: string | null }) =>
    request<Submission>(`/topics/${topicId}/submissions`, 'POST', input),
  );

export const useCreateLeague = () => useAction((name: string) => request<League>('/leagues', 'POST', { name }));

export const useJoinLeague = () =>
  useAction((inviteCode: string) => request<League>('/leagues/join', 'POST', { inviteCode }));

export const useSaveTopic = () =>
  useAction(({ day, ...topic }: TopicInput & { day: string }) =>
    request<PlannedTopic>(`/planner/topics/${day}`, 'PUT', topic),
  );
