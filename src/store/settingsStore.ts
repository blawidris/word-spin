import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore } from "react";

type SettingsState = {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  loaded: boolean;
};

const STORAGE_KEY = "wordspin_settings_v1";

let state: SettingsState = {
  soundEnabled: true,
  hapticsEnabled: true,
  loaded: false
};

const listeners = new Set<() => void>();

const emitChange = () => {
  listeners.forEach((listener) => listener());
};

const setState = (partial: Partial<SettingsState>) => {
  state = { ...state, ...partial };
  emitChange();
};

const persistSettings = async () => {
  const payload = {
    soundEnabled: state.soundEnabled,
    hapticsEnabled: state.hapticsEnabled
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
};

export const settingsActions = {
  async loadSettings() {
    if (state.loaded) {
      return;
    }

    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<SettingsState>;
        setState({
          soundEnabled: parsed.soundEnabled ?? state.soundEnabled,
          hapticsEnabled: parsed.hapticsEnabled ?? state.hapticsEnabled,
          loaded: true
        });
        return;
      }
    } catch (error) {
      // Ignore parsing issues and keep defaults.
    }

    setState({ loaded: true });
  },
  async setSoundEnabled(enabled: boolean) {
    setState({ soundEnabled: enabled });
    await persistSettings();
  },
  async setHapticsEnabled(enabled: boolean) {
    setState({ hapticsEnabled: enabled });
    await persistSettings();
  },
  async resetSettings() {
    setState({ soundEnabled: true, hapticsEnabled: true });
    await persistSettings();
  }
};

export const useSettingsStore = <T,>(selector: (state: SettingsState) => T) =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => selector(state)
  );
