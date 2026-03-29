import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Colors } from "@/constants/theme";
import { AVATARS } from "@/constants/avatars";
import { useAuth } from "./auth";
import { db, ref, set, get, onValue, runTransaction, serverTimestamp } from "./firebase";

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
  avatar: string;
  isJoined: boolean;
  isReady: boolean;
  isJury: boolean;
  isGuest: boolean;
  isAuthenticated: boolean;
  setUsername: (name: string) => void;
  setTeamId: (team: TeamId) => void;
  setAvatar: (avatarId: string) => void;
  join: () => Promise<boolean>;
  logout: () => Promise<void>;
  setIsJury: (v: boolean) => void;
}

const GameContext = createContext<GameState | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const { uid, isReady: authReady, isGuest, isAuthenticated, logout: authLogout } = useAuth();
  const [username, setUsername] = useState("");
  const [teamId, setTeamId] = useState<TeamId>("red");
  const [avatar, setAvatar] = useState(AVATARS[0].id);
  const [isJoined, setIsJoined] = useState(false);
  const [isJury, setIsJury] = useState(false);
  const [restored, setRestored] = useState(false);

  // Reset all state on logout (uid becomes null) or restore from Firebase on login
  useEffect(() => {
    if (!uid) {
      setIsJoined(false);
      setUsername("");
      setTeamId("red");
      setAvatar(AVATARS[0].id);
      setIsJury(false);
      setRestored(true);
      return;
    }

    // Guest users skip Firebase restore — they'll fill in onboarding fresh
    if (isGuest) {
      setRestored(true);
      return;
    }

    const userRef = ref(db, `users/${uid}`);
    onValue(userRef, (snap) => {
      const data = snap.val();
      if (data?.username) {
        setUsername(data.username);
        setTeamId(data.teamId || "red");
        setAvatar(data.avatar || AVATARS[0].id);
        setIsJoined(true);
        setIsJury(data.isJury || false);
      }
      setRestored(true);
    }, { onlyOnce: true });
  }, [uid, isGuest]);

  const join = async (): Promise<boolean> => {
    // Guests skip uniqueness check and Firebase writes
    if (isGuest) {
      setIsJoined(true);
      return true;
    }
    if (!uid) return false;

    // Atomic claim: usernames/${key} = uid (case-insensitive key)
    const key = username.toLowerCase().trim();
    const nicknameRef = ref(db, `usernames/${key}`);
    const result = await runTransaction(nicknameRef, (current) => {
      if (current === null || current === uid) return uid; // unclaimed or already ours
      return; // abort — taken by someone else
    });

    if (!result.committed) return false; // nickname taken

    const finalAvatar = avatar || AVATARS[Math.floor(Math.random() * AVATARS.length)].id;
    setAvatar(finalAvatar);
    setIsJoined(true);
    set(ref(db, `users/${uid}`), {
      username,
      teamId,
      avatar: finalAvatar,
      tokens: 200,
      lastTokenGrant: serverTimestamp(),
      joinedAt: serverTimestamp(),
      isJury: false,
    });
    return true;
  };

  const logout = async () => {
    await authLogout();
    // State reset is handled by the uid useEffect above
  };

  return (
    <GameContext.Provider
      value={{
        uid,
        username,
        teamId,
        avatar,
        isJoined,
        isReady: authReady && restored,
        isJury,
        isGuest,
        isAuthenticated,
        setUsername,
        setTeamId,
        setAvatar,
        join,
        logout,
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
