// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";

const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-grotesk" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Carlos Mata",
  description: "Software Engineer → Data Architect",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${grotesk.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}

