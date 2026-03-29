import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import * as Haptics from "expo-haptics";
import { db, ref, onValue } from "./firebase";
import { useGame } from "./game-state";
import { POSTER_DESIGNS } from "@/constants/poster-designs";
import type { ActivityType } from "./notifications";

interface ToastState {
  message: string;
  type: "info" | "warning" | "success";
  glitch: boolean;
}

interface NotificationContextValue {
  toast: ToastState | null;
  toastVisible: boolean;
  hideToast: () => void;
}

const NotificationContext = createContext<NotificationContextValue>({
  toast: null,
  toastVisible: false,
  hideToast: () => {},
});

function buildMessage(
  type: ActivityType,
  actorUsername: string,
  posterName: string,
  targetUsername?: string
): string {
  switch (type) {
    case "pixel_override":
      return `\u26A0 ${actorUsername} drew over your pixel on ${posterName}`;
    case "pixel_delete":
      return `\u26A0 ${actorUsername} erased your pixel on ${posterName}`;
    case "gif_delete":
      return `\u26A0 ${actorUsername} deleted your sticker on ${posterName}`;
    case "anthem_override":
      return `\u26A0 Rivals took the anthem on ${posterName}`;
    case "territory_change":
      return `\u26A0 Your team lost territory on ${posterName}!`;
    case "poster_complete":
      return `\u26A0 ${actorUsername} dominated ${posterName}!`;
    case "pixel":
      return `\u2713 ${actorUsername} drew on ${posterName}`;
    case "graffiti":
      return `\u2713 ${actorUsername} stamped graffiti on ${posterName}`;
    case "gif":
      return `\u2713 ${actorUsername} placed a GIF on ${posterName}`;
    case "ai_poster":
      return `\u2713 ${actorUsername} generated AI art on ${posterName}`;
    case "anthem":
      return `\u2713 ${actorUsername} set anthem on ${posterName}`;
    case "gif_delete":
      return `\u2713 ${actorUsername} deleted a sticker on ${posterName}`;
    default:
      return `${actorUsername} acted on ${posterName}`;
  }
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { username, teamId } = useGame();
  const [toast, setToast] = useState<ToastState | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const seenIds = useRef<Set<string>>(new Set());
  const isFirstLoad = useRef(true);

  useEffect(() => {
    if (!username || !teamId) return;

    const activityRef = ref(db, "activity");
    const unsub = onValue(activityRef, (snapshot) => {
      const data = snapshot.val() || {};
      const ids = Object.keys(data);

      // On first load, mark all existing as seen (no notifications for old events)
      if (isFirstLoad.current) {
        ids.forEach((id) => seenIds.current.add(id));
        isFirstLoad.current = false;
        return;
      }

      // Find new IDs
      const newIds = ids.filter((id) => !seenIds.current.has(id));
      newIds.forEach((id) => seenIds.current.add(id));

      if (newIds.length === 0) return;

      // Process newest event only (last in array, highest timestamp)
      let latestEntry: any = null;
      let latestTs = 0;
      for (const id of newIds) {
        const entry = data[id];
        const ts = entry?.timestamp ?? 0;
        if (ts >= latestTs) {
          latestTs = ts;
          latestEntry = { id, ...entry };
        }
      }

      if (!latestEntry) return;

      const {
        type,
        username: actorUsername,
        teamId: actorTeamId,
        posterId,
        targetUsername: targetUser,
        targetTeamId: targetTeam,
      } = latestEntry;

      // Don't notify about own actions
      if (actorUsername === username) return;

      const posterName =
        POSTER_DESIGNS[posterId as keyof typeof POSTER_DESIGNS]?.name || posterId || "a poster";

      // Destructive: rival targeted me directly
      const isTargetedAtMe = targetUser === username;
      // Destructive: rival changed territory and it's not my team
      const isTerritoryConcern =
        (type === "territory_change" || type === "poster_complete") && actorTeamId !== teamId;
      // Destructive: rival replaced my team's anthem
      const isAnthemStolen = type === "anthem_override" && targetTeam === teamId;

      if (isTargetedAtMe || isTerritoryConcern || isAnthemStolen) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setToast({
          message: buildMessage(type, actorUsername, posterName, targetUser),
          type: "warning",
          glitch: true,
        });
        setToastVisible(true);
        return;
      }

      // Constructive: my team did something (excluding self)
      if (actorTeamId === teamId) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setToast({
          message: buildMessage(type, actorUsername, posterName),
          type: "success",
          glitch: false,
        });
        setToastVisible(true);
      }
    });

    return () => unsub();
  }, [username, teamId]);

  const hideToast = () => {
    setToastVisible(false);
  };

  return (
    <NotificationContext.Provider value={{ toast, toastVisible, hideToast }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationToast() {
  return useContext(NotificationContext);
}
