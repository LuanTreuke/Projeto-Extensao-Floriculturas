import { getCurrentUser, User } from './authService';
import api from './api';

export interface CartItem {
  // id kept as produto id for UI compatibility
  id: number; // product id
  nome: string;
  preco: number;
  quantidade: number;
  imagem_url?: string;
  // server-side cart item id (if present when user is logged in)
  serverId?: number;
}

const STORAGE_KEY = 'floricultura_cart_v1';

type AnyObj = Record<string, unknown>;

function userStorageKey() {
  try {
    const u = getCurrentUser() as User | null;
    if (u && (u.id || u.id === 0)) return `${STORAGE_KEY}_user_${u.id}`;
  } catch {}
  return STORAGE_KEY; // fallback to global key for guests
}

export function getCart(): CartItem[] {
  // synchronous getter kept for guests and UI that expects immediate return.
  // For logged-in users, prefer calling the server endpoints (async) via getCartFromServer.
  try {
    const key = userStorageKey();
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw) as CartItem[];
  } catch (e) {
    console.error('getCart parse error', e);
    return [];
  }
}

export async function getCartFromServer(): Promise<CartItem[]> {
  try {
    const u = getCurrentUser() as User | null;
    if (!u || !u.id) return getCart();
    const res = await api.get(`/cart`, { params: { Usuario_id: u.id } });
    const cart = res.data;
    // normalize items to frontend shape
    const rawItems = (cart && (cart as AnyObj).items ? (cart as AnyObj).items as AnyObj[] : []) as AnyObj[];
    const items = rawItems.map((it: AnyObj) => {
      const produto = it['produto'] as AnyObj | undefined;
      const meta = it['meta'] as AnyObj | undefined;
      const prodId = (produto && (produto['id'] as number)) || (meta && (meta['produtoId'] as number)) || 0;
      const nome = (meta && (meta['nome'] as string)) || (produto && (produto['nome'] as string)) || '';
      const preco = Number(it['preco_unitario' as string] ?? it['preco'] ?? it['precoUnitario'] ?? 0);
      const quantidade = (it['quantidade'] as number) ?? 1;
      const imagem_url = (meta && (meta['imagem_url'] as string)) || (produto && (produto['imagem_url'] as string)) || undefined;
      const serverId = it['id'] as number | undefined;
      return { id: prodId, nome, preco, quantidade, imagem_url, serverId } as CartItem;
    });
    // keep local cache for quick UI; write to user-scoped key
  try { localStorage.setItem(userStorageKey(), JSON.stringify(items)); } catch {}
    return items;
  } catch (e) {
    console.warn('getCartFromServer failed', (e as Error)?.message ?? String(e));
    return getCart();
  }
}

export function saveCart(items: CartItem[]) {
  const key = userStorageKey();
  localStorage.setItem(key, JSON.stringify(items));
}

// simple pub/sub so components can react to cart changes
type CartListener = (items: CartItem[]) => void;
const listeners: CartListener[] = [];
export function subscribeCart(fn: CartListener) {
  listeners.push(fn);
  return () => {
    const idx = listeners.indexOf(fn);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}
function notify() {
  const c = getCart();
  listeners.slice().forEach((l) => { try { l(c); } catch {} });
}

export function addToCart(item: Omit<CartItem, 'quantidade'>, qtd = 1) {
  const u = getCurrentUser() as User | null;
  if (u && u.id) {
    // server-side add
    try {
      (async () => {
  const res = await api.post(`/cart/items`, { Usuario_id: u.id, produtoId: item.id, nome: item.nome, preco: item.preco, quantidade: qtd, imagem_url: item.imagem_url });
        // refresh local cache (this will write serverId into items)
        await getCartFromServer();
        notify();
        return res.data;
      })();
    } catch (e) {
      console.warn('addToCart server failed', (e as Error)?.message ?? String(e));
    }
    // optimistic local update
    const cart = getCart();
    const found = cart.find(i => i.id === item.id);
    if (found) found.quantidade += qtd; else cart.push({ ...item, quantidade: qtd });
    saveCart(cart);
    notify();
    return cart;
  }
  // guest fallback
  const cart = getCart();
  const found = cart.find(i => i.id === item.id);
  if (found) {
    found.quantidade += qtd;
  } else {
    cart.push({ ...item, quantidade: qtd });
  }
  saveCart(cart);
  notify();
  return cart;
}

export function updateQty(productId: number, quantidade: number) {
  const u = getCurrentUser() as User | null;
  if (u && u.id) {
    (async () => {
      try {
        // find server-side item id from cached local items (best effort)
        const cached = getCart();
        const found = cached.find(i => i.id === productId);
        if (found && typeof found.serverId === 'number') {
          await api.put(`/cart/items/${found.serverId}`, { quantidade });
        }
        await getCartFromServer();
        notify();
      } catch (e) { console.warn('updateQty server failed', (e as Error)?.message ?? String(e)); }
    })();
  }
  const cart = getCart();
  const idx = cart.findIndex(i => i.id === productId);
  if (idx === -1) return cart;
  if (quantidade <= 0) cart.splice(idx, 1);
  else cart[idx].quantidade = quantidade;
  saveCart(cart);
  notify();
  return cart;
}

export function removeFromCart(productId: number) {
  const u = getCurrentUser() as User | null;
  if (u && u.id) {
    (async () => {
      try {
        const cached = getCart();
        const found = cached.find(i => i.id === productId);
          if (found && typeof found.serverId === 'number') await api.delete(`/cart/items/${found.serverId}`);
        await getCartFromServer();
        notify();
      } catch (e) { console.warn('removeFromCart server failed', (e as Error)?.message ?? String(e)); }
    })();
  }
  const cart = getCart().filter(i => i.id !== productId);
  saveCart(cart);
  notify();
  return cart;
}

export function clearCart() {
  // clear the appropriate storage key
  try {
    const key = userStorageKey();
    localStorage.removeItem(key);
    const u = getCurrentUser() as User | null;
    if (u && u.id) {
      // fire-and-forget server clear
      (async () => {
  try { await api.post(`/cart/clear`, { Usuario_id: u.id }); } catch (e) { console.warn('clearCart server failed', (e as Error)?.message ?? String(e)); }
      })();
    }
  } catch {}
  notify();
}

export function cartTotal() {
  const cart = getCart();
  return cart.reduce((s, i) => s + (i.preco || 0) * (i.quantidade || 1), 0);
}

const cartService = { getCart, saveCart, addToCart, updateQty, removeFromCart, clearCart, cartTotal };
export default cartService;

// listen for cross-module cart-updated events (dispatched on logout) to refresh subscribers
if (typeof window !== 'undefined') {
  window.addEventListener('cart-updated', () => {
    try { notify(); } catch { }
  });
}
