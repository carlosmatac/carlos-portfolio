import "./globals.css";
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "Carlos Mata — Software & Data",
  description:
    "Software, data, and a little curiosity. Explore the work of Carlos Mata, Software & Data Engineer in Madrid.",
  icons: {
    icon: "/carlos_logo.svg",
  },
  openGraph: {
    title: site.name,
    description: "Software, data, and a little curiosity.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={GeistSans.variable}>
      <body>{children}</body>
    </html>
  );
}
