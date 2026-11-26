# Pense-bête vocaux (application mobile)

Application mobile **React Native + Expo** : enregistrez de courts **mémos audio**,
classez-les dans des **catégories**, ajoutez une **échéance optionnelle** (avec rappel
par notification), le tout en **stockage local SQLite** — fonctionne **hors-ligne**.

## Fonctionnalités

- 🎙️ Enregistrement audio (`expo-av`), lecture dans la liste
- 🏷️ Catégories personnalisables (couleurs), filtre par catégorie, déplacement d'une note
- ⏰ Échéance optionnelle (`@react-native-community/datetimepicker`) : tri par échéance,
  badge « en retard », **rappel par notification locale** (`expo-notifications`)
- 🔊 Lecture vocale des notes en français (`expo-speech`)
- ✅ Notes cochables « faite », recherche plein texte
- 📴 100 % local et hors-ligne (aucun serveur, aucune donnée envoyée)

## Prérequis

- Node.js 20+, un compte Expo (gratuit), Xcode (macOS, pour iOS) ou Android Studio

## Lancer en développement

```bash
npm install        # ou: npx expo install (ajuste les versions compatibles)
npx expo start     # scannez le QR code avec Expo Go (Android/iOS)
npx expo start --android
npx expo start --ios
```

Le micro exige une permission : elle est demandée à la première utilisation
(`NSMicrophoneUsageDescription` iOS et `RECORD_AUDIO` Android sont déjà déclarés dans `app.json`).

## Publier sur les stores

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android   # puis --platform ios
```

Renseignez `bundleIdentifier` / `package` dans `app.json` avec votre propre domaine.

## Structure

- `App.js` — écran unique : enregistreur, filtres, liste des notes
- `src/db.js` — SQLite (tables `categories`, `notes`)
- `src/audio.js` — enregistrement / lecture (`expo-av`)
- `src/speech.js` — synthèse vocale fr (`expo-speech`)
- `src/notifications.js` — rappels d'échéance (`expo-notifications`)
- `src/components/NoteCard.js` — carte de note
- `assets/` — icône, splash, icône adaptative Android
