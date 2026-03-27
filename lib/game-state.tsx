// lib/game-state.tsx
// ============================================
// Global game state — who you are, what team, what poster you're on
// ============================================

import React, { createContext, useContext, useState, ReactNode } from "react";

// Team colors — neon graffiti aesthetic
export const TEAMS = {
  red: { name: "VANDALS", color: "#FF2E63", glow: "#FF2E6366" },
  blue: { name: "GHOSTS", color: "#08F7FE", glow: "#08F7FE66" },
  green: { name: "GLITCH", color: "#39FF14", glow: "#39FF1466" },
  yellow: { name: "NEON", color: "#FFE400", glow: "#FFE40066" },
} as const;

export type TeamId = keyof typeof TEAMS;

interface GameState {
  username: string;
  teamId: TeamId;
  setUsername: (name: string) => void;
  setTeamId: (team: TeamId) => void;
}

const GameContext = createContext<GameState | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState("");
  const [teamId, setTeamId] = useState<TeamId>("red");

  return (
    <GameContext.Provider value={{ username, teamId, setUsername, setTeamId }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
