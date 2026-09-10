import type { MetadataRoute } from "next";

// Installability, and nothing more.
//
// Adding a Home Screen icon does NOT make stored reflections permanent. On iOS,
// Safari's Intelligent Tracking Prevention deletes all script-writable storage
// (localStorage included) after seven days without site interaction. A web app
// launched from the Home Screen gets its own day-of-use counter for its
// first-party origin, which in practice means a coach who opens the app is not
// caught by the seven-day sweep — but that is a browser behaviour Apple can
// change, not a guarantee. No copy is held anywhere else. The disclosure on the
// first screen says exactly that, and must not be softened.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Coach Reflection | CQ",
    short_name: "Reflect",
    description: "Post-match self-reflection for coaches.",
    start_url: "/",
    display: "standalone",
    background_color: "#1A1A1A",
    theme_color: "#1A1A1A",
    orientation: "portrait",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
