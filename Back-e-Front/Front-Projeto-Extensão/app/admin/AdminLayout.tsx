"use client";
import React, { useEffect, useState } from 'react';
import { getCurrentUser } from '../../services/authService';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Offcanvas } from 'react-bootstrap';
import styles from '../../styles/AdminLayout.module.css';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (!pathname) return false;
    // manter ativo também para subrotas (ex.: /admin/pedidos/123)
    return pathname === href || pathname.startsWith(href + '/');
  };

  // Persistir estado do sidebar entre navegações/refresh
  useEffect(() => {
    try {
      const saved = localStorage.getItem('admin_sidebar_open');
      if (saved === '1') setShow(true);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('admin_sidebar_open', show ? '1' : '0');
    } catch {}
  }, [show]);

  useEffect(() => {
    try {
      // runtime check: only allow users with role 'Admin' (or legacy 'cargo') to view admin pages
      const u = getCurrentUser();
      if (!u || !(u.role === 'Admin' || u.cargo === 'Admin')) {
        router.push('/');
      }
    } catch {
      router.push('/');
    }
  }, [router]);

  // bloquear scroll do body quando o sidebar estiver aberto
  useEffect(() => {
    if (!show) return;
    const scrollY = window.scrollY || window.pageYOffset || 0;
    const prev = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      left: document.body.style.left,
      right: document.body.style.right,
    } as const;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';

    return () => {
      document.body.style.overflow = prev.overflow;
      document.body.style.position = prev.position;
      document.body.style.top = prev.top;
      document.body.style.left = prev.left;
      document.body.style.right = prev.right;
      window.scrollTo(0, scrollY);
    };
  }, [show]);

  return (
    <div className={styles.adminContainer}>
      {/* Toggle button for Offcanvas */}
      {/* Hamburger toggle (hidden while Offcanvas is open) */}
      {!show && (
        <div style={{ position: 'fixed', top: 12, left: 12, zIndex: 1100 }}>
          <button
            className={styles.hamburgerBtn}
            aria-label="Abrir painel"
            onClick={() => setShow(true)}
            type="button"
          >
            {/* simple 3-bar icon */}
            <svg width="20" height="14" viewBox="0 0 20 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <rect y="0" width="20" height="2" rx="1" fill="currentColor" />
              <rect y="6" width="20" height="2" rx="1" fill="currentColor" />
              <rect y="12" width="20" height="2" rx="1" fill="currentColor" />
            </svg>
          </button>
        </div>
      )}

      <Offcanvas show={show} onHide={() => setShow(false)} placement="start">
        <Offcanvas.Header closeButton>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <Offcanvas.Title style={{ margin: 0 }}>Painel Administrativo</Offcanvas.Title>
          </div>
        </Offcanvas.Header>
        <Offcanvas.Body style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <ul className={styles.adminNavList} style={{ flex: 1 }}>
            <li className={styles.adminNavItem}>
              <Link
                href="/admin/pedidos"
                className={`${styles.adminNavBtn} ${isActive('/admin/pedidos') ? styles.adminNavBtnActive : ''}`}
                aria-current={isActive('/admin/pedidos') ? 'page' : undefined}
                onClick={() => setShow(false)}
              >
                <i className="bi bi-truck" aria-hidden></i> {' '}Gerenciar pedidos
              </Link>
            </li>
            <li className={styles.adminNavItem}>
              <Link
                href="/admin/catalogo"
                className={`${styles.adminNavBtn} ${isActive('/admin/catalogo') ? styles.adminNavBtnActive : ''}`}
                aria-current={isActive('/admin/catalogo') ? 'page' : undefined}
                onClick={() => setShow(false)}
              >
                <i className="bi bi-flower3" aria-hidden></i> {' '}Gerenciar catálogo
              </Link>
            </li>
            <li className={styles.adminNavItem}>
              <Link
                href="/admin/categorias"
                className={`${styles.adminNavBtn} ${isActive('/admin/categorias') ? styles.adminNavBtnActive : ''}`}
                aria-current={isActive('/admin/categorias') ? 'page' : undefined}
                onClick={() => setShow(false)}
              >
                <i className="bi bi-tag" aria-hidden></i> {' '}Gerenciar categorias
              </Link>
            </li>
            <li className={styles.adminNavItem}>
              <Link
                href="/admin/relatorios"
                className={`${styles.adminNavBtn} ${isActive('/admin/relatorios') ? styles.adminNavBtnActive : ''}`}
                aria-current={isActive('/admin/relatorios') ? 'page' : undefined}
                onClick={() => setShow(false)}
              >
                <i className="bi bi-file-bar-graph" aria-hidden></i> {' '}Gerar relatórios
              </Link>
            </li>
          </ul>
          <div style={{ marginTop: 'auto', padding: '8px 0', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
            <Link href="/" className={styles.adminNavBtn} onClick={() => setShow(false)}>
              <i className="bi bi-grid" aria-hidden></i> {' '}Catálogo
            </Link>
          </div>
        </Offcanvas.Body>
      </Offcanvas>

      <main className={styles.adminMain}>{children}</main>
    </div>
  );
}
