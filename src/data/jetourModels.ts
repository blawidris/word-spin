import { ImageSourcePropType } from "react-native";

export type JetourLevel = {
  id: string;
  title: string;
  words: string[];
  image: ImageSourcePropType;
};

export const JETOUR_LEVELS: JetourLevel[] = [
  {
    id: "t-series",
    title: "Jetour T Series",
    words: ["T1", "T2"],
    image: require("../../assets/cars/jetour_t_series_optimized.jpg")
  },
  {
    id: "x90-series",
    title: "Jetour X90 Series",
    words: ["X90", "X90 PLUS", "X90 PRO"],
    image: require("../../assets/cars/jetour_x90_series_optimized.jpg")
  },
  {
    id: "g700",
    title: "Jetour G700",
    words: ["G700"],
    image: require("../../assets/cars/jetour_g700_optimized.jpg")
  }
];

export const ALL_JETOUR_WORDS = JETOUR_LEVELS.flatMap((level) => level.words);
