"use client";
import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import cartStyles from '../styles/ShoppingCart.module.css';
import SmartImage from './SmartImage';
import { getCart, CartItem, updateQty, removeFromCart, cartTotal, subscribeCart } from '../services/cartService';
import { fetchAddresses } from '../services/addressService';
import { getCurrentUser } from '../services/authService';

type Props = {
  onClose?: () => void;
  inline?: boolean;
};

type User = { id?: number; role?: string; cargo?: string } | null;
type Address = { id?: number; Usuario_id?: number; [k: string]: unknown };

export default function CartPopup({ onClose, inline = false }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [total, setTotal] = useState(0);
  // local string inputs for quantities so we don't force immediate numeric coercion
  const [qtyInputs, setQtyInputs] = useState<Record<number, string>>({});
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<number | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const usuario = getCurrentUser() as User;
    (async () => {
      if (usuario && usuario.id) {
        // logged-in: prefer the server-backed cart
        try {
          const cartModule = await import('../services/cartService');
          const server = (await cartModule.getCartFromServer()) as CartItem[];
          setItems(server);
          setTotal(server.reduce((s: number, i: CartItem) => s + (i.preco || 0) * (i.quantidade || 1), 0));
        } catch (err: unknown) {
          // fallback to local cache
          console.warn('failed to load server cart, using local cache', err);
          const c = getCart() as CartItem[];
          setItems(c);
          setTotal(cartTotal());
        }
      } else {
        const c = getCart() as CartItem[];
        setItems(c);
        setTotal(cartTotal());
      }
    })();
    // initialize qtyInputs for any items not yet present
    try {
      const c = getCart() as CartItem[];
      const initial: Record<number, string> = {};
      (c || []).forEach((it: CartItem) => { initial[it.id] = String(it.quantidade || ''); });
      setQtyInputs((prev) => ({ ...initial, ...prev }));
    } catch (err: unknown) {
      console.warn('failed to initialize qtyInputs from cart', err);
    }
    // subscribe to cart changes so UI updates on login/logout/merge
    const unsub = subscribeCart((items: CartItem[]) => {
      setItems(items);
      setTotal(cartTotal());
    });
    return () => unsub();
  }, []);

  const usuarioAny = getCurrentUser() as User;

  useEffect(() => {
    const usuario = getCurrentUser() as User;
    if (!usuario || !usuario.id) return;
    (async () => {
  const all = (await fetchAddresses()) as unknown as Array<{ id?: number; Usuario_id?: number; [k: string]: unknown }>;
      const my = (all || []).filter((a) => a.Usuario_id === usuario.id) as Address[];
      setAddresses(my);
      if (my.length > 0) setSelectedAddress((my[0].id ?? null) as number | null);
    })();
  }, []);

  function handleQtyChange(id: number, q: number) {
    const updated = updateQty(id, q);
    setItems(updated);
    setTotal(cartTotal());
    // keep the input in sync with the committed numeric value
    setQtyInputs((prev) => ({ ...prev, [id]: String(q) }));
  }

  function handleRemove(id: number) {
    const updated = removeFromCart(id);
    setItems(updated);
    setTotal(cartTotal());
    // clear local input
    setQtyInputs((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  }

  function commitQtyFromInput(id: number) {
    const raw = qtyInputs[id];
    if (raw === undefined) return;
    const trimmed = String(raw).trim();
    if (trimmed === '') {
      // only remove when explicitly confirmed (Enter)
      handleRemove(id);
      return;
    }
    const n = Number(trimmed);
    if (!Number.isFinite(n) || n <= 0) {
      // treat as remove when user confirms a zero/invalid number
      handleRemove(id);
      return;
    }
    // valid positive number -> commit
    handleQtyChange(id, Math.floor(n));
  }

  async function handleCheckout() {
    if (items.length === 0) {
      alert('Carrinho vazio');
      return;
    }
  const usuario = getCurrentUser() as User;
    if (!usuario || !usuario.id) {
      if (confirm('Você precisa estar logado para finalizar o pedido. Ir para login?')) {
        router.push('/login');
      }
      return;
    }

    if (inline) {
      if (!selectedAddress) {
        if (confirm('Nenhum endereço cadastrado. Deseja adicionar um agora?')) {
          router.push('/cadastro/endereco');
        }
        return;
      }
      try {
        localStorage.setItem('checkout_selected_address', String(selectedAddress));
      } catch (err) {
        console.warn('failed to save checkout_selected_address', err);
      }
    }

    if (onClose) onClose();
    router.push('/pedido');
  }

  useEffect(() => {
    if (inline) return;
    const scrollY = window.scrollY || window.pageYOffset || 0;
    const prev = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      left: document.body.style.left,
      right: document.body.style.right,
    };

    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (onClose) onClose();
      }
    }

    function preventScroll(e: Event) {
      e.preventDefault();
    }

    window.addEventListener('keydown', onKey);
    const overlayEl = overlayRef.current;
    if (overlayEl) {
      overlayEl.addEventListener('wheel', preventScroll, { passive: false });
      overlayEl.addEventListener('touchmove', preventScroll, { passive: false });
    }

    return () => {
      window.removeEventListener('keydown', onKey);
      if (overlayEl) {
        overlayEl.removeEventListener('wheel', preventScroll);
        overlayEl.removeEventListener('touchmove', preventScroll);
      }
      document.body.style.overflow = prev.overflow;
      document.body.style.position = prev.position;
      document.body.style.top = prev.top;
      document.body.style.left = prev.left;
      document.body.style.right = prev.right;
      window.scrollTo(0, scrollY);
    };
  }, [inline, onClose]);

  let content = (
    <div className={cartStyles.container} role="dialog" aria-label="Carrinho">
      <h2 className={cartStyles.heading}>Carrinho</h2>
      {items.length === 0 ? (
        <div className={cartStyles.empty}>Seu carrinho está vazio</div>
      ) : (
        <div>
          <div className={cartStyles.list}>
            {items.map((it) => (
              <div key={it.id} className={cartStyles.item}>
                {it.imagem_url ? (
                  <SmartImage src={it.imagem_url.split(',')[0].trim()} className={cartStyles.itemImage} alt={it.nome || ''} width={64} height={64} style={{ objectFit: 'cover', borderRadius: 8 }} />
                ) : (
                  <div className={cartStyles.itemImage} />
                )}
                <div className={cartStyles.itemInfo}>
                  <div className={cartStyles.itemName}>{it.nome}</div>
                  <div className={cartStyles.itemPrice}>R$ {Number(it.preco).toFixed(2)}</div>
                </div>
                <div className={cartStyles.controlsRow}>
                  <div className={cartStyles.removeWrap}>
                    <button className={cartStyles.removeBtn} onClick={() => handleRemove(it.id)}>Remover</button>
                  </div>
                  <div className={cartStyles.qtyWrap}>
                    <input
                      className={cartStyles.qtyInput}
                      type="number"
                      value={qtyInputs[it.id] ?? String(it.quantidade)}
                      min={1}
                      onChange={(e) => {
                        const v = e.target.value;
                        setQtyInputs((prev) => ({ ...prev, [it.id]: v }));
                        const trimmed = String(v).trim();
                        // do NOT auto-commit when the field is empty or zero/null
                        if (trimmed === '') return;
                        const n = Number(trimmed);
                        if (Number.isFinite(n) && n > 0) {
                          // auto-commit positive numeric changes immediately
                          handleQtyChange(it.id, Math.floor(n));
                        }
                        // if n is 0 or invalid, wait for explicit confirmation (Enter)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          commitQtyFromInput(it.id);
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className={cartStyles.footerRow}>
            <button
              className={cartStyles.backBtn}
              onClick={() => { if (onClose) onClose(); else router.back(); }}
            >
              Voltar
            </button>
            <div className={cartStyles.mobileRightInline}>
              <div className={cartStyles.total}>Total: R$ {Number(total).toFixed(2)}</div>
              <button className={cartStyles.checkoutBtn} onClick={handleCheckout}>Finalizar pedido</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (!usuarioAny || !usuarioAny.id) {
    content = (
      <div className={cartStyles.container} role="dialog" aria-label="Carrinho">
        <h2 className={cartStyles.heading}>Carrinho</h2>
        <div className={cartStyles.loginNotice}>
          <p>Faça login para acessar o carrinho</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className={cartStyles.backBtn} onClick={() => router.push('/login')}>Ir para login</button>
          </div>
        </div>
      </div>
    );
  }

  if (inline) return content;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 30000 }}>
      <div
        ref={overlayRef}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 30000 }}
        onClick={() => { if (onClose) onClose(); }}
      />
      <div
        className={cartStyles.panel}
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(720px, 90vw)',
          zIndex: 30001
        }}
      >
        {content}
      </div>
    </div>
  );
}
