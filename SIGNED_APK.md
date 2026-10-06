# Générer un APK signé pour HideSMS

Ce guide explique comment produire un **APK de release signé**, installable sur
n'importe quel téléphone Android (hors Play Store) et publiable sur le Play
Store. HideSMS étant une app 100 % locale (IndexedDB), aucune infrastructure
serveur n'est nécessaire.

> Le build se fait **sur votre machine** (le sandbox de dev n'a pas Android SDK).
> Comptez ~20 min la première fois, ~3 min ensuite.

---

## 0. Prérequis (à installer une fois)

| Logiciel | Rôle | Lien |
|---|---|---|
| **Bun** | Build du web | https://bun.sh |
| **Android Studio** (inclut Android SDK + Gradle + JDK 17) | Compilation native | https://developer.android.com/studio |

Après l'installation d'Android Studio, ouvrez-le une fois pour qu'il télécharge
le SDK Android. Vérifiez que `ANDROID_HOME` est défini :

```bash
echo $ANDROID_HOME
# doit renvoyer quelque chose comme /home/moi/Android/Sdk
```

Si vide, ajoutez dans `~/.bashrc` (ou `~/.zshrc`) :

```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools
```

---

## 1. Installer les dépendances du projet

```bash
bun install
```

---

## 2. Créer le keystore de signature (une seule fois)

Le keystore prouve votre identité d'éditeur. **Gardez-le précieusement et ne le
perdez jamais** — sans lui, vous ne pourrez plus publier de mise à jour sur le
Play Store (même app ID).

```bash
keytool -genkey -v \
  -keystore ~/.keystores/hidesms-release.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias hidesms
```

Répondez aux questions (nom, organisation, mot de passe). Donnez :
- un **mot de passe du keystore** (storePassword)
- un **mot de passe de la clé** (keyPassword — peut être le même)

Le fichier `~/.keystores/hidesms-release.jks` est créé.

> ⚠️ **Sauvegardez ce fichier `.jks`** (clé USB chiffrée, gestionnaire de mots
> de passe, coffre). Sa perte est irrécupérable.

---

## 3. Renseigner `keystore.properties` (à la racine du projet)

Copiez le modèle et remplissez-le :

```bash
cp keystore.properties.example keystore.properties
```

Éditez `keystore.properties` :

```properties
storeFile=/home/moi/.keystores/hidesms-release.jks
storePassword=votre_mot_de_passe_keystore
keyAlias=hidesms
keyPassword=votre_mot_de_passe_cle
```

> Ce fichier est déjà dans `.gitignore` — il ne sera jamais committé.

---

## 4. Ajouter la plateforme Android (une seule fois)

```bash
bun run mob:add:android
```

Cela crée le dossier `android/` (projet Android natif généré par Capacitor).

---

## 5. Configurer la signature dans Gradle

Ouvrez `android/app/build.gradle` et collez le contenu de
`android-signing-snippet.gradle` dans le bloc `android { ... }` (remplacez ou
fusionnez avec le bloc existant). Le snippet :

- charge `keystore.properties` à la racine du projet
- déclare un `signingConfigs.release`
- l'associe au `buildTypes.release.signingConfig`

Sans cette étape, Gradle produirait un APK non signé (ininstallable).

---

## 6. Construire l'APK signé

### Option A — Script tout-en-un (recommandé)

```bash
./build-signed-apk.sh
```

Ce script enchaîne : build web → `cap sync` → vérification du keystore →
`gradlew assembleRelease`. Vous obtenez à la fin :

```
android/app/build/outputs/apk/release/app-release.apk
```

### Option B — Manuel, étape par étape

```bash
# 1. Build du web
bun run mob:build

# 2. Sync vers Android
bunx cap sync android

# 3. Build APK release signé
cd android
./gradlew assembleRelease --no-daemon
cd ..

# L'APK est ici :
ls -la android/app/build/outputs/apk/release/app-release.apk
```

---

## 7. Vérifier la signature

```bash
# Trouvez apksigner dans votre SDK
$ANDROID_HOME/build-tools/$(ls $ANDROID_HOME/build-tools | tail -1)/apksigner verify \
  --verbose \
  android/app/build/outputs/apk/release/app-release.apk
```

Doit afficher `Verifies` et `Signed using v1, v2, v3 scheme(s)`.

---

## 8. Installer l'APK sur un téléphone

### Via ADB (câble USB)

```bash
adb install android/app/build/outputs/apk/release/app-release.apk
```

Activez d'abord le **débogage USB** sur le téléphone (Paramètres → Options
développeur).

