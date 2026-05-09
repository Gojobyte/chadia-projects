"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Icons } from "@/components/icons";

const navItems = [
  { label: "Tableau de bord", href: "/", icon: Icons.Dashboard },
  { label: "Projets", href: "/projets", icon: Icons.Folder },
  { label: "Appels d'offres", href: "/appels-offres", icon: Icons.Gavel },
  { label: "Fournisseurs", href: "/fournisseurs", icon: Icons.Building },
  { label: "Resultats", href: "/resultats", icon: Icons.Award },
  { label: "Boite de reception", href: "/inbox", icon: Icons.Inbox, countValue: 3 },
  { label: "Calendrier", href: "/calendrier", icon: Icons.Calendar },
  { label: "Analytics", href: "/analytics", icon: Icons.Chart },
];

const workspaceItems = [
  { label: "Équipe", href: "/equipe", icon: Icons.Users },
  { label: "Templates", href: "/templates", icon: Icons.Doc },
  { label: "Paramètres", href: "/settings", icon: Icons.Settings },
];

const pinColors = [
  "oklch(0.55 0.18 270)", "oklch(0.55 0.18 245)", "oklch(0.55 0.15 30)",
  "oklch(0.55 0.15 0)", "oklch(0.55 0.15 165)",
];

interface StarredProjet { id: string; titre: string; bailleur: { sigle: string }; }
interface SidebarProps { userName: string; userRole: string; }

export function Sidebar({ userName, userRole }: SidebarProps) {
  const pathname = usePathname();
  const roleLabels: Record<string, string> = { DIRECTEUR: "Directrice des programmes", ADMIN: "Administrateur", FINANCIER: "Financier", MEMBRE: "Membre" };
  const initials = userName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  const [starred, setStarred] = useState<StarredProjet[]>([]);

  // Charger les projets epingles
  useEffect(() => {
    fetch("/api/projets/starred")
      .then(r => r.ok ? r.json() : { projets: [] })
      .then(d => setStarred(d.projets ?? []));
  }, []);

  // Ecouter les changements d'etoile (custom event)
  useEffect(() => {
    function onStarChange() {
      fetch("/api/projets/starred")
        .then(r => r.ok ? r.json() : { projets: [] })
        .then(d => setStarred(d.projets ?? []));
    }
    window.addEventListener("star-changed", onStarChange);
    return () => window.removeEventListener("star-changed", onStarChange);
  }, []);

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <svg width="32" height="32" viewBox="0 0 28 28">
          <rect width="28" height="28" rx="8" fill="var(--primary)" />
          <path d="M9 14 l3 3 l7 -7" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div>
          <div className="brand-name">CHADIA</div>
          <div className="brand-org">Projects · v2.0</div>
        </div>
      </div>

      <div className="sidebar-section">
        {navItems.map((item) => {
          const Ic = item.icon;
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} className={`nav-item ${isActive ? "active" : ""}`}>
              <Ic className="nav-icon" />
              <span>{item.label}</span>
              {item.countValue != null && <span className="nav-count">{item.countValue}</span>}
            </Link>
          );
        })}
      </div>

      {/* Épinglés — dynamique */}
      {starred.length > 0 && (
        <div className="sidebar-section">
          <div className="sidebar-section-title">Épinglés</div>
          {starred.map((p, i) => {
            const isActive = pathname === `/projets/${p.id}`;
            return (
              <Link key={p.id} href={`/projets/${p.id}`} className={`nav-item ${isActive ? "active" : ""}`}>
                <span className="nav-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: pinColors[i % pinColors.length] }} />
                </span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.titre}</span>
              </Link>
            );
          })}
        </div>
      )}

      <div className="sidebar-section" style={{ marginTop: "auto" }}>
        <div className="sidebar-section-title">Espace de travail</div>
        {workspaceItems.map((item) => {
          const Ic = item.icon;
          const isActive = pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} className={`nav-item ${isActive ? "active" : ""}`}>
              <Ic className="nav-icon" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="sidebar-footer">
        <div className="user-chip">
          <div className="avatar" style={{ background: "oklch(0.6 0.15 165)" }}>{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{userName}</div>
            <div style={{ fontSize: 11, color: "var(--text-3)" }}>{roleLabels[userRole] ?? userRole}</div>
          </div>
          <Icons.ChevronDown size={14} style={{ color: "var(--text-4)" }} />
        </div>
        <button onClick={() => signOut({ callbackUrl: "/login" })} className="nav-item" style={{ marginTop: 4, fontSize: 12, color: "var(--text-3)" }}>
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
