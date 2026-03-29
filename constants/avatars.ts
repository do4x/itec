import { ImageSourcePropType } from "react-native";

export interface Avatar {
  id: string;
  image: ImageSourcePropType;
  label: string;
}

export const AVATARS: Avatar[] = [
  { id: "penguin1",  image: require("../assets/avatars/penguin1.png"),  label: "FROSTY" },
  { id: "penguin2",  image: require("../assets/avatars/penguin2.png"),  label: "WADDLE" },
  { id: "penguin3",  image: require("../assets/avatars/penguin3.png"),  label: "SLICK" },
  { id: "penguin4",  image: require("../assets/avatars/penguin4.png"),  label: "CHILL" },
  { id: "penguin5",  image: require("../assets/avatars/penguin5.png"),  label: "DRIFT" },
  { id: "penguin6",  image: require("../assets/avatars/penguin6.png"),  label: "TUXEDO" },
  { id: "penguin7",  image: require("../assets/avatars/penguin7.png"),  label: "BLIZZARD" },
  { id: "penguin8",  image: require("../assets/avatars/penguin8.png"),  label: "FLIPPER" },
  { id: "penguin9",  image: require("../assets/avatars/penguin9.png"),  label: "SHADOW" },
  { id: "penguin10", image: require("../assets/avatars/penguin10.png"), label: "SPARKY" },
];

export function getAvatar(id: string | null | undefined): Avatar {
  return AVATARS.find((a) => a.id === id) ?? AVATARS[0];
}
