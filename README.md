# Pense-bête vocaux

**PWA mobile** de mémos vocaux : enregistrez de courts messages audio, classez-les dans
des **catégories**, ajoutez une **date/échéance optionnelle**, et retrouvez tout hors-ligne.
Installable sur l'écran d'accueil (iOS Safari « Ajouter à l'écran d'accueil », Android Chrome « Installer »).

## Fonctionnalités

- 🎙️ Enregistrement audio (`MediaRecorder`) avec **transcription en direct en français** (`SpeechRecognition` fr-FR)
- 🏷️ Catégories personnalisables (couleurs, filtres par onglet)
- ⏰ Échéance optionnelle par note : tri par échéance, badge « en retard », rappels via `Notification`
- 🔊 Lecture vocale des notes (`speechSynthesis` fr-FR)
- ✅ Notes cochables « faite », recherche, export/import JSON
- 📲 **PWA installable** (manifest + service worker), **mode hors-ligne**, stockage local `IndexedDB`
- Aucune donnée envoyée sur un serveur

## Pourquoi HTTPS est requis

Le micro (`getUserMedia`), `crypto.randomUUID` et les service workers exigent un **contexte
sécurisé**. GitHub Pages sert le site en **HTTPS** automatiquement.

## Déploiement sur GitHub Pages

URL : `https://<utilisateur>.github.io/<nom-du-dépôt>/` (servi en HTTPS ; cochez
« Enforce HTTPS » dans les réglages Pages pour forcer la redirection).

Étapes :

1. Pousser ce dossier sur la branche `main` du dépôt.
2. **Settings → Pages → Build and deployment → Source : GitHub Actions**
   (le workflow `.github/workflows/pages.yml` déploie à chaque push sur `main`),
   ou bien **Source : Deploy from a branch → main / (root)**.
3. Ouvrir l'URL HTTPS sur le téléphone et installer l'app sur l'écran d'accueil.

## Développement local

```bash
python3 -m http.server 8000
# ouvrir http://localhost:8000 (le micro exige HTTPS hors localhost sur la plupart des navigateurs)
```

## Structure

- `index.html` — page principale
- `styles.css` — mise en page mobile (safe-area, sombre)
- `app.js` — logique : enregistrement, transcription, catégories, échéances, stockage IndexedDB, PWA
- `manifest.webmanifest` — manifeste PWA (standalone, icônes)
- `sw.js` — service worker (pré-cache du shell, cache-first, navigation hors-ligne)
- `icons/` — icônes PNG 192/512/maskable + apple-touch-icon
- `.github/workflows/pages.yml` — déploiement GitHub Pages via Actions
- `.nojekyll` — désactive Jekyll sur GitHub Pages
