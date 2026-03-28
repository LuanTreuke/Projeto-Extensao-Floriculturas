"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../../styles/Login.module.css';
import { login, getCurrentUser } from '../../services/authService';
import { getCartFromServer } from '../../services/cartService';
import { fetchOrders } from '../../services/orderService';
import BackButton from '../../components/BackButton';
// using shared api via services/api.ts (login uses authService)

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const res = await login(email, senha);
    const data = (res && typeof res === 'object') ? res as Record<string, unknown> : null;
    const success = Boolean(data && data['success']);
    if (!success) {
      setError(String(data?.['message'] ?? 'Erro ao fazer login'));
      return;
    }
    // Persistir usuário no localStorage para uso em pedidos
    try {
      // O backend retorna `usuario` (Português) ou `user`. Normalize safely without `any`.
      const uCandidate = data ? (data['usuario'] ?? data['user'] ?? data) : null;
      const uObj = (uCandidate && typeof uCandidate === 'object') ? uCandidate as Record<string, unknown> : null;
      if (uObj) {
        localStorage.setItem('usuario', JSON.stringify(uObj));
      }
    } catch (err) {
      console.warn('Não foi possível salvar usuário no localStorage', err);
    }
    // Refresh server-backed cart into local cache and remove any guest key
    // so the visible cart is the server cart tied to the authenticated user.
      try {
        try {
          await getCartFromServer();
        } catch (e) { console.warn('refresh server cart failed', e); }
        try { localStorage.removeItem('floricultura_cart_v1'); } catch {}
        try { window.dispatchEvent(new Event('cart-updated')); } catch {}
      } catch (e) { console.warn('post-login cart refresh failed', e); }

    // Redirecionar para a home ou dashboard
    try {
      // ligar badge simples pós-login se houver pedidos em aberto
      const u = getCurrentUser();
      const uid = (u && typeof u.id === 'number') ? u.id : null;
      if (uid != null && typeof window !== 'undefined') {
        try {
          const orders = await fetchOrders();
          const hasActive = Array.isArray(orders) && orders.some((o: any) => {
            const s = String(o?.status ?? '').toLowerCase();
            return !(s === 'entregue' || s === 'cancelado');
          });
          if (hasActive) localStorage.setItem(`orders_notify_user_${uid}`, '1');
          else localStorage.removeItem(`orders_notify_user_${uid}`);
          window.dispatchEvent(new Event('orders-updated'));
        } catch {}
      }
    } finally {
      router.push('/');
    }
  }

  return (
    <div className={styles.container}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <BackButton />
        <h2>Login</h2>
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
        <input type="password" placeholder="Senha" value={senha} onChange={e => setSenha(e.target.value)} required />
        {error && <span className={styles.error}>{error}</span>}
        <button type="submit">Entrar</button>
        <label htmlFor="Cadastre-se" style={{textAlign:"center"}}>Não possui uma conta?</label>
        <span className={styles.link} onClick={() => router.push('/cadastro')}>Cadastre-se</span>
      </form>
    </div>
  );
}
