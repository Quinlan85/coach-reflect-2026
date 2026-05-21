import type { Metadata } from "next";
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
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
