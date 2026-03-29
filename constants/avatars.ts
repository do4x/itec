import { ImageSourcePropType } from "react-native";

export interface Avatar {
  id: string;
  image: ImageSourcePropType;
  label: string;
}

export const AVATARS: Avatar[] = [
  { id: "penguin1",  image: require("../assets/pfps/img1.jpg"),  label: "FROSTY" },
  { id: "penguin2",  image: require("../assets/pfps/img2.jpg"),  label: "WADDLE" },
  { id: "penguin3",  image: require("../assets/pfps/img3.png"),  label: "SLICK" },
  { id: "penguin4",  image: require("../assets/pfps/img4.png"),  label: "CHILL" },
  { id: "penguin5",  image: require("../assets/pfps/img5.png"),  label: "DRIFT" },
  { id: "penguin6",  image: require("../assets/pfps/img6.jpg"),  label: "TUXEDO" },
  { id: "penguin7",  image: require("../assets/pfps/img7.jpg"),  label: "BLIZZARD" },
  { id: "penguin8",  image: require("../assets/pfps/img8.jpg"),  label: "FLIPPER" },
  { id: "penguin9",  image: require("../assets/pfps/img9.jpg"),  label: "SHADOW" },
  { id: "penguin10", image: require("../assets/pfps/img10.jpg"), label: "SPARKY" },
];

export function getAvatar(id: string | null | undefined): Avatar {
  return AVATARS.find((a) => a.id === id) ?? AVATARS[0];
}
