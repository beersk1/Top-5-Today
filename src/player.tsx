// Who is playing right now. Replaces sign-in: you just pick (or create) a name.
// The chosen player's id is remembered in this browser's localStorage.

import { createContext, useContext, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Player } from '../shared/types';
import { getSavedPlayerId, savePlayerId, usePlayers } from './api';

type PlayerContextValue = {
  player: Player | null;
  players: Player[];
  loading: boolean;
  serverDown: boolean;
  choosePlayer: (player: Player) => void;
  switchPlayer: () => void;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const playersQuery = usePlayers();
  const [playerId, setPlayerId] = useState(getSavedPlayerId);
  const players = playersQuery.data ?? [];

  const changePlayer = (id: string | null) => {
    savePlayerId(id);
    setPlayerId(id);
    // Forget the previous player's data, but keep the player list.
    queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== 'players' });
  };

  const value: PlayerContextValue = {
    player: players.find((p) => p.id === playerId) ?? null,
    players,
    loading: playersQuery.isLoading,
    serverDown: playersQuery.isError,
    choosePlayer: (player) => {
      // Make sure a just-created player is in the list straight away.
      queryClient.setQueryData<Player[]>(['players'], (list = []) =>
        list.some((p) => p.id === player.id) ? list : [...list, player],
      );
      changePlayer(player.id);
    },
    switchPlayer: () => changePlayer(null),
  };

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const value = useContext(PlayerContext);
  if (!value) throw new Error('usePlayer must be used inside <PlayerProvider>');
  return value;
}
