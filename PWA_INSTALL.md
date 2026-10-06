# Installer HideSMS comme PWA

HideSMS est une **PWA** (Progressive Web App) : vous pouvez l'installer sur
votre téléphone ou ordinateur comme une vraie application, sans passer par le
Play Store ni générer d'APK. Toutes les données restent dans le navigateur
(IndexedDB) — 100 % privé, fonctionne hors-ligne.

---

## 1. Lancer la PWA en développement

```bash
bun install        # une fois
bun run pwa:dev    # démarre le serveur de dev sur http://localhost:3000
```

Ouvrez http://localhost:3000 dans votre navigateur.

---

## 2. Installer la PWA sur votre téléphone (depuis un déploiement)

Pour qu'une PWA soit installable, elle doit être servie en **HTTPS**. Le plus
simple est de la déployer gratuitement sur **Vercel** ou **Netlify**.

### Option A — Vercel (recommandé, ~2 min)

1. Poussez le projet sur un dépôt GitHub
2. Allez sur https://vercel.com → **New Project** → importez le dépôt
3. Framework preset : **Next.js**
4. Cliquez **Deploy** — c'est fini, vous obtenez une URL `https://hidesms.vercel.app`

### Option B — Netlify

1. `bun run pwa:build` génère `.next/`
2. Déployez via le connecteur Netlify pour Next.js

---

## 3. Ajouter à l'écran d'accueil

Une fois sur l'URL HTTPS de la PWA :

### 📱 Android (Chrome)
1. Ouvrez l'URL dans Chrome
2. Menu (⋮) → **Ajouter à l'écran d'accueil**
3. L'app apparaît avec l'icône HideSMS, se lance en plein écran (sans barre de navigateur)

### 📱 iPhone (Safari)
1. Ouvrez l'URL dans Safari
2. Bouton Partager (⬆️) → **Sur l'écran d'accueil**
3. L'app apparaît avec l'icône HideSMS

### 💻 Ordinateur (Chrome / Edge)
1. Ouvrez l'URL
2. Icône **Installer** dans la barre d'adresse (ou Menu → Installer HideSMS)
3. L'app s'ouvre dans sa propre fenêtre

---

## 4. Ce qui marche en PWA

| Fonction | PWA | APK |
|---|---|---|
| Code PIN + coffre secret | ✅ | ✅ |
| Écran factice (calculatrice) | ✅ | ✅ |
| Icônes de notification discrètes | ✅ | ✅ |
| Stockage 100 % local (IndexedDB) | ✅ | ✅ |
| Fonctionne hors-ligne | ✅ | ✅ |
| Effacement sécurisé | ✅ | ✅ |
| Publication Play Store | ❌ | ✅ |

La PWA fait **tout** ce que fait l'APK, sauf la publication sur le Play Store.
Pour un usage personnel, la PWA est souvent suffisante et beaucoup plus simple
à mettre en place.

---

## 5. Différences techniques avec le mode APK

| Aspect | PWA (`bun run pwa:dev/build`) | APK (`bun run mob:build`) |
|---|---|---|
| `next.config.ts` | mode dynamique normal | `FORCE_STATIC_EXPORT=1` → `output: "export"` |
| Hébergement | Serveur Next.js / Vercel / Netlify | Embarqué dans l'APK (WebView) |
| Données | IndexedDB du navigateur | IndexedDB du WebView Android |
| Installation | « Ajouter à l'écran d'accueil » | Fichier `.apk` installé |
| Mises à jour | Auto (au rechargement) | Re-build + re-install de l'APK |

Les deux modes partagent **exactement le même code** : IndexedDB, hooks, UI,
manifest, icônes. Seule la config Next.js change.

---

## 6. Revenir au mode APK plus tard

Si vous voulez générer un APK après avoir utilisé la PWA, rien n'est perdu :
suivez simplement `SIGNED_APK.md` (les commandes `mob:*` passent automatiquement
en mode export statique grâce à `FORCE_STATIC_EXPORT=1`).

---

## Récapitulatif des commandes

```bash
# PWA (par défaut)
bun run pwa:dev      # dev local
bun run pwa:build    # build de production

# APK (Capacitor) — voir SIGNED_APK.md
bun run mob:build    # build statique -> out/
bun run mob:sync     # build + sync Android
```
