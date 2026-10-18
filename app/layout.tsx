import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import { ProgressProvider } from "@/components/progress-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

// Defaults for every route; each page adds its own title, description, canonical and Open Graph
// through pageMetadata() (lib/seo.ts).
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("dark font-sans", inter.variable)}>
      <body>
        <ProgressProvider>
          <TooltipProvider>
            {children}
          </TooltipProvider>
        </ProgressProvider>
      </body>
    </html>
  );
}
