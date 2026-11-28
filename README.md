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

- Ordinateur avec Node.js 20+
- Compte Expo gratuit sur [expo.dev](https://expo.dev)
- Pour iOS uniquement : compte Apple Developer (99 $/an) ; Android : aucun compte payant requis pour un APK

## 📥 Télécharger l'APK Android (sans store, sans compte)

Un APK signé est fourni dans ce dépôt : [`pense-bete-vocaux.apk`](./pense-bete-vocaux.apk)
(téléchargement direct : <https://raw.githubusercontent.com/88994ztdwp-collab/Pense-bete-vocau/main/pense-bete-vocaux.apk>)

Installation sur le téléphone Android :

1. Ouvrez l'URL ci-dessus sur le téléphone (ou transférez le fichier par USB/mail/Drive).
2. Ouvrez le fichier téléchargé → Android demande « Installer depuis une source inconnue » → autorisez (Paramètres → Applications → accès spécial → Installer des applications inconnues).
3. L'app **Pense-bête vocaux** s'installe avec son icône 🎙️. Au premier enregistrement, acceptez la permission micro.

> Rebuild local de l'APK : `npx expo prebuild -p android --clean` puis `cd android && ./gradlew assembleRelease`
> (JDK 17 + SDK Android 35 requis ; l'APK est signé avec la clé debug du template Expo, ce qui suffit pour une installation locale).

## Développement local (Expo Go)

```bash
git clone https://github.com/88994ztdwp-collab/Pense-bete-vocau.git
cd Pense-bete-vocau
npm install        # ou: npx expo install (cale les versions compatibles du SDK)
npx expo start     # QR code à scanner avec l'app Expo Go (même Wi-Fi, ou --tunnel)
```

## Builds et publication avec EAS

Le fichier `eas.json` est fourni (profils `development`, `preview`, `production`).

```bash
npm install -g eas-cli
eas login                      # compte Expo
eas whoami                     # vérification
```

Avant le premier build, remplacez dans `app.json` les identifiants par les vôtres :
`ios.bundleIdentifier` et `android.package` (ex. `com.votrenom.pensebetevocaux`).

### APK Android de test (sans compte payant)

```bash
eas build --profile development --platform android
# suivez le build sur expo.dev, puis téléchargez l'artefact :
eas build:download --platform android --latest
# transférez l'.apk sur le téléphone et installez-le (autoriser la source inconnue)
```

### iOS (compte Apple Developer requis)

```bash
eas build --profile development --platform ios
# enregistrez l'UDID de l'iPhone : eas device:create
# gérez les certificats : eas credentials  (laissez EAS les générer)
# puis installez le build depuis le lien/QR fourni par EAS, ou via TestFlight
```

### Publication sur les stores (production)

```bash
eas build --profile production --platform android   # génère l'AAB
eas submit --platform android                        # Google Play Console (clé de service JSON)
eas build --profile production --platform ios
eas submit --platform ios                            # App Store Connect
```

### Commandes utiles

```bash
eas build:list        # historique des builds
eas build:view <id>   # détail/logs d'un build
eas credentials       # identifiants iOS (certificats, profils) et Android (keystore)
```

Toute modification du code nécessite un **nouveau build** (pas de mise à jour OTA :
`expo-updates` n'est pas configuré).

## Structure

- `App.js` — écran unique : enregistreur, filtres, liste des notes
- `src/db.js` — SQLite (tables `categories`, `notes`)
- `src/audio.js` — enregistrement / lecture (`expo-av`)
- `src/speech.js` — synthèse vocale fr (`expo-speech`)
- `src/notifications.js` — rappels d'échéance (`expo-notifications`)
- `src/components/NoteCard.js` — carte de note
- `assets/` — icône, splash, icône adaptative Android
- `eas.json` — profils de build EAS
