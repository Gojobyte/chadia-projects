import Link from "next/link";
import { PublicNav } from "./public-nav";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="gov-banner">
        <div className="wrap">
          <span>
            République du Tchad · CHADIA — ONG pour le développement du Tchad —
            référencée n° <strong>RCS-TCD-2014-128</strong>
          </span>
          <div className="right">
            <Link href="/contact"><i className="ph ph-question"></i> Aide</Link>
            <Link href="/contact"><i className="ph ph-shield-check"></i> Signaler une irrégularité</Link>
            <Link href="/login"><i className="ph ph-arrow-square-out"></i> Espace partenaires</Link>
          </div>
        </div>
      </div>

      <header className="site">
        <div className="site-wrap">
          <Link href="/" className="site-brand">
            <span className="mark">C</span>
            <span className="nm">
              CHADIA
              <em>pour le développement du Tchad</em>
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
            <div className="org">CHADIA <em>pour le Tchad</em></div>
            <p className="desc">
              CHADIA — ONG pour le développement du Tchad — opère dans le bassin du Lac Tchad
              depuis 2014. Reconnue d&apos;utilité publique.
            </p>
            <p className="desc" style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
              Avenue Mobutu, BP 1284 — N&apos;Djamena, République du Tchad
            </p>
          </div>
          <div>
            <h5>Transparence</h5>
            <Link href="/marches">Registre des marchés</Link>
            <Link href="/marches">Données ouvertes (OCDS)</Link>
            <Link href="/rapports">Rapports financiers</Link>
            <Link href="/rapports">Audit annuel</Link>
            <Link href="/contact">Mécanisme de plainte</Link>
          </div>
          <div>
            <h5>Partenaires</h5>
            <Link href="/login">Espace bailleurs</Link>
            <Link href="/login">Espace fournisseurs</Link>
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
        <div className="legal">
          <span>© 2014–{new Date().getFullYear()} CHADIA · Tous droits réservés</span>
          <span>Propulsé par <strong>CHADIA Projects</strong> · v2.4</span>
        </div>
      </footer>
    </>
  );
}
