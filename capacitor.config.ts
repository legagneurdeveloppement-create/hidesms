import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.hidesms.app",
  appName: "HideSMS",
  webDir: "out",
  // The app is fully offline (IndexedDB). No server URL.
  server: {
    androidScheme: "https",
  },
  android: {
    // Allow mixed content so the WebView can use crypto.subtle and IndexedDB.
    allowMixedContent: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: "#1a1626",
      androidScaleType: "CENTER_CROP",
    },
  },
};

export default config;
