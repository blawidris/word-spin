import { normalizeWord } from "./wordValidator";

const shuffle = <T,>(items: T[]) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

export const generateWheelLetters = (words: string[], targetCount = 8) => {
  const unique = Array.from(
    new Set(
      words
        .map((word) => normalizeWord(word))
        .join("")
        .split("")
    )
  );

  const minimumCount = Math.max(targetCount, unique.length);
  const letters = [...unique];

  while (letters.length < minimumCount) {
    const pick = unique[Math.floor(Math.random() * unique.length)];
    letters.push(pick);
  }

  return shuffle(letters);
};
