#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# build-signed-apk.sh
# Construit l'APK de release SIGNÉ en une seule commande.
#
# Prérequis (sur votre machine) :
#   - Bun installé (https://bun.sh)
#   - Android Studio installé (fournit Android SDK + Gradle + JDK 17)
#   - ANDROID_HOME ou ANDROID_SDK_ROOT défini
#     (Android Studio le configure automatiquement dans ~/.bashrc / ~/.zshrc)
#   - Un keystore de release créé (voir SIGNED_APK.md §2)
#   - Un fichier keystore.properties à la racine du projet (voir §3)
#
# Sortie : android/app/build/outputs/apk/release/app-release.apk
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

cd "$(dirname "$0")"

echo "▶ 1/4  Build statique du web (Next.js -> out/)"
bun run mob:build

echo "▶ 2/4  Synchronisation web -> Android (cap sync)"
if [ ! -d "android" ]; then
  echo "   (plateforme Android absente — ajout initial)"
  bunx cap add android
fi
bunx cap sync android

echo "▶ 3/4  Vérification du keystore.properties"
if [ ! -f "keystore.properties" ]; then
  echo "✗ keystore.properties introuvable."
  echo "  Copiez keystore.properties.example en keystore.properties et remplissez-le."
  echo "  Voir SIGNED_APK.md §3."
  exit 1
fi

echo "▶ 4/4  Build de l'APK release signé (Gradle)"
cd android
# gradlew est généré par `cap add android`. On utilise la tâche assembleRelease.
./gradlew assembleRelease --no-daemon

APK="../android/app/build/outputs/apk/release/app-release.apk"
cd ..
echo ""
if [ -f "$APK" ]; then
  echo "✓ APK signé généré :"
  echo "    $APK"
  SIZE=$(du -h "$APK" | cut -f1)
  echo "    Taille : $SIZE"
  echo ""
  echo "  Vérifiez la signature :"
  echo "    $ANDROID_HOME/build-tools/*/apksigner verify --verbose $APK"
else
  echo "✗ APK introuvable. Vérifiez les logs Gradle ci-dessus."
  exit 1
fi
