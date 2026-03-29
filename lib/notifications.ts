import { db, ref, push, serverTimestamp, auth } from "./firebase";

export type ActivityType =
  | "pixel"
  | "pixel_override"
  | "graffiti"
  | "gif"
  | "ai_poster"
  | "anthem"
  | "territory_change"
  | "gif_delete"
  | "pixel_delete"
  | "anthem_override"
  | "poster_complete";

interface ActivityEntry {
  type: ActivityType;
  username: string;
  teamId: string;
  posterId: string;
  targetUsername?: string;
  targetTeamId?: string;
}

export function logActivity(entry: ActivityEntry) {
  if (auth.currentUser?.isAnonymous) return; // guests nu loghează activitate
  push(ref(db, "activity"), {
    ...entry,
    timestamp: serverTimestamp(),
  });
}
