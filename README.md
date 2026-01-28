# Word Spin (Expo / React Native)

Word Spin is a circular word puzzle built as a fully independent module inside a multi-game Expo app. The game centers on Jetour car models and uses Expo Router for navigation.

## Features

- Circular letter wheel with swipe selection (gesture handler + reanimated).
- Jetour model word list only (no filler words).
- Per-level Jetour car images stored locally in assets.
- Timer, progress tracking, and end-game modal with confetti.
- Word Spin specific settings (sound, haptics, restart).
- AsyncStorage persistence for settings.

## Game Rules

1. Swipe across letters arranged in a circle to form a word.
2. Valid words are highlighted and added to the found list.
3. Invalid words reset with a subtle animation.
4. Complete all required words to finish the game.

## Jetour Word Dataset

The data lives in `src/data/jetourModels.ts` and includes:

- **Jetour T Series**: T1, T2, T3, T5, T6, T7, T8
- **Jetour X90 Series**: X90, X90 PLUS, X90 PRO
- **Jetour G700**: G700

## Add New Car Models

1. Add a real Jetour image to `assets/cars/` (optimized JPEG preferred).
2. Update `src/data/jetourModels.ts`:
   - Add a new level or append new words to an existing level.
   - Point the `image` field to the new asset with `require(...)`.
3. The word validator and wheel generator will automatically pick up the new words.

## Car Image Assets

The bundled images are sourced from official Jetour model pages on Wikipedia and stored locally in `assets/cars/`:

- Jetour T2 (T Series)
- Jetour X90 (X90 Series)
- Jetour Zongheng G700 (G700)

## Project Structure

```
/app
  index.tsx          # Game Hub
  wordspin.tsx       # Word Spin Game

/src
  /components
    LetterWheel.tsx
    LetterNode.tsx
    WordList.tsx
    HUD.tsx
    Confetti.tsx
  /logic
    wordValidator.ts
    wheelGenerator.ts
    gameState.ts
  /store
    wordSpinStore.ts
    settingsStore.ts
  /data
    jetourModels.ts

/assets
  /cars              # Jetour car images
  /sounds
```

## Run Locally

```bash
npm install
npm run start
```

## Build Android APK

```bash
npm run prebuild
npm run android
```

## Notes

- Settings are persisted under the AsyncStorage key `wordspin_settings_v1`.
- The game uses Expo Router (`app/` directory routing) and the latest stable Expo SDK.