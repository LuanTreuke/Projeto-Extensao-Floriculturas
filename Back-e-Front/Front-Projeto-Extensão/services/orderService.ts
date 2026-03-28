import api from './api';
import { getCurrentUser } from './authService';

export interface CreateOrderDto {
  imagem_entrega?: string;
  hora_entrega?: string;
  data_entrega?: string;
  nome_destinatario?: string;
  data_pedido?: string;
  hora_pedido?: string;
  nome_cliente?: string;
  telefone_cliente?: string;
  status?: string;
  pagamento_confirmado?: boolean;
  cobrar_no_endereco?: boolean;
  vem_retirar?: boolean;
  observacao?: string;
  carrinho?: string;
  Endereco_id: number;
  Usuario_id: number;
}

export async function createOrder(dto: CreateOrderDto) {
  try {
    const res = await api.post('/pedidos', dto);
    const created = res.data;
    // marcar notificação local para o usuário atual
    try {
      const u = getCurrentUser();
      const uid = (u && typeof u.id === 'number') ? u.id : null;
      if (uid != null && typeof window !== 'undefined') {
        localStorage.setItem(`orders_notify_user_${uid}`, '1');
        window.dispatchEvent(new Event('orders-updated'));
      }
    } catch {}
    // if phone provided, request backend to send whatsapp confirmation
    if (dto.telefone_cliente) {
      try {
        await api.post('/whatsapp/send-confirm', { phone: dto.telefone_cliente });
      } catch (whErr: unknown) {
        // don't block the user if whatsapp fails; just log for debugging
        try {
          // narrow to expected shapes instead of using `any`
          const maybe = whErr as { response?: { data?: unknown }; message?: string } | undefined;
          const candidate = maybe?.response?.data ?? maybe?.message ?? undefined;
          console.warn('Failed to send whatsapp confirmation', candidate ?? String(whErr));
        } catch {
          console.warn('Failed to send whatsapp confirmation', String(whErr));
        }
      }
    }
    return created;
  } catch (err: unknown) {
    // If server returned structured error info (axios), surface it to the caller
    try {
      const anyErr = err as any;
      if (anyErr && anyErr.response && anyErr.response.data) {
        const data = anyErr.response.data;
        const serverMsg = typeof data === 'string' ? data : (data.message || JSON.stringify(data));
        throw new Error(serverMsg);
      }
    } catch (_) {
      // fallthrough
    }
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(msg);
  }
}

export async function fetchOrders() {
  // If current user is Admin, fetch all orders; otherwise fetch only the user's orders
  try {
    const user = getCurrentUser();
    if (user && (user.role === 'Admin' || user.cargo === 'Admin')) {
      const res = await api.get('/pedidos');
      return res.data;
    }
    if (user && (user.id || user.id === 0)) {
      const res = await api.get(`/pedidos/usuario/${user.id}`);
      return res.data;
    }
    // not logged in: return empty
    return [];
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(msg);
  }
}

export async function fetchOrderById(id: number) {
  try {
    const res = await api.get(`/pedidos/${id}`);
    return res.data;
  } catch (err: unknown) {
    console.warn('fetchOrderById failed', err instanceof Error ? err.message : String(err));
    return null;
  }
}

export async function updateOrderStatus(id: number, status: string) {
  try {
    const res = await api.patch(`/pedidos/${id}/status`, { status });
    return res.data;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(msg);
  }
}

export async function setOrderNotifications(id: number, enabled: boolean) {
  try {
    const res = await api.patch(`/pedidos/${id}/notifications`, { enabled });
    return res.data;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(msg);
  }
}
