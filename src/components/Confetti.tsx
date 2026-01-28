import { memo, useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming
} from "react-native-reanimated";

type ConfettiProps = {
  active: boolean;
};

type PieceProps = {
  delay: number;
  color: string;
  left: number;
  size: number;
};

const ConfettiPiece = memo(({ delay, color, left, size }: PieceProps) => {
  const translateY = useSharedValue(-40);
  const rotation = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(withTiming(420, { duration: 1800 }), -1, false)
    );
    rotation.value = withDelay(
      delay,
      withRepeat(withTiming(360, { duration: 1600 }), -1, false)
    );
  }, [delay, rotation, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { rotate: `${rotation.value}deg` }
    ]
  }));

  return (
    <Animated.View
      style={[
        styles.piece,
        {
          left: `${left}%`,
          width: size,
          height: size * 1.6,
          backgroundColor: color
        },
        animatedStyle
      ]}
    />
  );
});

export function Confetti({ active }: ConfettiProps) {
  if (!active) {
    return null;
  }

  return (
    <>
      <ConfettiPiece delay={0} color="#67E8F9" left={12} size={8} />
      <ConfettiPiece delay={200} color="#F9A8D4" left={25} size={10} />
      <ConfettiPiece delay={400} color="#FDE68A" left={42} size={7} />
      <ConfettiPiece delay={150} color="#A7F3D0" left={58} size={9} />
      <ConfettiPiece delay={300} color="#C4B5FD" left={72} size={8} />
      <ConfettiPiece delay={500} color="#FDA4AF" left={85} size={10} />
    </>
  );
}

const styles = StyleSheet.create({
  piece: {
    position: "absolute",
    top: 0,
    borderRadius: 4
  }
});
