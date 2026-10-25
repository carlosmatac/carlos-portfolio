import "./globals.css";
import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { Inter_Tight } from "next/font/google";
import { site } from "@/content/site";

/** One grotesk for everything, from body copy to poster-sized headlines; Geist Mono keeps the technical details. */
const display = Inter_Tight({ subsets: ["latin"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  title: "Carlos Mata",
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
    <html lang="en" className={`${display.variable} ${GeistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
