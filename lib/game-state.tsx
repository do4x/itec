// lib/game-state.tsx
// ============================================
// Global game state — who you are, what team, what poster you're on
// ============================================

import React, { createContext, useContext, useState, ReactNode } from "react";
import { Colors } from "@/constants/theme";

export const TEAMS = {
  red: { name: "VANDALS", color: Colors.teamRed, glow: Colors.teamRed + "44" },
  blue: { name: "GHOSTS", color: Colors.teamCyan, glow: Colors.teamCyan + "44" },
  green: { name: "GLITCH", color: Colors.teamGreen, glow: Colors.teamGreen + "44" },
  yellow: { name: "NEON", color: Colors.teamYellow, glow: Colors.teamYellow + "44" },
} as const;

export type TeamId = keyof typeof TEAMS;

interface GameState {
  username: string;
  teamId: TeamId;
  isJoined: boolean;
  setUsername: (name: string) => void;
  setTeamId: (team: TeamId) => void;
  join: () => void;
}

const GameContext = createContext<GameState | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState("");
  const [teamId, setTeamId] = useState<TeamId>("red");
  const [isJoined, setIsJoined] = useState(false);

  const join = () => setIsJoined(true);

  return (
    <GameContext.Provider
      value={{ username, teamId, isJoined, setUsername, setTeamId, join }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
