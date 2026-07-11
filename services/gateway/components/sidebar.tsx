"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";

const navItems = [
  { label: "Tableau de bord",  href: "/dashboard",     icon: "ph-house" },
  { label: "Opportunités",     href: "/opportunites",  icon: "ph-binoculars" },
  { label: "Candidatures",     href: "/candidatures",  icon: "ph-folder-notch-open" },
  { label: "Projets",          href: "/projets",       icon: "ph-folders" },
  { label: "Bibliothèque",     href: "/bibliotheque",  icon: "ph-files" },
  { label: "Modèles",          href: "/templates",     icon: "ph-scroll" },
  { label: "Analyses",         href: "/analyses",      icon: "ph-chart-line" },
];

const workspaceItems = [
  { label: "Équipe",          href: "/equipe",       icon: "ph-users-three" },
  { label: "Organisation",    href: "/organisation", icon: "ph-buildings" },
  { label: "Mon profil",      href: "/mon-compte",   icon: "ph-user-circle" },
  { label: "Paramètres",      href: "/parametres",   icon: "ph-gear-six" },
];

const ROLE_LABELS: Record<string, string> = {
  DIRECTEUR: "Direction",
  ADMIN: "Administration",
  FINANCIER: "Finance",
  MEMBRE: "Membre",
};

const STORAGE_KEY = "chadia.sidebar.collapsed";

interface SidebarProps {
  userName: string;
  userRole: string;
}

export function Sidebar({ userName, userRole }: SidebarProps) {
  const pathname = usePathname();
  const initials = userName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  // État de pliage : lu/écrit dans localStorage + reflété sur <html> via data-attr
  // pour que la grille du layout (qui est server-side) puisse s'adapter via CSS.
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      const initial = stored === "1";
      setCollapsed(initial);
      document.documentElement.setAttribute("data-sb-collapsed", initial ? "true" : "false");
    } catch {
      /* localStorage indisponible (mode privé strict) — on laisse expanded */
    }
    setHydrated(true);
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch { /* idem */ }
      document.documentElement.setAttribute("data-sb-collapsed", next ? "true" : "false");
      return next;
    });
  }

  // Raccourci clavier ⌘+\ (Mac) ou Ctrl+\ (Windows/Linux), comme Claude/ChatGPT.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "\\") {
        e.preventDefault();
        toggle();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");

  // État mobile : sidebar overlay visible. Écouté via attribut sur <html>
  // pour permettre à la topbar (composant sœur) de piloter sans contexte.
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    function onToggle() {
      setMobileOpen((v) => {
        const next = !v;
        document.documentElement.setAttribute("data-sb-mobile-open", next ? "true" : "false");
        return next;
      });
    }
    function onClose() {
      setMobileOpen(false);
      document.documentElement.setAttribute("data-sb-mobile-open", "false");
    }
    window.addEventListener("chadia:sidebar-toggle", onToggle);
    window.addEventListener("chadia:sidebar-close", onClose);
    return () => {
      window.removeEventListener("chadia:sidebar-toggle", onToggle);
      window.removeEventListener("chadia:sidebar-close", onClose);
    };
  }, []);

  // Ferme la sidebar mobile quand on navigue (changement de pathname).
  useEffect(() => {
    setMobileOpen(false);
    document.documentElement.setAttribute("data-sb-mobile-open", "false");
  }, [pathname]);

  // Avant l'hydration on rend l'état "expanded" pour éviter un flash visuel.
  // Le data-attribute sur <html> protège déjà la grille au prochain paint.
  const c = hydrated && collapsed;

  return (
    <>
      <button
        type="button"
        className={`sidebar-backdrop ${mobileOpen ? "is-open" : ""}`}
        aria-label="Fermer le menu"
        onClick={() => window.dispatchEvent(new Event("chadia:sidebar-close"))}
      />
    <aside className={`sidebar ${c ? "is-collapsed" : ""} ${mobileOpen ? "is-mobile-open" : ""}`} data-collapsed={c}>
      <div className="sidebar-header">
        <span className="brand-mark" aria-hidden="true">C</span>
        {c ? null : (
          <div className="brand-block">
            <div className="brand-name">CHADIA</div>
            <div className="brand-org">Projects</div>
          </div>
        )}
        <button
          type="button"
          onClick={toggle}
          className="sb-toggle"
          aria-label={c ? "Déplier la sidebar" : "Replier la sidebar"}
          title={c ? "Déplier (⌘ + \\)" : "Replier (⌘ + \\)"}
        >
          <i className={`ph ${c ? "ph-sidebar-simple" : "ph-sidebar"}`} aria-hidden="true"></i>
        </button>
      </div>

      <div className="sidebar-section">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${isActive(item.href) ? "active" : ""}`}
            title={c ? item.label : undefined}
          >
            <i className={`ph ${item.icon} nav-icon`} aria-hidden="true"></i>
            {c ? null : <span>{item.label}</span>}
          </Link>
        ))}
      </div>

      <div className="sidebar-section" style={{ marginTop: "auto" }}>
        {c ? null : <div className="sidebar-section-title">Espace de travail</div>}
        {workspaceItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${isActive(item.href) ? "active" : ""}`}
            title={c ? item.label : undefined}
          >
            <i className={`ph ${item.icon} nav-icon`} aria-hidden="true"></i>
            {c ? null : <span>{item.label}</span>}
          </Link>
        ))}
      </div>

      <div className="sidebar-footer">
        <div className="user-chip" role="button" tabIndex={0} title={c ? `${userName} · ${ROLE_LABELS[userRole] ?? userRole}` : undefined}>
          <div className="avatar avatar--sm avatar--terracotta">{initials}</div>
          {c ? null : (
            <>
              <div className="meta">
                <div className="name">{userName}</div>
                <div className="role">{ROLE_LABELS[userRole] ?? userRole}</div>
              </div>
              <i className="ph ph-caret-up-down" aria-hidden="true" style={{ color: "var(--color-mineral)", fontSize: 14 }}></i>
            </>
          )}
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="nav-item"
          style={{ marginTop: 4, fontSize: "var(--text-xs)", color: "var(--color-stone)", width: "100%" }}
          title={c ? "Déconnexion" : undefined}
        >
          <i className="ph ph-sign-out nav-icon" aria-hidden="true"></i>
          {c ? null : <span>Déconnexion</span>}
        </button>
      </div>
    </aside>
    </>
  );
}
