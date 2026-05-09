import type { Metadata } from "next";
import { Instrument_Serif, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./sahel-tokens.css";
import "./globals.css";

const display = Instrument_Serif({
  variable: "--font-display-next",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  display: "swap",
});

const sans = Plus_Jakarta_Sans({
  variable: "--font-sans-next",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono-next",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CHADIA Projects",
  description: "Plateforme de gestion de marchés publics — ONG CHADIA",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <head>
        <link href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/regular/style.css" rel="stylesheet" />
        <link href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/duotone/style.css" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
