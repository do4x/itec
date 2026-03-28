export interface Avatar {
  id: string;
  emoji: string;
  color: string;
  label: string;
}

export const AVATARS: Avatar[] = [
  { id: "ghost",  emoji: "👻", color: "#00E5FF", label: "GHOST" },
  { id: "robot",  emoji: "🤖", color: "#39FF14", label: "ROBOT" },
  { id: "skull",  emoji: "💀", color: "#FF3B5C", label: "SKULL" },
  { id: "ninja",  emoji: "🥷", color: "#FFD600", label: "NINJA" },
  { id: "alien",  emoji: "👽", color: "#4DA3FF", label: "ALIEN" },
  { id: "fire",   emoji: "🔥", color: "#FF6B35", label: "FIRE" },
  { id: "cyber",  emoji: "🦾", color: "#B026FF", label: "CYBER" },
  { id: "bolt",   emoji: "⚡", color: "#FFD600", label: "BOLT" },
];

export function getAvatar(id: string | null | undefined): Avatar {
  return AVATARS.find((a) => a.id === id) ?? AVATARS[0];
}
