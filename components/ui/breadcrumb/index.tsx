"use client";

import React from "react";
import { Link } from "@/i18n/routing";
import styles from "./breadcrumb.module.scss";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

/**
 * Breadcrumb navigation for nested pages.
 * Last item is rendered as plain text (current page).
 */
export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => {
  if (items.length <= 1) return null;

  return (
    <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
      <ol className={styles.list}>
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={item.label} className={styles.item}>
              {!isLast && item.href ? (
                <>
                  <Link href={item.href} className={styles.link}>
                    {item.label}
                  </Link>
                  <span className={styles.separator} aria-hidden="true">/</span>
                </>
              ) : (
                <span className={styles.current} aria-current="page">
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumb;