### Via transfert de fichier

Copiez le `.apk` sur le téléphone (USB, Drive, etc.), puis ouvrez-le depuis le
gestionnaire de fichiers. Autorisez « sources inconnues » si demandé.

---

## 9. (Optionnel) Optimiser l'APK avec zipalign + apksigner

Pour une taille minimale et une signature v3 correcte, vous pouvez aligner
manuellement (Gradle le fait déjà par défaut, mais pour vérifier) :

```bash
BT=$ANDROID_HOME/build-tools/$(ls $ANDROID_HOME/build-tools | tail -1)
$BT/zipalign -v -p 4 app-release.apk app-release-aligned.apk
$BT/apksigner sign --ks ~/.keystores/hidesms-release.jks \
  --ks-key-alias hidesms \
  --out app-final.apk \
  app-release-aligned.apk
```

---

## 10. Publier sur le Play Store (optionnel)

Pour publier, le Play Store exige un **App Bundle (.aab)** et non un APK :

```bash
cd android
./gradlew bundleRelease --no-daemon
cd ..
# Le .aab est ici :
ls -la android/app/build/outputs/bundle/release/app-release.aab
```

Puis créez un compte développeur Play Console (25 $ une fois) et uploadez le
`.aab` : https://play.google.com/console

---

## Récapitulatif des fichiers créés

| Fichier | Rôle |
|---|---|
| `MOBILE_BUILD.md` | Guide général (APK debug) |
| `SIGNED_APK.md` | **Ce guide** (APK signé release) |
| `build-signed-apk.sh` | Script tout-en-un pour générer l'APK signé |
| `keystore.properties.example` | Modèle à copier en `keystore.properties` |
| `android-signing-snippet.gradle` | Snippet à coller dans `android/app/build.gradle` |
| `capacitor.config.ts` | Config Capacitor (appId `com.hidesms.app`) |
| `.gitignore` | Ignore `keystore.properties`, `*.jks`, `/android/` |

---

## Dépannage

| Problème | Solution |
|---|---|
| `keytool: command not found` | Ajoutez le JDK d'Android Studio au PATH : `export PATH=$PATH:/opt/android-studio/jbr/bin` |
| `gradlew: command not found` | Vous êtes dans le mauvais dossier. Exécutez depuis `android/` ou utilisez `./build-signed-apk.sh` |
| `Keystore file not set for signing config release` | Vérifiez que `keystore.properties` est à la racine et que `android/app/build.gradle` contient bien le snippet |
| Build Gradle en erreur (JDK) | File → Project Structure → SDK Location → JDK 17 |
| `cap: command not found` | `bun install` puis `bunx cap ...` |
| APK généré mais non installable | Activez « sources inconnues » sur le téléphone, ou signez avec `apksigner` (§9) |
| `crypto.subtle` indisponible dans l'app | Vérifiez `androidScheme: "https"` dans `capacitor.config.ts` (déjà le cas) |

---

## Sécurité — bonnes pratiques

- ✅ **Ne commitez jamais** `keystore.properties` ni le `.jks` (déjà ignorés).
- ✅ **Sauvegardez** le keystore hors de la machine (coffre, USB chiffrée).
- ✅ **Notez** les mots de passe dans un gestionnaire (Bitwarden, 1Password…).
- ✅ Utilisez un **keystore différent** pour debug et release.
- ❌ Ne réutilisez jamais le keystore d'une autre app.
