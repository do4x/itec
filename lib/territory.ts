import { TeamId } from "./game-state";

export interface TerritoryInfo {
  dominantTeam: TeamId | null;
  scores: Partial<Record<TeamId, number>>;
  totalPixels: number;
}

export function calculateTerritory(pixelData: Record<string, any> | null): TerritoryInfo {
  if (!pixelData) return { dominantTeam: null, scores: {}, totalPixels: 0 };

  const scores: Partial<Record<TeamId, number>> = {};
  let totalPixels = 0;

  Object.values(pixelData).forEach((pixel: any) => {
    if (pixel?.teamId) {
      const team = pixel.teamId as TeamId;
      scores[team] = (scores[team] || 0) + 1;
      totalPixels++;
    }
  });

  let dominantTeam: TeamId | null = null;
  let maxCount = 0;
  (Object.entries(scores) as [TeamId, number][]).forEach(([team, count]) => {
    if (count > maxCount) {
      maxCount = count;
      dominantTeam = team;
    }
  });

  return { dominantTeam, scores, totalPixels };
}
