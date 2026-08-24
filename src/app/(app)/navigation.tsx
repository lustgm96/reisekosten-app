"use client";

import type { Role } from "@prisma/client";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavigationProps = {
  role: Role;
};

const isActive = (pathname: string, href: string) =>
  href === "/" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

export function Navigation({ role }: NavigationProps) {
  const pathname = usePathname();
  const items = [
    { href: "/", label: "Dashboard" },
    { href: "/reports/new", label: "Neue Abrechnung" },
    { href: "/card-statements", label: "Kartenabrechnung" },
    { href: "/allowances", label: "Pauschalen" },
    { href: "/archive", label: "Archiv" },
    { href: "/profile", label: "Mein Profil" },
    ...(role !== "EMPLOYEE" ? [{ href: "/review", label: "Prüfung" }] : []),
    ...(role === "ADMIN"
      ? [
          { href: "/users", label: "Benutzer" },
          { href: "/settings", label: "Einstellungen" }
        ]
      : [])
  ];

  return (
    <nav aria-label="Hauptnavigation" className="nav">
      {items.map(item => (
        <Link
          aria-current={isActive(pathname, item.href) ? "page" : undefined}
          className={isActive(pathname, item.href) ? "active" : undefined}
          href={item.href}
          key={item.href}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
