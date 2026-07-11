import Link from "next/link";
import { Fraunces, Archivo, IBM_Plex_Mono } from "next/font/google";
import { PublicNav } from "./public-nav";
import { PublicFx } from "@/components/public/PublicFx";
import "../public-theme.css";

// Fonts de la direction « Prestige » — chargées uniquement pour le site
// public ; l'application privée reste sur les fonts Sahel du layout racine.
// Fraunces est variable (poids + axe optique) : les grands corps de titre
// s'affinent automatiquement, les italiques servent d'accent éditorial.
const display = Fraunces({
  variable: "--pub-font-display",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  display: "swap",
});

const sans = Archivo({
  variable: "--pub-font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
  display: "swap",
});

const mono = IBM_Plex_Mono({
  variable: "--pub-font-mono",
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
});

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`pub ${display.variable} ${sans.variable} ${mono.variable}`}>
      <PublicFx />
      <div className="gov-banner">
        <div className="wrap">
          <Link href="/login" className="gov-login">
            <i className="ph ph-lock-key"></i> Espace pro
          </Link>
          <span>
            République du Tchad · CHADIA pour le Développement du Tchad (CDT) —
            enregistrée sous N° <strong>154/PCMT/PMT/MEPDCI/SE/SPONGAH/2021</strong> du 08/12/2021
          </span>
          <div className="right">
            <Link href="/contact"><i className="ph ph-question"></i> Aide</Link>
            <Link href="/contact"><i className="ph ph-shield-check"></i> Signaler une irrégularité</Link>
          </div>
        </div>
      </div>

      <header className="site">
        <div className="site-wrap">
          <Link href="/" className="site-brand">
            <img
              className="mark-img"
              src="/images/brand/logo-mark.webp"
              alt="Logo CHADIA — carte du Tchad avec le monogramme CDT"
            />
            <span className="nm">
              CHADIA
              <em>ONG nationale — Tchad</em>
            </span>
          </Link>
          <PublicNav />
          <div className="lang">
            <a href="#" className="on">FR</a>
            <a href="#">EN</a>
            <a href="#">عر</a>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="siteft">
        <div className="siteft-wrap">
          <div>
            <img
              className="ft-logo"
              src="/images/brand/logo-full.webp"
              alt="CHADIA pour le Développement du Tchad"
              loading="lazy"
            />
            <div className="org">CHADIA <em>pour le Tchad</em></div>
            <p className="desc">
              CHADIA pour le Développement du Tchad (CDT) — ONG de droit tchadien à but non lucratif,
              enregistrée le 08/12/2021 auprès du Ministère de l&apos;Économie, de la Planification du Développement
              et de la Coopération Internationale (Direction des ONG).
            </p>
            <p className="desc" style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
              Quartier Kabalaye · en face stade Idriss Mahamat Ouya · Avenue Bezo — N&apos;Djamena, Tchad<br />
              Tél. : +235 65 62 62 40 / +235 92 29 94 36 · tidjani@chadia-ong.org
            </p>
          </div>
          <div>
            <h5>Transparence</h5>
            <Link href="/precom">Projet PRECOM (en cours)</Link>
            <Link href="/resultats">Résultats des projets</Link>
            <Link href="/gouvernance">Gouvernance & éthique</Link>
            <Link href="/contact">Mécanisme de plainte</Link>
          </div>
          <div>
            <h5>Partenaires</h5>
            <Link href="/login">Espace bailleurs</Link>
            <Link href="/login">Espace équipes terrain</Link>
            <Link href="/login">Authentification CHADIA</Link>
          </div>
          <div>
            <h5>Suivez-nous</h5>
            <Link href="/contact">Newsletter mensuelle</Link>
            <a href="https://www.linkedin.com" rel="noreferrer noopener" target="_blank">LinkedIn</a>
            <a href="https://www.x.com" rel="noreferrer noopener" target="_blank">X (Twitter)</a>
            <Link href="/contact">Presse · contact</Link>
          </div>
        </div>
        <div className="ft-word" aria-hidden="true">CHADIA</div>
        <div className="legal">
          <span>© 2014–{new Date().getFullYear()} CHADIA · Tous droits réservés</span>
          <span>Propulsé par <strong>CHADIA Projects</strong> · v3.0</span>
        </div>
      </footer>
    </div>
  );
}
