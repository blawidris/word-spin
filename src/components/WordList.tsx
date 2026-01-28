import { memo, useEffect } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming
} from "react-native-reanimated";

import { normalizeWord } from "../logic/wordValidator";

type WordListProps = {
  words: string[];
  foundSet: Set<string>;
  latestFound?: string | null;
};

type WordItemProps = {
  word: string;
  found: boolean;
  highlight: boolean;
};

const WordItem = memo(({ word, found, highlight }: WordItemProps) => {
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (highlight) {
      pulse.value = withSequence(
        withTiming(1, { duration: 160 }),
        withTiming(0, { duration: 220 })
      );
    }
  }, [highlight, pulse]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.08 }]
  }));

  return (
    <Animated.View
      style={[
        styles.wordChip,
        found && styles.wordChipFound,
        animatedStyle
      ]}
    >
      <Text style={[styles.wordText, found && styles.wordTextFound]}>
        {word}
      </Text>
    </Animated.View>
  );
});

export function WordList({ words, foundSet, latestFound }: WordListProps) {
  return (
    <View style={styles.container}>
      <FlatList
        data={words}
        keyExtractor={(item) => item}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const normalized = normalizeWord(item);
          const found = foundSet.has(normalized);
          return (
            <WordItem
              word={item}
              found={found}
              highlight={found && latestFound === normalized}
            />
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16
  },
  listContent: {
    gap: 10,
    paddingHorizontal: 4
  },
  wordChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#1F2937",
    borderWidth: 1,
    borderColor: "#2D3748"
  },
  wordChipFound: {
    backgroundColor: "#14B8A6",
    borderColor: "#5EEAD4"
  },
  wordText: {
    color: "#D1D5DB",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5
  },
  wordTextFound: {
    color: "#0F172A"
  }
});
