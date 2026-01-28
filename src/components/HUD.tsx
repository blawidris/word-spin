import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

type HUDProps = {
  elapsedMs: number;
  levelTitle: string;
  progressText: string;
  onPressSettings: () => void;
};

const formatTime = (elapsedMs: number) => {
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
};

export function HUD({
  elapsedMs,
  levelTitle,
  progressText,
  onPressSettings
}: HUDProps) {
  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.timer}>{formatTime(elapsedMs)}</Text>
        <Text style={styles.subtitle}>{levelTitle}</Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.progress}>{progressText}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={onPressSettings}
          style={({ pressed }) => [styles.settings, pressed && styles.pressed]}
        >
          <Ionicons name="settings-sharp" size={16} color="#E2E8F0" />
          <Text style={styles.settingsText}>Settings</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12
  },
  timer: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "700"
  },
  subtitle: {
    color: "#9BA3AF",
    marginTop: 2,
    fontSize: 12
  },
  right: {
    alignItems: "flex-end",
    gap: 8
  },
  progress: {
    color: "#5EEAD4",
    fontSize: 12,
    fontWeight: "600"
  },
  settings: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#2D3748",
    paddingVertical: 6,
    paddingHorizontal: 12
  },
  settingsText: {
    color: "#E2E8F0",
    fontSize: 12,
    fontWeight: "600"
  },
  pressed: {
    opacity: 0.7
  }
});
