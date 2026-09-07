import "./globals.css";
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "Por favor, toca — Carlos Mata",
  description:
    "Una máquina de pequeñas consecuencias. Juega, explora y descubre los proyectos de Carlos Mata, Software & Data Engineer en Madrid.",
  icons: {
    icon: "/carlos_logo.svg",
  },
  openGraph: {
    title: `Por favor, toca — ${site.name}`,
    description: "Objetos, código y pequeñas consecuencias. Un portfolio para jugar.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={GeistSans.variable}>
      <body>{children}</body>
    </html>
  );
}
