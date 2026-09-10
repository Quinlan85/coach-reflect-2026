import type { Metadata, Viewport } from "next";
export const metadata: Metadata = {
  title: "Coach Reflection | CQ",
  description: "Coach reflection tool",
  openGraph: {
    title: "CQ Coach Reflection",
    description: "Every game teaches you something. Time to find out what.",
    images: ["/hero.jpg"],
    url: "https://coach.cqperform.ie",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CQ Coach Reflection",
    description: "Every game teaches you something. Time to find out what.",
    images: ["/hero.jpg"],
  },
  // Home Screen installation. See app/manifest.ts — this improves how the app
  // launches, it does not make anything permanent.
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Reflect",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#1A1A1A",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
