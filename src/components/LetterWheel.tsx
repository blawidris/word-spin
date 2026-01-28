import { useEffect, useMemo, useRef, useState } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS } from "react-native-reanimated";

import { LetterNode } from "./LetterNode";

type LetterWheelProps = {
  letters: string[];
  onSubmitWord: (word: string) => void;
  onSelectionChange?: (word: string) => void;
};

export function LetterWheel({
  letters,
  onSubmitWord,
  onSelectionChange
}: LetterWheelProps) {
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const selectedRef = useRef<number[]>([]);

  const nodeSize = Math.min(layout.width, layout.height) * 0.2 || 56;
  const radius = Math.min(layout.width, layout.height) / 2 - nodeSize;

  const positions = useMemo(() => {
    const centerX = layout.width / 2;
    const centerY = layout.height / 2;
    if (layout.width === 0 || layout.height === 0) {
      return letters.map(() => ({ x: 0, y: 0 }));
    }
    return letters.map((_, index) => {
      const angle = (2 * Math.PI * index) / letters.length - Math.PI / 2;
      return {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      };
    });
  }, [layout.height, layout.width, letters, radius]);

  const selectedSet = useMemo(
    () => new Set(selectedIndices),
    [selectedIndices]
  );

  const updateSelection = (nextIndices: number[]) => {
    selectedRef.current = nextIndices;
    setSelectedIndices(nextIndices);
    if (onSelectionChange) {
      const word = nextIndices.map((index) => letters[index]).join("");
      onSelectionChange(word);
    }
  };

  const resetSelection = () => {
    updateSelection([]);
  };

  useEffect(() => {
    resetSelection();
  }, [letters]);

  const handlePoint = (x: number, y: number) => {
    if (layout.width === 0 || layout.height === 0) {
      return;
    }
    const hitRadius = nodeSize * 0.6;
    for (let i = 0; i < positions.length; i += 1) {
      const position = positions[i];
      const distance = Math.hypot(position.x - x, position.y - y);
      if (distance <= hitRadius && !selectedRef.current.includes(i)) {
        updateSelection([...selectedRef.current, i]);
        break;
      }
    }
  };

  const handleEnd = () => {
    const word = selectedRef.current.map((index) => letters[index]).join("");
    if (word.length > 0) {
      onSubmitWord(word);
    }
    resetSelection();
  };

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .onBegin((event) => {
          runOnJS(resetSelection)();
          runOnJS(handlePoint)(event.x, event.y);
        })
        .onUpdate((event) => {
          runOnJS(handlePoint)(event.x, event.y);
        })
        .onFinalize(() => {
          runOnJS(handleEnd)();
        }),
    [letters, layout.height, layout.width, positions]
  );

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setLayout({ width, height });
  };

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={styles.container} onLayout={onLayout}>
        {letters.map((letter, index) => {
          const position = positions[index];
          return (
            <LetterNode
              key={`${letter}-${index}`}
              letter={letter}
              x={position.x}
              y={position.y}
              size={nodeSize}
              isSelected={selectedSet.has(index)}
            />
          );
        })}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    aspectRatio: 1,
    alignSelf: "center"
  }
});
