import type { Metadata, Viewport } from "next";
// Geist via the official package rather than next/font/google: this app runs
// Next 14, whose bundled Google font list predates Geist entirely. The package
// self-hosts the same faces and needs no network at build time.
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
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
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
