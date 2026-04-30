import type { Metadata } from "next";
export const metadata: Metadata = { title: "Coach Reflection | CQ", description: "Coach reflection tool" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
