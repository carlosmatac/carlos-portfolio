import "./globals.css";
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Instrument_Serif } from "next/font/google";
import { site } from "@/content/site";

/** Editorial voice for the journey's places, set against Geist. */
const serif = Instrument_Serif({ weight: "400", style: ["normal", "italic"], subsets: ["latin"], variable: "--font-serif" });

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
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} ${serif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
