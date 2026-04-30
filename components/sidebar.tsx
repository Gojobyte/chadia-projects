"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Icons } from "@/components/icons";

const navItems = [
  { label: "Tableau de bord", href: "/", icon: Icons.Dashboard },
  { label: "Projets", href: "/projets", icon: Icons.Folder },
  { label: "Analytics", href: "/analytics", icon: Icons.Chart },
  { label: "Templates", href: "/templates", icon: Icons.Doc },
];

const settingsItems = [
  { label: "Equipe", href: "/equipe", icon: Icons.Users },
  { label: "Parametres", href: "/settings", icon: Icons.Settings },
];

interface SidebarProps { userName: string; userRole: string; }

export function Sidebar({ userName, userRole }: SidebarProps) {
  const pathname = usePathname();
  const roleLabels: Record<string, string> = { DIRECTEUR: "Directeur", ADMIN: "Admin", FINANCIER: "Financier", MEMBRE: "Membre" };
  const initials = userName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="brand-mark">CP</div>
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
            </Link>
          );
        })}
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-title">Parametres</div>
        {settingsItems.map((item) => {
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
          <div className="avatar" style={{ background: "var(--primary)" }}>{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userName}</div>
            <div style={{ fontSize: 11, color: "var(--text-3)" }}>{roleLabels[userRole] ?? userRole}</div>
          </div>
        </div>
        <button onClick={() => signOut({ callbackUrl: "/login" })} className="nav-item" style={{ marginTop: 4, fontSize: 12, color: "var(--text-3)" }}>
          Deconnexion
        </button>
      </div>
    </aside>
  );
}
