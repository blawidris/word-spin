import { memo, useEffect } from "react";
import { StyleSheet, Text } from "react-native";
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from "react-native-reanimated";

type LetterNodeProps = {
  letter: string;
  x: number;
  y: number;
  size: number;
  isSelected: boolean;
};

function LetterNodeComponent({
  letter,
  x,
  y,
  size,
  isSelected
}: LetterNodeProps) {
  const progress = useSharedValue(isSelected ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(isSelected ? 1 : 0, { duration: 140 });
  }, [isSelected, progress]);

  const animatedStyle = useAnimatedStyle(() => {
    const scale = 1 + progress.value * 0.18;
    const glow = interpolate(progress.value, [0, 1], [0, 8]);
    return {
      transform: [{ scale }],
      backgroundColor: interpolateColor(
        progress.value,
        [0, 1],
        ["#1F2937", "#5EEAD4"]
      ),
      borderColor: interpolateColor(
        progress.value,
        [0, 1],
        ["#374151", "#99F6E4"]
      ),
      shadowOpacity: progress.value * 0.7,
      shadowRadius: glow
    };
  });

  return (
    <Animated.View
      style={[
        styles.node,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          left: x - size / 2,
          top: y - size / 2
        },
        animatedStyle
      ]}
    >
      <Text style={styles.letter}>{letter}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  node: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    shadowColor: "#67E8F9",
    elevation: 4
  },
  letter: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "700"
  }
});

export const LetterNode = memo(LetterNodeComponent);
