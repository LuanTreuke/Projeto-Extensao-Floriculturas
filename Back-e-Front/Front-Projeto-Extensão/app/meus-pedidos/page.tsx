"use client";
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { fetchOrders, updateOrderStatus } from '../../services/orderService';
import { getCurrentUser, User } from '../../services/authService';
import { fetchProductById } from '../../services/productService';
import styles from '../../styles/OrderDetails.module.css';
import BackButton from '../../components/BackButton';
import Breadcrumb from '../../components/Breadcrumb';
import SmartImage from '../../components/SmartImage';
import { showCancelConfirm, showError, showToast } from '../../utils/sweetAlert';

export default function MeusPedidosPage() {
  const router = useRouter();
  type AnyObj = Record<string, unknown>;
  type Order = AnyObj & {
    id?: number;
    _images?: string[];
    _imageIndex?: number;
    _productNames?: string[];
    _cart?: AnyObj[];
    data_pedido?: string;
    data_entrega?: string;
    hora_pedido?: string;
    hora_entrega?: string;
    status?: string;
    Usuario_id?: number;
    usuario?: AnyObj | null;
  };
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  // Tenta extrair um 'cart' do campo observacao (retorna array ou null)
  const extractCart = useCallback((obs: unknown): AnyObj[] | null => {
    if (!obs) return null;
    try {
      const parsed = typeof obs === 'string' ? JSON.parse(obs) as unknown : obs;
      if (parsed && typeof parsed === 'object') {
        const obj = parsed as Record<string, unknown>;
        if (Array.isArray(obj['cart'])) return obj['cart'] as AnyObj[];
      }
      if (Array.isArray(parsed)) return parsed as AnyObj[];
      return null;
    } catch {
      return null;
    }
  }, []);

  // retorna um objeto Date para ordenação, preferindo data_pedido+hora_pedido,
  // caindo para data_entrega/hora_entrega e, se ausente, retorna epoch 0
  const parseOrderDateTime = useCallback((o: Order) => {
    const date = (o.data_pedido as string | undefined) || (o.data_entrega as string | undefined) || null;
    const time = (o.hora_pedido as string | undefined) || (o.hora_entrega as string | undefined) || '00:00:00';
    if (!date) return new Date(0);
    // normaliza hora caso seja 'HH:mm'
    let t = time;
    if (t && t.length === 5) t = t + ':00';
    // cria ISO-like string para Date parsing
    try {
      return new Date(`${date}T${t}`);
    } catch {
      return new Date(0);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const usuario: User | null = getCurrentUser();
      const uid = typeof usuario?.id === 'number' ? usuario?.id : undefined;
      if (!usuario || !uid) {
        // redireciona para login se não estiver autenticado
        router.push('/login');
        return;
      }
      // limpar badge ao entrar na tela
      try {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(`orders_notify_user_${uid}`);
          window.dispatchEvent(new Event('orders-updated'));
        }
      } catch {}

      try {
        // fetchOrders() para não-Admin já retorna apenas os pedidos do usuário via /pedidos/usuario/:id
        const all = await fetchOrders() as Order[];

        // enriquecer com imagens/nomes preferindo dados embutidos em observacao
        const enriched = await Promise.all((all || []).map(async (p: Order) => {
          const cart = extractCart(p['carrinho'] ?? p['observacao']) || [];
          const imgsFromItems = (cart || [])
            .map((it: AnyObj) => {
              const url = it && (it['imagem_url'] as string);
              return url ? url.split(',')[0].trim() : '';
            })
            .filter((v) => Boolean(v) && typeof v === 'string' && v.trim() !== '') as string[];
          const namesFromItems = (cart || [])
            .map((it: AnyObj) => it && (it['nome'] as string))
            .filter((v) => Boolean(v) && typeof v === 'string' && v.trim() !== '') as string[];
          const ids = (cart || [])
            .map((it: AnyObj) => it && (it['id'] as number))
            .filter((id) => Boolean(id) && typeof id === 'number') as number[];

          if (imgsFromItems.length > 0) return { ...p, _images: imgsFromItems, _imageIndex: 0, _productNames: namesFromItems, _cart: cart };
          if (ids.length === 0) return { ...p, _images: [], _imageIndex: 0, _productNames: [], _cart: cart };
          try {
            const proms = ids.map((id: number) => fetchProductById(id));
            const prods = await Promise.all(proms);
            const imgs = prods
              .map(pr => {
                const url = pr?.imagem_url ?? '';
                return url ? url.split(',')[0].trim() : '';
              })
              .filter((v) => Boolean(v) && typeof v === 'string' && v.trim() !== '') as string[];
            const names = prods
              .map(pr => pr?.nome ?? '')
              .filter((v) => Boolean(v) && typeof v === 'string' && v.trim() !== '') as string[];
            return { ...p, _images: imgs, _imageIndex: 0, _productNames: names, _cart: cart } as Order;
          } catch {
            return { ...p, _images: [], _imageIndex: 0, _productNames: [], _cart: cart } as Order;
          }
        }));

        // ordenar do mais recente para o mais antigo
        enriched.sort((a: Order, b: Order) => {
          const ta = parseOrderDateTime(a).getTime();
          const tb = parseOrderDateTime(b).getTime();
          return tb - ta;
        });
        setOrders(enriched);
      } catch (err) {
        console.error('Falha ao carregar pedidos', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [router, extractCart, parseOrderDateTime]);


  async function handleCancel(id: number) {
    const confirmed = await showCancelConfirm(
      'Deseja cancelar este pedido?',
      'Esta ação não poderá ser desfeita.'
    );
    if (!confirmed) return;
    try {
      // atualiza status para 'Cancelado' (backend aceita string)
      await updateOrderStatus(id, 'Cancelado');
      setOrders(curr => curr.map(o => o.id === id ? { ...o, status: 'Cancelado' } : o));
      showToast('Pedido cancelado com sucesso', 'success');
    } catch (e) {
      console.error(e);
      showError('Erro ao cancelar pedido');
    }
  }

  function prevImage(orderId: number) {
    setOrders(curr => curr.map(o => {
      if (o.id !== orderId) return o;
      const imgs = o._images as unknown;
      const len = Array.isArray(imgs) ? (imgs as unknown[]).length : 0;
      if (len <= 1) return o;
      const idx = typeof o._imageIndex === 'number' ? o._imageIndex as number : 0;
      // não faz loop: se está no primeiro, permanece no primeiro
      const newIdx = idx > 0 ? idx - 1 : 0;
      return { ...o, _imageIndex: newIdx };
    }));
  }

  function nextImage(orderId: number) {
    setOrders(curr => curr.map(o => {
      if (o.id !== orderId) return o;
      const imgs = o._images as unknown;
      const len = Array.isArray(imgs) ? (imgs as unknown[]).length : 0;
      if (len <= 1) return o;
      const idx = typeof o._imageIndex === 'number' ? o._imageIndex as number : 0;
      // não faz loop: se está no último, permanece no último
      const newIdx = idx < len - 1 ? idx + 1 : len - 1;
      return { ...o, _imageIndex: newIdx };
    }));
  }

  if (loading) return <div className={styles.container}>Carregando seus pedidos...</div>;

  

  return (
    <div className={styles.container}>
      <BackButton />
      <Breadcrumb items={[
        { label: 'Página Inicial', href: '/' },
        { label: 'Meus Pedidos' }
      ]} />
      <h1 style={{ textAlign: 'center' }}>Meus Pedidos</h1>
      {orders.length === 0 ? (
        <div>Você não possui pedidos.</div>
      ) : (
        <div className={styles.grid}>
          {orders.map((o: Order) => (
            <div key={o.id as number} className={styles.card}>
              

              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 160, textAlign: 'center' }}>
                      {(o._images && (o._images as string[]).length > 0) ? (
                    <div style={{ position: 'relative' }}>
                      {o._images && (o._images as string[])[o._imageIndex || 0] ? (
                        <SmartImage src={String((o._images as string[])[o._imageIndex || 0])} alt={`Pedido ${String(o.id ?? '')}`} width={160} height={160} style={{ objectFit: 'cover', borderRadius: 8 }} />
                      ) : (
                        <div style={{ width: 160, height: 160, background: '#f3f3f3', borderRadius: 8 }} />
                      )}
                      {(o._images as string[]).length > 1 && (
                        <>
                          {/* Seta esquerda: só mostra se não estiver na primeira imagem */}
                          {(o._imageIndex || 0) > 0 && (
                            <button
                              onClick={() => (typeof o.id === 'number' ? prevImage(o.id as number) : undefined)}
                              style={{
                                position: 'absolute',
                                left: 4,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'rgba(0,0,0,0.6)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 4,
                                padding: '6px 8px',
                                cursor: 'pointer',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                transition: 'background 0.2s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.8)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.6)'}
                            >
                              {'<'}
                            </button>
                          )}
                          {/* Seta direita: só mostra se não estiver na última imagem */}
                          {(o._imageIndex || 0) < (o._images as string[]).length - 1 && (
                            <button
                              onClick={() => (typeof o.id === 'number' ? nextImage(o.id as number) : undefined)}
                              style={{
                                position: 'absolute',
                                right: 4,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'rgba(0,0,0,0.6)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 4,
                                padding: '6px 8px',
                                cursor: 'pointer',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                transition: 'background 0.2s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.8)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.6)'}
                            >
                              {'>'}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  ) : (
                    <div style={{ width: 160, height: 160, background: '#f3f3f3', borderRadius: 8 }} />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  {/* Stack all meta info vertically: Pedido, Status, Data, Produtos */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div><strong>Pedido #{o.id}</strong></div>
                    <div><strong>Status:</strong> {o.status}</div>
                    <div>
                      <strong>Data:</strong>{' '}
                      { (o.data_pedido || o.data_entrega) ? (o.data_pedido || o.data_entrega) : '—' }
                      {(o.hora_pedido || o.hora_entrega) ? (
                        <span>{' '}—{' '}{(o.hora_pedido && o.hora_pedido.length === 5) ? `${o.hora_pedido}:00` : (o.hora_pedido || o.hora_entrega)}</span>
                      ) : null }
                    </div>

                    <div style={{ marginTop: 4 }}>
                      <strong>Produtos:</strong>
                      <ul style={{ margin: '8px 0 0 16px' }}>
                        {((o._cart && (o._cart as AnyObj[]).length) ? (o._cart as AnyObj[]) : (extractCart(o['carrinho'] ?? o['observacao']) || [])).map((it: AnyObj, idx: number) => {
                          const name = ((it['nome'] as string) || (o._productNames && (o._productNames as string[])[idx]) || `#${(it['id'] as number | undefined) ?? idx}`);
                          const qty = (it['quantidade'] !== undefined ? `${it['quantidade']}` : '1');
                          const price = (it['preco'] !== undefined ? ` — R$ ${Number(it['preco']).toFixed(2)}` : '');
                          return <li key={idx}>{`${name} x ${qty}${price}`}</li>;
                        })}
                      </ul>
                    </div>
                  </div>

                  <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                    {o.status === 'Recebido' ? (
                      <button className={styles.secondaryBtn} onClick={() => (typeof o.id === 'number' ? handleCancel(o.id as number) : undefined)}>Cancelar pedido</button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
