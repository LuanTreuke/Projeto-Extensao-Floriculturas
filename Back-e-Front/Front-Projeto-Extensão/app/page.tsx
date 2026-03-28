"use client"
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { getCurrentUser, logout } from '../services/authService';
import { useRouter } from 'next/navigation';
import styles from '../styles/HomePage.module.css';
import SearchBar from '../components/SearchBar';
import CategoryFilter from '../components/CategoryFilter';
import PriceRange from '../components/PriceRange';
import SortButtons from '../components/SortButtons';
import ProductCard from '../components/ProductCard';
import ProductPopup from '../components/ProductPopup';
import CartPopup from '../components/CartPopup';
import Breadcrumb from '../components/Breadcrumb';
import { getCart, subscribeCart } from '../services/cartService';
import { showConfirm } from '../utils/sweetAlert';
import 'bootstrap/dist/css/bootstrap.min.css';


import { fetchProducts, Product } from '../services/productService';
import api from '@/services/api';

// categorias serão carregadas do backend

export default function HomePage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState<[number, number]>([0, 99999]);
  const [maxPrice, setMaxPrice] = useState<number>(99999);
  const [sort, setSort] = useState('new');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [showPopup, setShowPopup] = useState(false);
  
  const [showCartPopup, setShowCartPopup] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [showProductPopup, setShowProductPopup] = useState(false);
  const [activeProductId, setActiveProductId] = useState<number | null>(null);
  const [hasOrdersNotify, setHasOrdersNotify] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const usuario = getCurrentUser();
      setIsLoggedIn(!!usuario);
      setIsAdmin(!!(usuario && (usuario.role === 'Admin' || usuario.cargo === 'Admin')));
      try {
        if (usuario && typeof usuario.id === 'number') {
          const v = localStorage.getItem(`orders_notify_user_${usuario.id}`);
          setHasOrdersNotify(v === '1');
        } else {
          setHasOrdersNotify(false);
        }
      } catch {}
    }
    // initialize cart count and subscribe
    try {
      setCartCount(getCart().reduce((s, i) => s + (i.quantidade || 0), 0));
      const unsub = subscribeCart((items) => setCartCount(items.reduce((s, i) => s + (i.quantidade || 0), 0)));
      return () => unsub();
    } catch {}
    function onOrdersUpdated() {
      try {
        const u = getCurrentUser();
        const uid = (u && typeof u.id === 'number') ? u.id : null;
        if (uid != null) {
          const v = localStorage.getItem(`orders_notify_user_${uid}`);
          setHasOrdersNotify(v === '1');
        } else {
          setHasOrdersNotify(false);
        }
      } catch {}
    }
    window.addEventListener('orders-updated', onOrdersUpdated as any);
    window.addEventListener('storage', onOrdersUpdated as any);
    return () => {
      window.removeEventListener('orders-updated', onOrdersUpdated as any);
      window.removeEventListener('storage', onOrdersUpdated as any);
    };
  }, []);

  // Fecha o popup ao clicar fora
  useEffect(() => {
    if (!showPopup) return;
    function handleClick(e: MouseEvent) {
      const popup = document.getElementById('login-popup');
      if (popup && !popup.contains(e.target as Node)) {
        setShowPopup(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showPopup]);

// carregando produtos
  useEffect(() => {
    fetchProducts()
      .then(data => {
        setProducts(data);
        try {
          const computedMax = Math.max(
            0,
            ...data.map((p) => Number((p as any)?.preco) || 0)
          );
          const normalized = Number.isFinite(computedMax) && computedMax > 0 ? Math.ceil(computedMax) : 99999;
          setMaxPrice(normalized);
          setPrice(() => [0, normalized]);
        } catch {}
        setLoading(false);
      })
      .catch(() => {
        setError('Erro ao carregar produtos');
        setLoading(false);
      });

    // buscar categorias do backend
    (async () => {
      try {
        const res = await api.get('/categorias');
        const cats = res.data as Array<{ id: number; nome: string }>;
        // prepend 'Todas' option
        setCategories(['Todas', ...cats.map(c => c.nome)]);
        const map: Record<string, number> = {};
        cats.forEach(c => (map[c.nome] = c.id));
        setCategoryMap(map);
      } catch {
        // fallback estático
        const fallback = ['Buquês', 'Arranjos', 'Flores', 'Cestas'];
        setCategories(['Todas', ...fallback]);
        setCategoryMap({ 'Buquês': 1, 'Arranjos': 2, 'Flores': 3, 'Cestas': 4 });
      }
    })();
  }, []);

  const [categories, setCategories] = useState<string[]>([]);
  const [categoryMap, setCategoryMap] = useState<Record<string, number>>({});

  function removeAccents(str: string) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  const safeProducts = Array.isArray(products) ? products : [];
  let filtered = safeProducts.filter((p: Product) => {
    // treat as visible unless explicitly disabled; null/undefined => visible
    const isVisible = p.enabled !== false;
    const nomeNormalized = removeAccents(p.nome.toLowerCase());
    const searchNormalized = removeAccents(search.toLowerCase());
    return (
      isVisible &&
      nomeNormalized.includes(searchNormalized) &&
  ((category === '' || category === 'Todas') ? true : (p.categoria ? p.categoria.id === categoryMap[category] : p.Categoria_id === categoryMap[category])) &&
      p.preco >= price[0] && p.preco <= price[1]
    );
  });
  if (sort === 'new') filtered = filtered.sort((a: Product, b: Product) => b.id - a.id);
  if (sort === 'asc') filtered = filtered.sort((a: Product, b: Product) => a.preco - b.preco);
  if (sort === 'desc') filtered = filtered.sort((a: Product, b: Product) => b.preco - a.preco);

  const router = useRouter();
  return (
    <div>
      <div className={styles.container}>
        <Breadcrumb items={[
          { label: 'Página Inicial' }
        ]} />
        
        <header className={styles.header}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', position: 'relative' }}>
            <button className={styles.shoppingCart} onClick={() => setShowCartPopup(true)}>
              <span className="material-icons" style={{ verticalAlign: 'middle', fontSize: 22}}>shopping_cart</span>
              {cartCount > 0 && (
                <span className={styles.cartBadge}>{cartCount}</span>
              )}
            </button>
            <button 
              className={styles.loginBtn}
              onClick={() => {
                if (isLoggedIn) setShowPopup((v) => !v);
                else router.push('/login');
              }}
            >
              {isLoggedIn ? (
                <span className="material-icons" style={{ verticalAlign: 'middle', fontSize: 22, marginRight: 0 }}>account_circle</span>
              ) : null}
              {isLoggedIn ? '' : 'Login'}
              {isLoggedIn && hasOrdersNotify ? (
                <span className={styles.notificationBadge}>!</span>
              ) : null}
            </button>
            {isLoggedIn && showPopup && (
              <div id="login-popup" className={styles.loginPopup}>
                <button
                  className={styles.loginPopupBtn}
                  onClick={() => { setShowPopup(false); router.push('/minha-conta'); }}
                >
                  Minha conta
                </button>
                <button
                  className={styles.loginPopupBtn}
                  onClick={() => {
                    setShowPopup(false);
                    try {
                      const u = getCurrentUser();
                      if (u && typeof u.id === 'number') {
                        localStorage.removeItem(`orders_notify_user_${u.id}`);
                        window.dispatchEvent(new Event('orders-updated'));
                      }
                    } catch {}
                    router.push('/meus-pedidos');
                  }}
                >
                  Meus pedidos {hasOrdersNotify ? <span style={{ marginLeft: 6, background: '#e53935', color: '#fff', borderRadius: 999, padding: '0 6px', fontSize: 12, fontWeight: 700 }}>!</span> : null}
                </button>
                {isAdmin && (
                  <button
                    className={styles.loginPopupBtn}
                    onClick={() => {
                      setShowPopup(false);
                      router.push('/admin/pedidos');
                    }}
                  >
                    Painel administrativo
                  </button>
                )}
                <button
                  className={styles.loginPopupBtn}
                  onClick={async () => {
                    // Fechar o popup antes de mostrar a confirmação
                    setShowPopup(false);
                    
                    // desloga: remove o usuário armazenado e atualiza a interface
                    const confirmado = await showConfirm(
                      'Deseja realmente sair?',
                      'Você será desconectado da sua conta.',
                      'Sim, sair',
                      'Cancelar'
                    );
                    if (confirmado) {
                      logout();
                      setIsLoggedIn(false);
                      router.push('/');
                    }
                  }}
                >
                  Sair
                </button>
              </div>
            )}
            {showCartPopup && (
              <CartPopup onClose={() => setShowCartPopup(false)} />
            )}
          </div>
        </header>

        <div className={styles.searchBar}>
          <SearchBar value={search} onChange={setSearch} placeholder="Encontre seu produto" />
        </div>

        <div className={styles.filters}>
          {categories.length > 0 ? (
            <CategoryFilter categories={categories} selected={category} onSelect={setCategory} />
          ) : (
            <div style={{ padding: '8px 12px', color: '#666' }}>Carregando categorias...</div>
          )}
          <PriceRange min={0} max={maxPrice} value={price} onChange={setPrice} />
        </div>

        <div className={styles.sectionTitle}>Nossos produtos</div>
        <SortButtons selected={sort} onSelect={setSort} />


        <div className={styles.productsGrid}>
          {loading && <span>Carregando produtos...</span>}
          {error && <span style={{ color: 'red' }}>{error}</span>}
          {!loading && !error && filtered.map((p) => (
            <ProductCard
              key={p.id}
              id={p.id}
              name={p.nome}
              price={`R$${Number(p.preco).toFixed(2)}`}
              image={p.imagem_url ? p.imagem_url.split(',')[0].trim() : ''}
              onClick={() => { setActiveProductId(p.id); setShowProductPopup(true); }}
            />
          ))}
        </div>

        
      </div>

      {showProductPopup && activeProductId !== null && (
        <ProductPopup
          productId={activeProductId}
          onClose={() => setShowProductPopup(false)}
        />
      )}

  <footer className={styles.footerSection}>
        <div className={styles.footerContent}>
          <div className={styles.footerCol}>
            <span className={styles.footerTitle}>Redes Sociais</span>
            <a href="https://www.instagram.com/floricultura4estacoes_/" target="_blank" rel="noopener noreferrer">Instagram</a>
          </div>
          <div className={styles.footerCol}>
            <span className={styles.footerTitle}>Informações</span>
            <a href="/termos-de-servico">Termos de Serviço</a>
          </div>
        </div>
        <div className={styles.footerAddress}>
          Avenida Paula Freitas 1006 – Nossa senhora da Salete
        </div>
      </footer>
    </div>
  );
}
