"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const navItems = [
  { label: "Tableau de bord", href: "/", icon: (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  )},
  { label: "Projets", href: "/projets", icon: (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
    </svg>
  )},
  { label: "Templates", href: "/templates", icon: (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  )},
];

interface SidebarProps { userName: string; userRole: string; }

export function Sidebar({ userName, userRole }: SidebarProps) {
  const pathname = usePathname();
  const roleLabels: Record<string, string> = { DIRECTEUR: "Directeur", ADMIN: "Administrateur", FINANCIER: "Financier", MEMBRE: "Membre" };
  const initials = userName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <aside className="w-[240px] bg-white border-r border-[#e2e8f0] flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#e2e8f0]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded flex items-center justify-center text-white text-[10px] font-bold"
            style={{ background: "#0468b1" }}>
            CP
          </div>
          <div>
            <p className="text-[13px] font-bold text-[#1a365d] leading-tight">CHADIA Projects</p>
            <p className="text-[10px] text-[#94a3b8]">Gestion de projets</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2">
        <p className="px-3 mb-2 text-[10px] font-bold text-[#94a3b8] uppercase tracking-[0.1em]">Navigation</p>
        {navItems.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded text-[13px] transition-colors mb-0.5 ${
                isActive ? "nav-active" : "text-[#64748b] hover:bg-[#f8fafc] hover:text-[#1e293b]"
              }`}>
              <span className={isActive ? "text-[#0468b1]" : "text-[#94a3b8]"}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-3 pb-3 border-t border-[#e2e8f0] pt-3">
        <div className="flex items-center gap-2.5 px-2 mb-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold" style={{ background: "#0468b1" }}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-[#1e293b] truncate">{userName}</p>
            <p className="text-[10px] text-[#94a3b8]">{roleLabels[userRole] ?? userRole}</p>
          </div>
        </div>
        <button onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full px-3 py-1.5 text-[11px] text-[#94a3b8] border border-[#e2e8f0] rounded hover:bg-[#f8fafc] hover:text-[#64748b] transition-colors">
          Deconnexion
        </button>
      </div>
    </aside>
  );
}
