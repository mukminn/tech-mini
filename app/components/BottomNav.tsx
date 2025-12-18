"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./BottomNav.module.css";

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { path: "/", label: "Home", icon: "🏠" },
    { path: "/badges", label: "Badges", icon: "🏆" },
    { path: "/activity", label: "Activity", icon: "📋" },
  ];

  return (
    <nav className={styles.bottomNav} role="navigation" aria-label="Main navigation">
      {navItems.map((item) => {
        const isActive = pathname === item.path;
        return (
          <Link
            key={item.path}
            href={item.path}
            className={`${styles.navItem} ${isActive ? styles.active : ""}`}
            aria-current={isActive ? "page" : undefined}
          >
            <span className={styles.navIcon}>{item.icon}</span>
            <span className={styles.navLabel}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
