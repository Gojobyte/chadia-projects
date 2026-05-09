"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const ROUTE_NAMES: Record<string, string> = {
  "/": "Tableau de bord",
  "/appels-offres": "Appels d'offres",
  "/soumissions": "Soumissions",
  "/fournisseurs": "Fournisseurs",
  "/resultats": "Résultats",
  "/projets": "Projets",
  "/analytics": "Analytique",
  "/equipe": "Équipe",
  "/templates": "Templates",
  "/parametres": "Paramètres",
};

export function Topbar() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  const crumbs: { label: string; href: string }[] = [{ label: "CHADIA", href: "/" }];
  if (segments.length === 0) {
    crumbs.push({ label: "Tableau de bord", href: "/" });
  } else {
    const base = `/${segments[0]}`;
    crumbs.push({ label: ROUTE_NAMES[base] ?? segments[0], href: base });
    if (segments.length === 2 && segments[1] === "nouveau") {
      crumbs.push({ label: "Nouveau", href: pathname });
    } else if (segments.length >= 2) {
      crumbs.push({ label: "Détail", href: pathname });
    }
  }

  return (
    <header className="topbar">
      <nav className="crumbs" aria-label="Fil d'ariane">
        {crumbs.map((c, i) => (
          <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            {i > 0 && <span className="sep">/</span>}
            {i === crumbs.length - 1 ? (
              <span className="cur">{c.label}</span>
            ) : (
              <Link href={c.href}>{c.label}</Link>
            )}
          </span>
        ))}
      </nav>

      <label className="search">
        <i className="ph ph-magnifying-glass" aria-hidden="true"></i>
        <input placeholder="Rechercher un AO, fournisseur, projet…" />
        <kbd>⌘K</kbd>
      </label>

      <button className="icon-btn" title="Notifications" aria-label="Notifications">
        <i className="ph ph-bell" aria-hidden="true" style={{ fontSize: 16 }}></i>
        <span className="dot" />
      </button>

      <button className="icon-btn" title="Aide" aria-label="Aide">
        <i className="ph ph-question" aria-hidden="true" style={{ fontSize: 16 }}></i>
      </button>
    </header>
  );
}
