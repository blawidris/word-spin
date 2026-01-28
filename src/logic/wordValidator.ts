export const normalizeWord = (word: string) =>
  word.toUpperCase().replace(/[^A-Z0-9]/g, "");

export const buildWordSet = (words: string[]) =>
  new Set(words.map((word) => normalizeWord(word)));

export const isValidWord = (word: string, validWords: Set<string>) =>
  validWords.has(normalizeWord(word));
