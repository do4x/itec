import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Colors } from "@/constants/theme";
import { useAuth } from "./auth";
import { db, ref, set, onValue, serverTimestamp } from "./firebase";

export const TEAMS = {
  red: { name: "VANDALS", color: Colors.teamRed, glow: Colors.teamRed + "44" },
  blue: { name: "GHOSTS", color: Colors.teamCyan, glow: Colors.teamCyan + "44" },
  green: { name: "GLITCH", color: Colors.teamGreen, glow: Colors.teamGreen + "44" },
  yellow: { name: "NEON", color: Colors.teamYellow, glow: Colors.teamYellow + "44" },
} as const;

export type TeamId = keyof typeof TEAMS;

interface GameState {
  uid: string | null;
  username: string;
  teamId: TeamId;
  isJoined: boolean;
  isReady: boolean;
  isJury: boolean;
  setUsername: (name: string) => void;
  setTeamId: (team: TeamId) => void;
  join: () => void;
  setIsJury: (v: boolean) => void;
}

const GameContext = createContext<GameState | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
// #region agent log
console.error('[DBG b64100] GameProvider RENDER');
// #endregion
  const { uid, isReady: authReady } = useAuth();
  const [username, setUsername] = useState("");
  const [teamId, setTeamId] = useState<TeamId>("red");
  const [isJoined, setIsJoined] = useState(false);
  const [isJury, setIsJury] = useState(false);
  const [restored, setRestored] = useState(false);

  // Restore session from Firebase on auth ready
  useEffect(() => {
    if (!uid) {
      setRestored(true); // auth eșuat — nu bloca UI-ul
      return;
    }
    const userRef = ref(db, `users/${uid}`);
    onValue(userRef, (snap) => {
      const data = snap.val();
      if (data?.username) {
        setUsername(data.username);
        setTeamId(data.teamId || "red");
        setIsJoined(true);
        setIsJury(data.isJury || false);
      }
      setRestored(true);
    }, { onlyOnce: true });
  }, [uid]);

  const join = () => {
    setIsJoined(true);
    if (uid) {
      set(ref(db, `users/${uid}`), {
        username,
        teamId,
        tokens: 100,
        lastTokenGrant: serverTimestamp(),
        joinedAt: serverTimestamp(),
        isJury: false,
      });
    }
  };

  return (
    <GameContext.Provider
      value={{
        uid,
        username,
        teamId,
        isJoined,
        isReady: authReady && restored,
        isJury,
        setUsername,
        setTeamId,
        join,
        setIsJury,
      }}
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
