"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Icons } from "@/components/icons";

const routeNames: Record<string, string> = {
  "/": "Tableau de bord",
  "/projets": "Projets",
  "/analytics": "Analytics",
  "/templates": "Templates",
  "/equipe": "Équipe",
  "/settings": "Paramètres",
  "/inbox": "Boîte de réception",
  "/calendrier": "Calendrier",
};

export function Topbar() {
  const pathname = usePathname();

  // Generer les breadcrumbs depuis le pathname
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; href: string }[] = [{ label: "CHADIA", href: "/" }];

  if (segments.length === 0) {
    crumbs.push({ label: "Tableau de bord", href: "/" });
  } else {
    const base = `/${segments[0]}`;
    crumbs.push({ label: routeNames[base] ?? segments[0], href: base });
    // On n'affiche pas les sous-segments dynamiques pour garder ça propre
  }

  return (
    <header className="topbar">
      {/* Breadcrumbs */}
      <div className="crumbs">
        {crumbs.map((c, i) => (
          <span key={i}>
            {i > 0 && <span className="sep" style={{ margin: "0 2px" }}>/</span>}
            {i === crumbs.length - 1 ? (
              <span className="current">{c.label}</span>
            ) : (
              <Link href={c.href} style={{ color: "var(--text-3)", textDecoration: "none" }}>{c.label}</Link>
            )}
          </span>
        ))}
      </div>

      {/* Search bar */}
      <div className="search">
        <Icons.Search size={14} />
        <input placeholder="Rechercher un projet, document, personne..." />
        <kbd>⌘K</kbd>
      </div>

      {/* Notifications */}
      <button className="icon-btn" title="Notifications">
        <Icons.Bell size={16} />
        <span className="dot" />
      </button>

      {/* Nouveau projet */}
      <Link href="/projets/nouveau" className="btn btn-primary btn-sm" style={{ whiteSpace: "nowrap" }}>
        <Icons.Plus size={14} /> Nouveau projet
      </Link>
    </header>
  );
}
