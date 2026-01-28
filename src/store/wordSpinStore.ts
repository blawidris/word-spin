import { useSyncExternalStore } from "react";

import {
  WordSpinLevel,
  WordSpinState,
  createInitialState,
  isLevelComplete
} from "../logic/gameState";
import { normalizeWord } from "../logic/wordValidator";

type SubmitResult = {
  status: "valid" | "invalid" | "duplicate";
  levelCompleted: boolean;
  gameCompleted: boolean;
  normalizedWord: string;
};

let state: WordSpinState = createInitialState();

const listeners = new Set<() => void>();

const emitChange = () => {
  listeners.forEach((listener) => listener());
};

const setState = (next: WordSpinState) => {
  state = next;
  emitChange();
};

const updateLevel = (
  levels: WordSpinLevel[],
  levelIndex: number,
  updater: (level: WordSpinLevel) => WordSpinLevel
) => levels.map((level, index) => (index === levelIndex ? updater(level) : level));

export const wordSpinActions = {
  resetGame() {
    setState(createInitialState());
  },
  startGame() {
    if (state.startedAt) {
      return;
    }
    setState({ ...state, startedAt: Date.now(), elapsedMs: 0, completed: false });
  },
  tick() {
    if (!state.startedAt || state.completed) {
      return;
    }
    setState({ ...state, elapsedMs: Date.now() - state.startedAt });
  },
  submitWord(word: string): SubmitResult {
    const normalized = normalizeWord(word);
    const level = state.levels[state.currentLevelIndex];

    if (!level.wordSet.has(normalized)) {
      return {
        status: "invalid",
        levelCompleted: false,
        gameCompleted: false,
        normalizedWord: normalized
      };
    }

    if (level.found.includes(normalized)) {
      return {
        status: "duplicate",
        levelCompleted: false,
        gameCompleted: false,
        normalizedWord: normalized
      };
    }

    const updatedLevels = updateLevel(
      state.levels,
      state.currentLevelIndex,
      (currentLevel) => ({
        ...currentLevel,
        found: [...currentLevel.found, normalized]
      })
    );

    const levelCompleted = isLevelComplete(
      updatedLevels[state.currentLevelIndex]
    );

    let currentLevelIndex = state.currentLevelIndex;
    let completed = state.completed;

    if (levelCompleted) {
      if (currentLevelIndex < updatedLevels.length - 1) {
        currentLevelIndex += 1;
      } else {
        completed = true;
      }
    }

    setState({
      ...state,
      levels: updatedLevels,
      currentLevelIndex,
      completed
    });

    return {
      status: "valid",
      levelCompleted,
      gameCompleted: completed,
      normalizedWord: normalized
    };
  }
};

export const useWordSpinStore = <T,>(selector: (state: WordSpinState) => T) =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => selector(state)
  );
