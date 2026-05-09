"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const navItems = [
  { label: "Tableau de bord",  href: "/",                icon: "ph-house" },
  { label: "Appels d'offres",  href: "/appels-offres",   icon: "ph-gavel" },
  { label: "Soumissions",      href: "/soumissions",     icon: "ph-paper-plane-tilt" },
  { label: "Fournisseurs",     href: "/fournisseurs",    icon: "ph-buildings" },
  { label: "Résultats",        href: "/resultats",       icon: "ph-medal" },
  { label: "Projets",          href: "/projets",         icon: "ph-folder" },
  { label: "Analytique",       href: "/analytics",       icon: "ph-chart-bar" },
];

const workspaceItems = [
  { label: "Équipe",      href: "/equipe",    icon: "ph-users-three" },
  { label: "Templates",   href: "/templates", icon: "ph-files" },
  { label: "Paramètres",  href: "/parametres",icon: "ph-gear" },
];

const ROLE_LABELS: Record<string, string> = {
  DIRECTEUR: "Direction",
  ADMIN: "Administration",
  FINANCIER: "Finance",
  MEMBRE: "Membre",
};

interface SidebarProps {
  userName: string;
  userRole: string;
}

export function Sidebar({ userName, userRole }: SidebarProps) {
  const pathname = usePathname();
  const initials = userName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="brand-mark" aria-hidden="true">C</span>
        <div>
          <div className="brand-name">CHADIA</div>
          <div className="brand-org">Projects</div>
        </div>
      </div>

      <div className="sidebar-section">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${isActive(item.href) ? "active" : ""}`}
          >
            <i className={`ph ${item.icon} nav-icon`} aria-hidden="true"></i>
            <span>{item.label}</span>
          </Link>
        ))}
      </div>

      <div className="sidebar-section" style={{ marginTop: "auto" }}>
        <div className="sidebar-section-title">Espace de travail</div>
        {workspaceItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${isActive(item.href) ? "active" : ""}`}
          >
            <i className={`ph ${item.icon} nav-icon`} aria-hidden="true"></i>
            <span>{item.label}</span>
          </Link>
        ))}
      </div>

      <div className="sidebar-footer">
        <div className="user-chip" role="button" tabIndex={0}>
          <div className="avatar avatar--sm avatar--terracotta">{initials}</div>
          <div className="meta">
            <div className="name">{userName}</div>
            <div className="role">{ROLE_LABELS[userRole] ?? userRole}</div>
          </div>
          <i className="ph ph-caret-up-down" aria-hidden="true" style={{ color: "var(--color-mineral)", fontSize: 14 }}></i>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="nav-item"
          style={{ marginTop: 4, fontSize: "var(--text-xs)", color: "var(--color-stone)", width: "100%" }}
        >
          <i className="ph ph-sign-out nav-icon" aria-hidden="true"></i>
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>
  );
}
