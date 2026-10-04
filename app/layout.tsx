import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import { DemoBar } from "@/components/DemoBar";
import { isDemoMode } from "@/lib/config";

export const metadata: Metadata = {
  title: "ReviewLoop",
  description: "Video feedback for coaching communities on Whop",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#111113" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={GeistSans.variable}>
      <body>
        {isDemoMode && <DemoBar />}
        {children}
      </body>
    </html>
  );
}
