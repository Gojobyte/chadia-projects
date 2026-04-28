"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const navItems = [
  { label: "Dashboard", href: "/", icon: "📊" },
  { label: "Projets", href: "/projets", icon: "📁" },
  { label: "Templates", href: "/templates", icon: "📝" },
];

interface SidebarProps {
  userName: string;
  userRole: string;
}

export function Sidebar({ userName, userRole }: SidebarProps) {
  const pathname = usePathname();
  const roleLabels: Record<string, string> = {
    DIRECTEUR: "Directeur", ADMIN: "Admin", FINANCIER: "Financier", MEMBRE: "Membre",
  };

  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen flex flex-col">
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-lg font-bold">CHADIA Projects</h1>
        <p className="text-xs text-slate-400 mt-1">Montage de projets</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive ? "bg-indigo-600 text-white font-medium" : "text-slate-300 hover:bg-slate-800"
              }`}>
              <span>{item.icon}</span>{item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-700">
        <div className="mb-3">
          <p className="text-sm font-medium">{userName}</p>
          <p className="text-xs text-slate-400">{roleLabels[userRole] ?? userRole}</p>
        </div>
        <button onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full px-3 py-2 text-xs text-slate-400 border border-slate-600 rounded-lg hover:bg-slate-800 transition-colors">
          Deconnexion
        </button>
      </div>
    </aside>
  );
}
