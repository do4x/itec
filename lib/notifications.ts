import { db, ref, push, serverTimestamp } from "./firebase";

export type ActivityType =
  | "pixel"
  | "pixel_override"
  | "graffiti"
  | "gif"
  | "ai_poster"
  | "anthem"
  | "territory_change";

interface ActivityEntry {
  type: ActivityType;
  username: string;
  teamId: string;
  posterId: string;
  targetUsername?: string;
  targetTeamId?: string;
}

export function logActivity(entry: ActivityEntry) {
  push(ref(db, "activity"), {
    ...entry,
    timestamp: serverTimestamp(),
  });
}
