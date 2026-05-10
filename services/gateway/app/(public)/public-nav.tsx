"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/mission", label: "Notre mission" },
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
      {NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={pathname.startsWith(item.href) ? "on" : undefined}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
