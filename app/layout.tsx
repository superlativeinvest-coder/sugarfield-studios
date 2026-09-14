import type { Metadata } from "next";
import { SiteChrome } from "@/components/site/SiteChrome";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sugarfield Studio",
  description: "Gaming guides, trackers, planners, and collector tools.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
