"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Notre mission", exact: true },
  { href: "/marches", label: "Marchés publiés" },
  { href: "/resultats", label: "Résultats" },
  { href: "/rapports", label: "Rapports financiers" },
  { href: "/gouvernance", label: "Gouvernance" },
  { href: "/contact", label: "Contact" },
];

export function PublicNav() {
  const pathname = usePathname() ?? "";
  return (
    <nav className="main-nav">
      {NAV.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={active ? "on" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
