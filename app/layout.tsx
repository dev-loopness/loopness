import type { Metadata } from "next";
import "./globals.css";
import { DemoBar } from "@/components/DemoBar";
import { isDemoMode } from "@/lib/config";

export const metadata: Metadata = {
  title: "ReviewLoop",
  description: "Video feedback for coaching communities on Whop",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {isDemoMode && <DemoBar />}
        {children}
      </body>
    </html>
  );
}
