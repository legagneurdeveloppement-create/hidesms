# Générer l'APK Android de HideSMS

HideSMS est désormais une application **100 % locale** : toutes les données
(conversations, messages, code PIN, coffre) sont stockées dans **IndexedDB sur
l'appareil**. Aucun serveur n'est nécessaire. Cette page explique comment
compiler l'application en un fichier `.apk` installable sur Android.

> Prérequis : cette compilation se fait **sur votre machine** (le sandbox de
> développement ne dispose pas d'Android SDK). Comptez ~15 min la première fois.

---

## 1. Prérequis (à installer une fois)

| Logiciel | Pourquoi | Lien |
|---|---|---|
| **Node.js 18+** et **Bun** | Build du web | https://bun.sh |
| **Android Studio** (inclut Android SDK + Gradle) | Compilation native | https://developer.android.com/studio |
| **JDK 17** | Requis par Gradle | livré avec Android Studio |

Après l'installation d'Android Studio, ouvrez-le une fois pour qu'il télécharge
le SDK Android (il vous le proposera au démarrage).

---

## 2. Récupérer le projet

Si vous n'avez pas le code sur votre machine, copiez le dossier du projet
(`src/`, `package.json`, `next.config.ts`, `capacitor.config.ts`, etc.).

Puis dans le dossier du projet :

```bash
bun install
```

---

## 3. Build du web (statique)

```bash
bun run mob:build
```

Cela génère un dossier **`out/`** contenant le site statique (HTML/JS/CSS).
Toutes les données vivront dans IndexedDB côté appareil.

---

## 4. Ajouter la plateforme Android (une seule fois)

```bash
bun run mob:add:android
```

Cela crée un dossier **`android/`** (projet Android natif). Ne l'éditez pas à la
main sauf pour personnaliser l'icône ou le nom.

---

## 5. Synchroniser le web vers Android

À chaque modification du code web, relancez :

```bash
bun run mob:sync
```

Cela rebuild `out/` et le copie dans le projet Android.

---

## 6. Ouvrir dans Android Studio

```bash
bun run mob:open
```

Android Studio s'ouvre sur le projet `android/`. Patientez le temps que Gradle
se synchronise (la première fois, plusieurs centaines de Mo sont téléchargés).

---

## 7. Générer l'APK

### APK de débogage (rapide, pour tester sur votre téléphone)

Dans Android Studio :

1. Menu **Build → Build Bundle(s) / APK(s) → Build APK(s)**
2. Attendez la fin de la build (1-3 min)
3. Cliquez sur **« locate »** dans la notification → vous obtenez
   `android/app/build/outputs/apk/debug/app-debug.apk`
4. Transférez ce `.apk` sur votre téléphone Android et installez-le (autorisez
   « sources inconnues » si demandé)

### APK signé (pour publication / Play Store)

1. Menu **Build → Generate Signed Bundle / APK → APK**
2. Créez un keystore (une seule fois, gardez-le précieusement)
3. Choisissez **release**, finissez la build
4. Vous obtenez `android/app/release/app-release.apk`

---

## 8. Tester sur un appareil ou un émulateur

- **Émulateur** : dans Android Studio, ouvrez le **Device Manager**, créez un
  appareil virtuel (ex. Pixel 7), puis cliquez sur **Run** ( triangle vert).
- **Appareil réel** : activez le **mode développeur** et le **débogage USB** sur
  votre téléphone, branchez-le, puis **Run**. L'app s'installe et se lance.

---

## Détails techniques

- **Identifiant de l'app** : `com.hidesms.app` (modifiable dans
  `capacitor.config.ts` puis `cap sync`).
- **Nom affiché** : « HideSMS » (modifiable dans `capacitor.config.ts`).
- **Stockage** : IndexedDB du WebView Android. Les données sont privées à
  l'application ; elles sont supprimées si l'utilisateur désinstalle l'app.
- **Hors-ligne** : l'app fonctionne 100 % hors-ligne après installation.
- **PIN** : haché avec SHA-256 via `crypto.subtle` (disponible dans le WebView).
- **Icône d'app** : à personnaliser dans
  `android/app/src/main/res/` (remplacez `ic_launcher.png` dans les dossiers
  `mipmap-*`). Vous pouvez utiliser Android Studio → « Image Asset Studio ».

## Dépannage

| Problème | Solution |
|---|---|
| `cap: command not found` | Lancez `bun install` puis utilisez `bunx cap ...` |
| Build Gradle en erreur (JDK) | Vérifiez que Android Studio utilise JDK 17 (File → Project Structure → SDK Location) |
| Écran blanc au lancement | Vérifiez que `out/` est bien généré (`bun run mob:build`) et que `cap sync` a été lancé |
| `crypto.subtle` indisponible | Assurez-vous que `androidScheme: "https"` est dans `capacitor.config.ts` (déjà le cas) |

## Commandes utiles

```bash
bun run mob:build        # build statique -> out/
bun run mob:sync         # build + sync vers android/
bun run mob:open         # ouvrir Android Studio
bunx cap copy            # copier le web sans rebuild
bunx cap sync android    # sync web + plugins android
```
