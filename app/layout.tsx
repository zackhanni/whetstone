import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Whetstone",
  description: "Sharpen any skill through deliberate practice.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
