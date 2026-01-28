import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Game Hub</Text>
      <Text style={styles.subtitle}>
        Select a game to start playing.
      </Text>

      <View style={styles.grid}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/wordspin")}
          style={({ pressed }) => [
            styles.card,
            pressed && styles.cardPressed
          ]}
        >
          <Text style={styles.cardTitle}>Word Spin</Text>
          <Text style={styles.cardBody}>
            Circular word puzzle with Jetour models.
          </Text>
          <Text style={styles.cardCta}>Play</Text>
        </Pressable>

        <View style={[styles.card, styles.cardDisabled]}>
          <Text style={styles.cardTitle}>More Games</Text>
          <Text style={styles.cardBody}>Coming soon.</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 64,
    paddingHorizontal: 24,
    backgroundColor: "#0D1117"
  },
  title: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "700"
  },
  subtitle: {
    color: "#9BA3AF",
    marginTop: 8,
    marginBottom: 24,
    fontSize: 16
  },
  grid: {
    gap: 16
  },
  card: {
    borderRadius: 18,
    padding: 20,
    backgroundColor: "#161B22",
    borderWidth: 1,
    borderColor: "#222A35"
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9
  },
  cardDisabled: {
    opacity: 0.6
  },
  cardTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "600"
  },
  cardBody: {
    color: "#9BA3AF",
    marginTop: 8,
    fontSize: 14
  },
  cardCta: {
    color: "#5EEAD4",
    marginTop: 16,
    fontWeight: "600"
  }
});
