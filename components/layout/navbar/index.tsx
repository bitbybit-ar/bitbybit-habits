"use client";

import React, { useEffect, useState } from "react";
import styles from "./navbar.module.scss";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "#how-it-works", label: "How It Works" },
  { href: "#use-cases", label: "Use Cases" },
  { href: "#why-lightning", label: "Why Lightning" },
  { href: "#tech-stack", label: "Tech Stack" },
  { href: "#roadmap", label: "Roadmap" },
];

export const Navbar: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hero = document.querySelector("[data-hero]");
    if (!hero) return;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0.1 },
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  return (
    <nav
      className={cn(styles.navbar, visible && styles.visible)}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className={styles.container}>
        <a href="#" className={styles.brand} aria-label="BitByBit home">
          ⚡ BitByBit
        </a>
        <ul className={styles.links}>
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <a href={link.href}>{link.label}</a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
