export interface GraffitiPattern {
  id: string;
  name: string;
  emoji: string;
  width: number;
  height: number;
  pixels: (0 | 1)[][];
}

export const GRAFFITI_PATTERNS: GraffitiPattern[] = [
  {
    id: "heart", name: "Heart", emoji: "❤️", width: 5, height: 5,
    pixels: [
      [0,1,0,1,0],
      [1,1,1,1,1],
      [1,1,1,1,1],
      [0,1,1,1,0],
      [0,0,1,0,0],
    ],
  },
  {
    id: "star", name: "Star", emoji: "⭐", width: 7, height: 7,
    pixels: [
      [0,0,0,1,0,0,0],
      [0,0,1,1,1,0,0],
      [1,1,1,1,1,1,1],
      [0,1,1,1,1,1,0],
      [0,1,1,0,1,1,0],
      [0,1,0,0,0,1,0],
      [1,0,0,0,0,0,1],
    ],
  },
  {
    id: "skull", name: "Skull", emoji: "💀", width: 6, height: 7,
    pixels: [
      [0,1,1,1,1,0],
      [1,1,1,1,1,1],
      [1,0,1,1,0,1],
      [1,1,1,1,1,1],
      [0,1,1,1,1,0],
      [0,1,0,0,1,0],
      [0,1,1,1,1,0],
    ],
  },
  {
    id: "crown", name: "Crown", emoji: "👑", width: 7, height: 5,
    pixels: [
      [0,1,0,1,0,1,0],
      [0,1,1,1,1,1,0],
      [1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1],
    ],
  },
  {
    id: "lightning", name: "Lightning", emoji: "⚡", width: 4, height: 7,
    pixels: [
      [0,0,1,1],
      [0,1,1,0],
      [1,1,0,0],
      [1,1,1,1],
      [0,0,1,1],
      [0,1,1,0],
      [1,1,0,0],
    ],
  },
  {
    id: "peace", name: "Peace", emoji: "✌️", width: 7, height: 7,
    pixels: [
      [0,0,1,1,1,0,0],
      [0,1,0,1,0,1,0],
      [1,0,0,1,0,0,1],
      [1,0,0,1,0,0,1],
      [1,0,1,0,1,0,1],
      [0,1,0,0,0,1,0],
      [0,0,1,1,1,0,0],
    ],
  },
  {
    id: "itec", name: "iTEC", emoji: "🏆", width: 11, height: 5,
    pixels: [
      [1,0,1,1,1,0,1,1,1,0,1,],
      [1,0,0,1,0,0,1,0,0,0,1,],
      [1,0,0,1,0,0,1,1,0,0,1,],
      [1,0,0,1,0,0,1,0,0,0,1,],
      [1,0,0,1,0,0,1,1,1,0,1,],
    ],
  },
  {
    id: "spray", name: "Spray", emoji: "🎨", width: 5, height: 5,
    pixels: [
      [1,0,1,0,1],
      [0,1,1,1,0],
      [1,1,1,1,1],
      [0,1,1,1,0],
      [1,0,1,0,1],
    ],
  },
];
