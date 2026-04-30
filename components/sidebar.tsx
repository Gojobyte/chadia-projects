"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const navItems = [
  { label: "Dashboard", href: "/", icon: (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  )},
  { label: "Projets", href: "/projets", icon: (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
    </svg>
  )},
  { label: "Templates", href: "/templates", icon: (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  )},
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
  const initials = userName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <aside className="w-[260px] flex flex-col" style={{ background: "linear-gradient(180deg, #0e1225 0%, #0a0d1a 100%)" }}>
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
            style={{ background: "linear-gradient(135deg, #818cf8, #f59e0b)" }}>
            CP
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-wide text-white/90">CHADIA</h1>
            <p className="text-[10px] text-white/30 tracking-widest uppercase">Projects</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <p className="px-3 mb-2 text-[10px] font-medium text-white/20 uppercase tracking-[0.15em]">Menu</p>
        {navItems.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] transition-all duration-200 ${
                isActive
                  ? "nav-active text-white font-medium"
                  : "text-white/40 hover:text-white/70 hover:bg-white/[0.03]"
              }`}>
              <span className={isActive ? "text-indigo-400" : "text-white/30"}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-3 pb-4">
        <div className="glass rounded-xl p-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white/90"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white/80 truncate">{userName}</p>
              <p className="text-[10px] text-white/30">{roleLabels[userRole] ?? userRole}</p>
            </div>
          </div>
          <button onClick={() => signOut({ callbackUrl: "/login" })}
            className="mt-3 w-full px-3 py-1.5 text-[11px] text-white/30 border border-white/[0.06] rounded-lg hover:bg-white/[0.04] hover:text-white/50 transition-all">
            Deconnexion
          </button>
        </div>
      </div>
    </aside>
  );
}
