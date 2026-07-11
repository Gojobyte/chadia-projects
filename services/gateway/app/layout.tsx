import type { Metadata } from "next";
import { Instrument_Serif, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./sahel-tokens.css";
import "./globals.css";
// Phosphor Icons auto-hébergé (regular uniquement — duotone inutilisée) :
// bundlé/minifié par Next, police woff2 fingerprintée et cachée à vie,
// plus aucune requête vers unpkg (CSS bloquant tiers supprimé).
import "./fonts/phosphor/regular.css";

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
      <body>{children}</body>
    </html>
  );
}
