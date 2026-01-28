import { ImageSourcePropType } from "react-native";

import { JETOUR_LEVELS } from "../data/jetourModels";
import { generateWheelLetters } from "./wheelGenerator";
import { buildWordSet } from "./wordValidator";

export type WordSpinLevel = {
  id: string;
  title: string;
  words: string[];
  wordSet: Set<string>;
  wheelLetters: string[];
  found: string[];
  image: ImageSourcePropType;
};

export type WordSpinState = {
  levels: WordSpinLevel[];
  currentLevelIndex: number;
  startedAt: number | null;
  elapsedMs: number;
  completed: boolean;
};

export const createInitialState = (): WordSpinState => {
  const levels: WordSpinLevel[] = JETOUR_LEVELS.map((level) => ({
    id: level.id,
    title: level.title,
    words: level.words,
    wordSet: buildWordSet(level.words),
    wheelLetters: generateWheelLetters(level.words, 8),
    found: [],
    image: level.image
  }));

  return {
    levels,
    currentLevelIndex: 0,
    startedAt: Date.now(),
    elapsedMs: 0,
    completed: false
  };
};

export const getTotalWords = (levels: WordSpinLevel[]) =>
  levels.reduce((total, level) => total + level.words.length, 0);

export const getFoundWordsCount = (levels: WordSpinLevel[]) =>
  levels.reduce((total, level) => total + level.found.length, 0);

export const isLevelComplete = (level: WordSpinLevel) =>
  level.found.length >= level.words.length;
