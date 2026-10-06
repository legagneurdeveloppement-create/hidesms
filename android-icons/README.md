# Icônes & Splash screen Android

Ce dossier contient toutes les icônes générées pour HideSMS, prêtes à installer
dans le projet Android natif.

## Icônes d'application (launcher)

Après avoir lancé `bun run mob:add:android`, copiez les icônes générées dans le
projet Android :

```bash
# Depuis la racine du projet, après `cap add android` :
cp -r android-icons/mipmap-mdpi    android/app/src/main/res/
cp -r android-icons/mipmap-hdpi    android/app/src/main/res/
cp -r android-icons/mipmap-xhdpi   android/app/src/main/res/
cp -r android-icons/mipmap-xxhdpi  android/app/src/main/res/
cp -r android-icons/mipmap-xxxhdpi android/app/src/main/res/
```

Ces dossiers contiennent `ic_launcher.png` et `ic_launcher_round.png` (icône
carrée et ronde). Android choisit automatiquement la bonne densité selon
l'appareil :

| Dossier | Taille | Densité |
|---|---|---|
| `mipmap-mdpi` | 48×48 | 1× |
| `mipmap-hdpi` | 72×72 | 1.5× |
| `mipmap-xhdpi` | 96×96 | 2× |
| `mipmap-xxhdpi` | 144×144 | 3× |
| `mipmap-xxxhdpi` | 192×192 | 4× |

## Icône Play Store

- **`android-icons/playstore-icon.png`** (512×512) — à uploader sur la fiche
  Play Console lors de la publication.

## Splash screen (écran de lancement)

Le dossier `android-icons/splash/` contient les images plein écran affichées au
démarrage de l'app (fond violet `#1a1626` avec l'icône centrée).

Avec le plugin `@capacitor/splash-screen` (déjà installé), le splash est
configuré automatiquement via `capacitor.config.ts` :

```ts
plugins: {
  SplashScreen: {
    launchShowDuration: 800,
    backgroundColor: "#1a1626",
    androidScaleType: "CENTER_CROP",
  }
}
```

Pour personnaliser l'image du splash (au lieu du fond uni + icône), copiez les
fichiers dans le projet Android :

```bash
mkdir -p android/app/src/main/res/drawable
cp android-icons/splash/splash-xxxhdpi.png android/app/src/main/res/drawable/splash.png
```

Puis ajoutez dans `capacitor.config.ts` :

```ts
plugins: {
  SplashScreen: {
    launchShowDuration: 800,
    src: "splash.png",
    backgroundColor: "#1a1626",
    androidScaleType: "CENTER_CROP",
  }
}
```

Et relancez `bunx cap sync android`.

## Alternative : Android Studio Image Asset Studio

Pour un réglage fin (icône adaptative avec avant-plan/arrière-plan séparés,
icône ronde, etc.), utilisez **Android Studio** :

1. Clic droit sur `android/app/src/main/res` → **New → Image Asset**
2. **Icon Type** : Launcher Icons
3. **Source Asset** : `icon-source.png` (à la racine du projet)
4. Ajustez le padding, le fond, la forme
5. **Next → Finish** (génère tous les mipmap automatiquement)

## Icônes web (PWA)

Les icônes web sont déjà placées dans `public/` et référencées dans
`src/app/layout.tsx` + `public/manifest.webmanifest` :

- `public/favicon.png` (32×32) — favicon
- `public/icon-192.png` (192×192) — PWA
- `public/icon-512.png` (512×512) — PWA
- `public/apple-touch-icon.png` (180×180) — iOS
- `public/icon.png` (1024×1024) — source haute résolution

## Régénération

Pour recréer toutes les tailles (après modification de `icon-source.png`) :

```bash
# Icônes + splash en une fois
bun run gen:icons
```

(Ajoutez le script `gen:icons` dans `package.json` si vous voulez l'automatiser,
ou relancez le script de génération fourni.)
