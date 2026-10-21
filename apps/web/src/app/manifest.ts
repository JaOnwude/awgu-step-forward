import type { MetadataRoute } from "next";

/**
 * Web app manifest: lets Android (and desktop Chrome/Edge) install
 * StepForward to the home screen as an app (DECISIONS D30). Icons are drawn
 * by scripts/make-icons.mjs.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Awgu StepForward",
    short_name: "StepForward",
    description:
      "Verified scholarships, training, apprenticeships, jobs and safe local paid work in Enugu State, Awgu first.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fbf7ef",
    theme_color: "#0f5a43",
    lang: "en-NG",
    categories: ["education", "business", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    // Long-press the home-screen icon on Android to jump straight in.
    shortcuts: [
      { name: "Find opportunities", url: "/opportunities" },
      { name: "Support sessions", url: "/sessions" },
      { name: "My account", url: "/account" },
    ],
  };
}
