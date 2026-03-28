"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import styles from '../styles/Breadcrumb.module.css';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  const router = useRouter();

  return (
    <nav className={styles.breadcrumb} aria-label="Breadcrumb">
      <ol className={styles.list}>
        {items.map((item, index) => (
          <li key={index} className={styles.item}>
            {item.href ? (
              <>
                <button
                  onClick={() => router.push(item.href!)}
                  className={styles.link}
                >
                  {item.label}
                </button>
                {index < items.length - 1 && (
                  <span className={styles.separator}>/</span>
                )}
              </>
            ) : (
              <span className={styles.current}>{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
