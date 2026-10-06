import type { NextConfig } from "next";

// HideSMS works in TWO modes:
//  - PWA mode (default): a normal Next.js app, deployable on Vercel/Netlify,
//    installable on phones via "Add to Home Screen". Uses Next.js image opt.
//  - APK mode (Capacitor): set FORCE_STATIC_EXPORT=1 to produce a static
//    `out/` folder that Capacitor wraps into a native Android APK.

const forceStaticExport = process.env.FORCE_STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  // PWA mode (default) — no `output`, dynamic hosting.
  ...(forceStaticExport
    ? {
        output: "export" as const,
        images: { unoptimized: true },
        trailingSlash: true,
      }
    : {}),
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
