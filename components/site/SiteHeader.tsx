"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";

const navigation = [
  { label: "Shop", href: "/shop" },
  { label: "Pokopia", href: "/collections/pokopia" },
  { label: "Cozy Games", href: "/collections/cozy-games" },
  { label: "TCG", href: "/collections/tcg" },
  { label: "RPG + Completion", href: "/collections/rpg-completion" },
  { label: "Bundles", href: "/bundles" },
];

export function SiteHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const pageNavigation = pathname === "/pokopia" ? [
    { label: "Pokopia Tools", href: "#pokopia-products" },
    { label: "Free Starter Kit", href: "#pokopia-starter" },
    { label: "Complete Companion", href: "#pokopia-systems" },
    { label: "How It Works", href: "#pokopia-assessment" },
  ] : navigation;

  return (
    <header className="site-header">
      <div className="site-container site-header__inner">
        <Link className="wordmark" href="/" aria-label="Sugarfield Studio home">
          <span className="wordmark__mark" aria-hidden="true">S</span>
          <span>Sugarfield <em>Studio</em></span>
        </Link>

        <nav className="desktop-nav" aria-label="Primary navigation">
          {pageNavigation.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
        </nav>

        <div className="site-header__actions">
          <Link className="library-link" href="/library">My Library</Link>
          <Link className="header-cta" href={pathname === "/pokopia" ? "#pokopia-goals" : "/shop"}>{pathname === "/pokopia" ? "Find my tools" : "Shop all products"}</Link>
          <button
            className="menu-toggle"
            type="button"
            aria-expanded={isMenuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            <span className="sr-only">{isMenuOpen ? "Close" : "Open"} menu</span>
            <span aria-hidden="true">{isMenuOpen ? "×" : "☰"}</span>
          </button>
        </div>
      </div>

      <nav id="mobile-navigation" className={`mobile-nav ${isMenuOpen ? "mobile-nav--open" : ""}`} aria-label="Mobile navigation">
        {pageNavigation.map((item) => (
          <Link key={item.href} href={item.href} onClick={() => setIsMenuOpen(false)}>{item.label}</Link>
        ))}
        <Link href="/library" onClick={() => setIsMenuOpen(false)}>My Library</Link>
        <Link className="action-link action-link--primary" href={pathname === "/pokopia" ? "#pokopia-goals" : "/shop"} onClick={() => setIsMenuOpen(false)}>{pathname === "/pokopia" ? "Find my tools" : "Shop all products"}</Link>
      </nav>
    </header>
  );
}
