import "./globals.css";
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "Carlos Mata — Software & Data Engineering",
  description:
    "Software & Data Engineer. Databricks, dbt and Snowflake at work; Node.js, React and Supabase on personal projects. Based in Madrid.",
  icons: {
    icon: "/carlos_logo.svg",
  },
  openGraph: {
    title: site.name,
    description: "Software & Data Engineer.",
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
