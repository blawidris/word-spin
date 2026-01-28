import { useEffect, useMemo, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Switch,
  Text,
  View
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";

import { Confetti } from "../src/components/Confetti";
import { HUD } from "../src/components/HUD";
import { LetterWheel } from "../src/components/LetterWheel";
import { WordList } from "../src/components/WordList";
import { getFoundWordsCount, getTotalWords } from "../src/logic/gameState";
import { settingsActions, useSettingsStore } from "../src/store/settingsStore";
import { useWordSpinStore, wordSpinActions } from "../src/store/wordSpinStore";

export default function WordSpinScreen() {
  const levels = useWordSpinStore((state) => state.levels);
  const currentLevelIndex = useWordSpinStore(
    (state) => state.currentLevelIndex
  );
  const elapsedMs = useWordSpinStore((state) => state.elapsedMs);
  const completed = useWordSpinStore((state) => state.completed);

  const soundEnabled = useSettingsStore((state) => state.soundEnabled);
  const hapticsEnabled = useSettingsStore((state) => state.hapticsEnabled);

  const [settingsVisible, setSettingsVisible] = useState(false);
  const [latestFound, setLatestFound] = useState<string | null>(null);
  const [currentSelection, setCurrentSelection] = useState("");

  const currentLevel = levels[currentLevelIndex];
  const foundCount = getFoundWordsCount(levels);
  const totalWords = getTotalWords(levels);
  const foundSet = useMemo(
    () => new Set(currentLevel?.found ?? []),
    [currentLevel]
  );

  const shake = useSharedValue(0);
  const wheelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }]
  }));

  useEffect(() => {
    settingsActions.loadSettings();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      wordSpinActions.tick();
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setLatestFound(null);
  }, [currentLevelIndex]);

  const triggerInvalid = () => {
    shake.value = withSequence(
      withTiming(-6, { duration: 60 }),
      withTiming(6, { duration: 60 }),
      withTiming(-4, { duration: 60 }),
      withTiming(0, { duration: 80 })
    );
  };

  const handleSubmitWord = (word: string) => {
    const result = wordSpinActions.submitWord(word);

    if (result.status === "valid") {
      setLatestFound(result.normalizedWord);
      if (hapticsEnabled) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      }
    } else {
      triggerInvalid();
    }

    setCurrentSelection("");
  };

  const handleRestart = () => {
    wordSpinActions.resetGame();
    setSettingsVisible(false);
    setLatestFound(null);
    setCurrentSelection("");
  };

  if (!currentLevel) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <HUD
          elapsedMs={elapsedMs}
          levelTitle={currentLevel.title}
          progressText={`${foundCount} / ${totalWords} words`}
          onPressSettings={() => setSettingsVisible(true)}
        />

        <View style={styles.imageCard}>
          <Image
            source={currentLevel.image}
            style={styles.carImage}
            resizeMode="contain"
          />
        </View>

        <View style={styles.selectionRow}>
          <Text style={styles.selectionLabel}>Current</Text>
          <Text style={styles.selectionText}>
            {currentSelection || "Swipe letters to start"}
          </Text>
        </View>

        <Animated.View style={[styles.wheelContainer, wheelStyle]}>
          <LetterWheel
            letters={currentLevel.wheelLetters}
            onSubmitWord={handleSubmitWord}
            onSelectionChange={setCurrentSelection}
          />
        </Animated.View>

        <WordList
          words={currentLevel.words}
          foundSet={foundSet}
          latestFound={latestFound}
        />

        <View style={styles.progressRow}>
          <Text style={styles.progressText}>
            {foundCount} / {totalWords} words found
          </Text>
        </View>
      </View>

      <Modal transparent animationType="fade" visible={settingsVisible}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Word Spin Settings</Text>

            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Sound</Text>
              <Switch
                value={soundEnabled}
                onValueChange={(value) =>
                  settingsActions.setSoundEnabled(value)
                }
              />
            </View>

            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Haptics</Text>
              <Switch
                value={hapticsEnabled}
                onValueChange={(value) =>
                  settingsActions.setHapticsEnabled(value)
                }
              />
            </View>

            <Pressable style={styles.modalButton} onPress={handleRestart}>
              <Text style={styles.modalButtonText}>Restart Game</Text>
            </Pressable>

            <Pressable
              style={[styles.modalButton, styles.modalButtonSecondary]}
              onPress={() => {
                setSettingsVisible(false);
                router.replace("/");
              }}
            >
              <Text style={styles.modalButtonText}>Return to Home</Text>
            </Pressable>

            <Pressable
              style={[styles.modalButton, styles.modalButtonGhost]}
              onPress={() => setSettingsVisible(false)}
            >
              <Text style={styles.modalButtonGhostText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal transparent animationType="fade" visible={completed}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.confettiBox}>
              <Confetti active />
            </View>
            <Text style={styles.modalTitle}>Completed!</Text>
            <Text style={styles.modalSubtitle}>
              Time: {Math.floor(elapsedMs / 1000)} seconds
            </Text>
            <Text style={styles.modalSubtitle}>
              Words found: {foundCount} / {totalWords}
            </Text>

            <Pressable style={styles.modalButton} onPress={handleRestart}>
              <Text style={styles.modalButtonText}>Replay</Text>
            </Pressable>

            <Pressable
              style={[styles.modalButton, styles.modalButtonSecondary]}
              onPress={() => router.replace("/")}
            >
              <Text style={styles.modalButtonText}>Home</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#0B0F16"
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 16
  },
  imageCard: {
    borderRadius: 20,
    padding: 12,
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1F2937"
  },
  carImage: {
    width: "100%",
    height: 160
  },
  selectionRow: {
    alignItems: "center"
  },
  selectionLabel: {
    color: "#9CA3AF",
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: "uppercase"
  },
  selectionText: {
    color: "#FFFFFF",
    marginTop: 6,
    fontSize: 18,
    fontWeight: "600"
  },
  wheelContainer: {
    paddingVertical: 8
  },
  progressRow: {
    alignItems: "center",
    marginBottom: 12
  },
  progressText: {
    color: "#9BA3AF",
    fontSize: 12,
    fontWeight: "600"
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(2, 6, 23, 0.7)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24
  },
  modalCard: {
    width: "100%",
    borderRadius: 20,
    padding: 20,
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#1F2937",
    gap: 12
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center"
  },
  modalSubtitle: {
    color: "#CBD5F5",
    textAlign: "center"
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  settingLabel: {
    color: "#E2E8F0",
    fontSize: 16
  },
  modalButton: {
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#14B8A6"
  },
  modalButtonSecondary: {
    backgroundColor: "#2563EB"
  },
  modalButtonGhost: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#334155"
  },
  modalButtonText: {
    color: "#0F172A",
    fontWeight: "700"
  },
  modalButtonGhostText: {
    color: "#E2E8F0",
    fontWeight: "600"
  },
  confettiBox: {
    height: 120,
    overflow: "hidden"
  }
});
