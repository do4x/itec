// constants/poster-designs.ts
// ============================================
// 10 poster DESIGNS (templates) — used for Claude Vision matching
// These never change. Physical instances reference a designId.
// ============================================

// #region agent log
console.error('[DBG b64100] poster-designs.ts MODULE LOADED');
// #endregion

export const POSTER_DESIGNS = {
  afis1:  { name: "Boost Your Social Presence", emoji: "📱" },
  afis2:  { name: "Digital Marketing (Roșu)",   emoji: "📱" },
  afis3:  { name: "Digital Marketing (Violet)", emoji: "💜" },
  afis4:  { name: "Creează fără limite",       emoji: "🥤" },
  afis5:  { name: "Best Burger in Town",        emoji: "🍔" },
  afis6:  { name: "Form Follows Function",      emoji: "🏗️" },
  afis7:  { name: "Explore the World",          emoji: "🌍" },
  afis8:  { name: "Fashion Business",           emoji: "👗" },
  afis9:  { name: "Exclusive Sneakers",         emoji: "👟" },
  afis10: { name: "itec Yellow",                emoji: "💛" },
} as const;

export type DesignId = keyof typeof POSTER_DESIGNS;
export const DESIGN_IDS = Object.keys(POSTER_DESIGNS) as DesignId[];

// ============================================
// Poster INSTANCE — a physical copy on a wall
// ============================================
export interface PosterInstance {
  id: string;            // unique instance id, e.g. "inst_01"
  designId: DesignId;    // which of the 10 designs
  displayName: string;   // human-friendly, e.g. "West Wing Sneakers"
  lat: number;
  lng: number;
  calibratedAt: number;
  accuracy: number;      // GPS accuracy at calibration time
}