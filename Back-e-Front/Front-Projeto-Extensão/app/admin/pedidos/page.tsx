"use client";
import React, { useEffect, useState, useCallback } from 'react';
import { fetchOrders, updateOrderStatus } from '../../../services/orderService';
import { fetchProductById } from '../../../services/productService';
import { fetchAddresses } from '../../../services/addressService';
import styles from '../../../styles/AdminPedidos.module.css';
import { showError, showToast, showConfirm } from '../../../utils/sweetAlert';
import { formatDateToYYYYMMDD } from '../../../utils/dateUtils';
import { buildImageURL } from '@/utils/imageUtils';
import SmartImage from '../../../components/SmartImage';

export default function AdminPedidosPage() {
  type AnyObj = Record<string, unknown>;
  type Order = AnyObj & {
    id?: number;
    _images?: string[];
    _imageIndex?: number;
    _productNames?: string[];
    nome_cliente?: string;
    nome_destinatario?: string | null;
    usuario?: { nome?: string } | null;
    telefone_cliente?: string | null;
    endereco?: { rua?: string; numero?: string; complemento?: string; bairro?: string; cidade?: string; cep?: string } | null;
    Endereco_id?: number | null;
    status?: string;
    data_pedido?: string;
    data_entrega?: string;
    cobrar_no_endereco?: boolean | number | null;
    vem_retirar?: boolean | number | null;
  };
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifyDisabled, setNotifyDisabled] = useState<Record<number, boolean>>({});
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<string | null>(() => {
    // inicializa com a data local (YYYY-MM-DD)
    return formatDateToYYYYMMDD();
  });
  const [endDateFilter, setEndDateFilter] = useState<string | null>(() => {
    // inicializa com a data local (YYYY-MM-DD)
    return formatDateToYYYYMMDD();
  });
  const [sortBy, setSortBy] = useState<'hora_pedido' | 'hora_entrega' | null>('hora_pedido');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusSelections, setStatusSelections] = useState<Record<string, string>>({}); 

  function displayStatus(status?: string | null) {
    if (!status) return '—';
    if (status === 'Em_Rota') return 'Saiu para entrega';
    // replace underscore with space for other statuses
    return String(status).replace(/_/g, ' ');
  }

  function formatTime(t?: string | null) {
    if (!t) return '—';
    if (typeof t !== 'string') return String(t);
    // common formats: HH:MM, HH:MM:SS, or ISO-like strings containing time
    if (t.length === 5) return t; // HH:MM
    if (t.length === 8) return t.slice(0, 5); // HH:MM:SS -> HH:MM
    const m = t.match(/(\d{2}:\d{2})/);
    return m ? m[1] : t;
  }

  // Extrai lista de produtos do campo observacao, segura contra JSON inválido
  const extractCart = useCallback((obs: unknown): AnyObj[] | null => {
    if (!obs) return null;
    try {
      const parsed = typeof obs === 'string' ? JSON.parse(obs) as unknown : obs;
      // formato esperado: { cart: [ { id, nome, preco, quantidade }, ... ] }
      if (parsed && typeof parsed === 'object') {
        const obj = parsed as Record<string, unknown>;
        if (Array.isArray(obj['cart'])) return obj['cart'] as AnyObj[];
      }
      // às vezes observacao pode ser apenas um array
      if (Array.isArray(parsed)) return parsed as AnyObj[];
      return null;
    } catch {
      // não quebrar a página se observacao não for JSON
      return null;
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const o = (await fetchOrders()) as AnyObj[];
    let arr: Order[] = (o || []) as Order[];
        // se algum pedido não veio com a relação endereco, tente buscar endereços e casar por Endereco_id
        const needsAddresses = arr.some(x => !x.endereco && x.Endereco_id);
        if (needsAddresses) {
          const addrs = await fetchAddresses() as unknown as AnyObj[];
          const map = new Map<number, AnyObj>();
          addrs.forEach((a: AnyObj) => { if ((a.id as number | undefined)) map.set(a.id as number, a); });
          arr = arr.map((p: AnyObj) => ({ ...p, endereco: (p['endereco'] as AnyObj) || (p['Endereco_id'] ? map.get(p['Endereco_id'] as number) : null) }));
        }
        // Enriquecer pedidos com imagens dos produtos (quando presentes em observacao)
  const enriched = await Promise.all(arr.map(async (p: AnyObj) => {
          // aceitar o novo campo `carrinho` (string JSON) ou cair para `observacao` para compatibilidade
    const cart = extractCart(p['carrinho'] ?? p['observacao']) || [];
          // primeiro, tente extrair imagens e nomes diretamente do item (quando o pedido foi feito direto no produto)
    const imgsFromItems = (cart || [])
      .map((it: AnyObj) => {
        const url = it && (it['imagem_url'] as string);
        return url ? url.split(',')[0].trim() : '';
      })
      .filter((v) => Boolean(v) && typeof v === 'string' && v.trim() !== '') as string[];
    const namesFromItems = (cart || [])
      .map((it: AnyObj) => (it && (it['nome'] as string)))
      .filter((v) => Boolean(v) && typeof v === 'string' && v.trim() !== '') as string[];
    const ids = (cart || [])
      .map((it: AnyObj) => (it && (it['id'] as number)))
      .filter((id) => Boolean(id) && typeof id === 'number') as number[];

          // se encontramos imagens já presentes na observacao, use-as
          if (imgsFromItems.length > 0) return { ...p, _images: imgsFromItems, _imageIndex: 0, _productNames: namesFromItems };

          // caso contrário, tente buscar pelos ids
          if (ids.length === 0) return { ...p, _images: [], _imageIndex: 0, _productNames: [] };
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
            return { ...p, _images: imgs, _imageIndex: 0, _productNames: names };
          } catch {
            return { ...p, _images: [], _imageIndex: 0, _productNames: [] };
          }
        }));
        setOrders(enriched);
      } catch (e) {
        console.error('Failed to load orders', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [extractCart]);

  // derive per-order notification preference from backend field when orders change
  useEffect(() => {
    try {
      const map: Record<number, boolean> = {};
      (orders || []).forEach(o => {
        const id = typeof o.id === 'number' ? o.id as number : undefined;
        if (!id) return;
        // notifications_enabled can be numeric (0/1) or boolean; consider missing value as enabled
        const raw = (o as any).notifications_enabled;
        // treat 0 or '0' or false as disabled
        const isDisabled = raw === 0 || raw === '0' || raw === false ? true : false;
        map[id] = isDisabled;
      });
      setNotifyDisabled(map);
    } catch (e) {
      // ignore
    }
  }, [orders]);

  async function toggleNotify(orderId?: number) {
    if (!orderId) return;
    // optimistic update: flip local state first so the UI responds immediately
    const prev = notifyDisabled[orderId] === true;
    setNotifyDisabled(curr => ({ ...curr, [orderId]: !prev }));

    try {
  const currentlyDisabled = prev;
  // prev == notifyDisabled (true when notifications are currently disabled)
  // We want to set the backend `notifications_enabled` to the new value.
  // currentNotificationsEnabled = !currentlyDisabled
  // newNotificationsEnabled = !currentNotificationsEnabled = currentlyDisabled
  const enabled = currentlyDisabled; // flip: if currently disabled -> enable (true); if currently enabled -> disable (false)
      // call backend to persist
      console.log('[admin/pedidos] toggleNotify sending', { orderId, enabled });
      const mod = await (await import('../../../services/orderService')).setOrderNotifications(orderId, enabled);
      // backend returns updated order; update orders list
      if (mod) {
        setOrders(curr => curr.map(o => o.id === orderId ? { ...o, ...(mod || {}) } : o));
      }
      // ensure local map reflects backend value (notifications_enabled may be 0/1)
      const newRaw = (mod as any)?.notifications_enabled;
      const newDisabled = newRaw === 0 || newRaw === '0' || newRaw === false ? true : false;
      setNotifyDisabled(curr => ({ ...curr, [orderId]: newDisabled }));
    } catch (e) {
      console.error('Failed to toggle notifications', e);
      // revert optimistic change
      setNotifyDisabled(curr => ({ ...curr, [orderId]: prev }));
      showError('Erro ao atualizar preferências de notificação');
    }
  }

  async function handleChangeStatus(id: number, status: string) {
    const statusLabels: Record<string, string> = {
      'Pendente': 'Pendente',
      'Em preparo': 'Em preparo',
      'Pronto para entrega': 'Pronto para entrega',
      'Em rota de entrega': 'Saiu para entrega',
      'Em_Rota': 'Saiu para entrega',
      'Entregue': 'Entregue',
      'Cancelado': 'Cancelado'
    };
    
    const statusLabel = statusLabels[status] || status;
    const confirmed = await showConfirm(
      `Deseja alterar o status do pedido #${id} para "${statusLabel}"?`,
      'Confirmar altera\u00e7\u00e3o de status',
      'Sim, alterar',
      'Cancelar'
    );
    
    if (!confirmed) return;
    
    try {
      await updateOrderStatus(id, status);
      setOrders(orders.map(o => o.id === id ? { ...o, status } : o));
      showToast('Status atualizado com sucesso', 'success');
    } catch (err) { console.error(err); showError('Erro ao atualizar status'); }
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

  // Função helper para normalizar strings (remove acentos e converte para minúsculas)
  const normalizeString = (str: string) => {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  };

  // aplica filtros e ordenação sem modificar o estado original
  const visibleOrders = React.useMemo(() => {
    let arr = (orders || []).slice();
    
    // Filtro de pesquisa
    if (searchTerm && searchTerm.trim()) {
      const term = normalizeString(searchTerm.trim());
      arr = arr.filter(o => {
        // Pesquisar por ID
        if (o.id && String(o.id).includes(term)) return true;
        
        // Pesquisar por nome do cliente
        const nomeCliente = normalizeString(o.nome_cliente || o.usuario?.nome || '');
        if (nomeCliente.includes(term)) return true;
        
        // Pesquisar por nome de produtos
        if (o._productNames && o._productNames.length > 0) {
          if (o._productNames.some((name: string) => normalizeString(name).includes(term))) return true;
        }
        
        return false;
      });
    }
    
    if (statusFilter) arr = arr.filter(o => (o.status || '').toLowerCase() === statusFilter.toLowerCase());
    if (dateFilter || endDateFilter) {
      arr = arr.filter(o => {
        const pedidoDate = o.data_pedido as string | undefined;
        const entregaDate = o.data_entrega as string | undefined;
        const orderDate = pedidoDate || entregaDate;
        
        if (!orderDate) return false;
        
        const start = dateFilter || '0000-00-00';
        const end = endDateFilter || '9999-12-31';
        
        return orderDate >= start && orderDate <= end;
      });
    }
    if (sortBy) {
      arr.sort((a: AnyObj, b: AnyObj) => {
        const aval = a[sortBy] as unknown as string | undefined;
        const bval = b[sortBy] as unknown as string | undefined;
        const ta = aval ? (aval.length === 5 ? aval + ':00' : aval) : '00:00:00';
        const tb = bval ? (bval.length === 5 ? bval + ':00' : bval) : '00:00:00';
        
        // Usar a data correspondente ao tipo de ordenação
        const dateField = sortBy === 'hora_pedido' ? 'data_pedido' : 'data_entrega';
        const da = (a[dateField] as string) || '';
        const db = (b[dateField] as string) || '';
        
        const dta = new Date(da + 'T' + ta).getTime() || 0;
        const dtb = new Date(db + 'T' + tb).getTime() || 0;
        return sortDir === 'asc' ? dta - dtb : dtb - dta;
      });
    }
    return arr;
  }, [orders, statusFilter, dateFilter, endDateFilter, sortBy, sortDir, searchTerm]);

  if (loading) return <div className={styles.container}>Carregando pedidos...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Gerenciar Pedidos</h1>
          <p className={styles.subtitle}>Acompanhe e gerencie todos os pedidos</p>
        </div>
      </div>
      
      {/* Barra de pesquisa */}
      <div style={{ marginBottom: 16, position: 'relative' }}>
        <input 
          type="text"
          placeholder="Pesquisar por nome do cliente, produto ou ID"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 48px 12px 16px',
            fontSize: '15px',
            border: '2px solid #e0e0e0',
            borderRadius: '8px',
            outline: 'none',
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => e.target.style.borderColor = '#2e7d32'}
          onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
        />
        <svg 
          width="20" 
          height="20" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="#999" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          style={{
            position: 'absolute',
            right: '16px',
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none'
          }}
        >
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
        </svg>
        {searchTerm && (
          <div style={{ marginTop: 8, fontSize: 14, color: '#666' }}>
            {visibleOrders.length} {visibleOrders.length === 1 ? 'resultado encontrado' : 'resultados encontrados'}
          </div>
        )}
      </div>
      
      <div className={styles.header}>
        <div className={styles.toolbar}>
          <div className={styles.filters}>
            <label style={{ fontWeight: 600, marginRight: 8 }}>Status</label>
            {/* mobile-only label (CSS will show this only on small screens) */}
            <span className={styles.mobileStatusLabel}>Status</span>
            {/* Mostrar todos os possíveis status, mesmo que não existam pedidos com eles ainda */}
            <select
              value={statusFilter ?? ''}
              onChange={e => setStatusFilter(e.target.value || null)}
              style={{ padding: '8px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)', minWidth: 180 }}
            >
              <option value="">Todos</option>
              {['Recebido', 'Preparando', 'Em_Rota', 'Entregue', 'Cancelado'].map(s => (
                <option key={s} value={s}>{displayStatus(s)}</option>
              ))}
            </select>
          </div>

          <div className={styles.filters}>
            <label style={{ fontWeight: 600, marginRight: 8 }}>Ordenar</label>
            {/* mobile-only label for sort controls */}
            <span className={styles.mobileSortLabel}>Ordenar</span>
            <button className={styles.btn} onClick={() => { setSortBy('hora_pedido'); setSortDir(sortBy === 'hora_pedido' && sortDir === 'desc' ? 'asc' : 'desc'); }}>Hora Pedido {sortBy === 'hora_pedido' ? (sortDir === 'desc' ? '↓' : '↑') : ''}</button>
            <button className={styles.btn} onClick={() => { setSortBy('hora_entrega'); setSortDir(sortBy === 'hora_entrega' && sortDir === 'desc' ? 'asc' : 'desc'); }}>Hora Entrega {sortBy === 'hora_entrega' ? (sortDir === 'desc' ? '↓' : '↑') : ''}</button>
          </div>

          <div className={styles.filters}>
            <label style={{ fontWeight: 600, marginRight: 8 }}>Data</label>
            {/* mobile-only label (CSS will show this only on small screens) */}
            <span className={styles.mobileDateLabel}>Data</span>
            <input 
              type="date" 
              value={dateFilter || ''} 
              onChange={e => {
                const value = e.target.value || null;
                setDateFilter(value);
                // Se a data final estiver vazia, preenche com a mesma data
                if (!endDateFilter && value) {
                  setEndDateFilter(value);
                }
              }}
              max={endDateFilter || undefined}
              placeholder="Data inicial"
              style={{
                border: '1px solid #c8e6c9',
                borderRadius: '6px',
                padding: '8px 12px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#81c784'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#c8e6c9'}
            />
            <span style={{ margin: '0 8px', fontWeight: 500 }}>até</span>
            <input 
              type="date" 
              value={endDateFilter || ''} 
              onChange={e => {
                const value = e.target.value || null;
                setEndDateFilter(value);
                // Se a data inicial estiver vazia, preenche com a mesma data
                if (!dateFilter && value) {
                  setDateFilter(value);
                }
              }}
              min={dateFilter || undefined}
              placeholder="Data final"
              style={{
                border: '1px solid #c8e6c9',
                borderRadius: '6px',
                padding: '8px 12px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#81c784'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#c8e6c9'}
            />
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            {(dateFilter || endDateFilter) && <button 
              className={`${styles.secondaryBtn} ${styles.clearBtn}`} 
              onClick={() => { setDateFilter(null); setEndDateFilter(null); }}
              style={{ 
                whiteSpace: 'nowrap',
                fontSize: '0.9rem',
                padding: '6px 12px'
              }}
            >
              Limpar Datas
            </button>}
            {(statusFilter || dateFilter || endDateFilter || sortBy || searchTerm) && <button 
              className={`${styles.secondaryBtn} ${styles.clearBtn}`} 
              onClick={() => { 
                setStatusFilter(null); 
                setDateFilter(null); 
                setEndDateFilter(null); 
                setSortBy(null); 
                setSortDir('desc'); 
                setSearchTerm(''); 
              }}
              style={{ 
                whiteSpace: 'nowrap',
                fontSize: '0.9rem',
                padding: '6px 12px'
              }}
            >
              Limpar Tudo
            </button>}
          </div>
        </div>
      </div>

      <div className={styles.grid}>
        {visibleOrders.length === 0 ? (
          <div style={{
            gridColumn: '1 / -1',
            textAlign: 'center',
            padding: '60px 20px',
            color: '#666'
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '16px',
              opacity: 0.3
            }}>
              📦
            </div>
            <h3 style={{
              fontSize: '20px',
              marginBottom: '8px',
              color: '#333'
            }}>
              Nenhum pedido encontrado
            </h3>
            <p style={{
              fontSize: '15px',
              color: '#666'
            }}>
              Não há pedidos {dateFilter || endDateFilter ? 'na data selecionada' : statusFilter ? 'com este status' : searchTerm ? 'que correspondam à pesquisa' : 'no momento'}
            </p>
          </div>
        ) : (
          visibleOrders.map(o => (
          <div key={o.id} className={styles.card} style={{ overflow: 'visible', minHeight: '200px', paddingTop: '80px' }}>
            {o.telefone_cliente && (
              <a
                href={`https://wa.me/${String(o.telefone_cliente).replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.whatsappBtn}
                title="Enviar mensagem no WhatsApp"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
              </a>
            )}
            <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 50 }}>
              <label 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  backgroundColor: 'rgba(255,255,255,0.95)',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                  userSelect: 'none'
                }}
                onClick={(e) => {
                  e.preventDefault();
                  toggleNotify(typeof o.id === 'number' ? o.id as number : undefined);
                }}
              >
                <span style={{ whiteSpace: 'nowrap' }}>Notificar cliente?</span>
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '4px',
                    border: '2px solid #2e7d32',
                    backgroundColor: !(notifyDisabled && typeof o.id === 'number' && notifyDisabled[o.id]) ? '#2e7d32' : '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 0.2s'
                  }}
                >
                  {!(notifyDisabled && typeof o.id === 'number' && notifyDisabled[o.id]) && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  )}
                </div>
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  fontWeight: 500,
                  backgroundColor: 'rgba(255,255,255,0.95)',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                  whiteSpace: 'nowrap'
                }}
              >
                <span>Status:</span>
                <span style={{
                  fontWeight: 600,
                  color: o.status === 'Entregue' ? '#2e7d32' : o.status === 'Cancelado' ? '#d32f2f' : o.status === 'Em_Rota' ? '#1976d2' : '#f57c00'
                }}>
                  {displayStatus(o.status as string | null)}
                </span>
              </div>
            </div>
            <div className={styles.thumb}>
              {(o._images && o._images.length > 0) ? (
                <div style={{ position: 'relative', width: '100%', height: '100%' }} key={`order-${o.id}-img-${o._imageIndex || 0}`}>
                  {(() => {
                    const currentIndex = typeof o._imageIndex === 'number' ? o._imageIndex : 0;
                    const currentImage = o._images[currentIndex];
                    
                    return currentImage && typeof currentImage === 'string' && currentImage.trim() ? (
                      <SmartImage
                        key={`img-${o.id}-${currentIndex}`}
                        src={currentImage}
                        alt={String(o.nome_cliente ?? o.id ?? '')}
                        width={140}
                        height={140}
                        style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                      />
                    ) : (
                      <div key={`no-img-${o.id}-${currentIndex}`} style={{ width: '100%', height: '100%', background: '#f3f3f3', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: '0.875rem' }}>
                        Sem imagem
                      </div>
                    );
                  })()}
                  {o._images.length > 1 && (
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
                      {(o._imageIndex || 0) < o._images.length - 1 && (
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
                <div style={{ width: '100%', height: '100%', background: '#f3f3f3' }} />
              )}
            </div>

            <div className={styles.details}>
              <div className={styles.meta}>
                <div><strong>Cliente:</strong> {o.nome_cliente || o.usuario?.nome}</div>
                <div><strong>Para:</strong> {o.nome_destinatario || '—'}</div>
                <div><strong>Telefone:</strong> {o.telefone_cliente || '—'}</div>
                {!(o.vem_retirar === true || o.vem_retirar === 1) && (
                  <div>
                    <strong>Endereço:</strong>{' '}
                    {o.endereco ? (
                      `${o.endereco.rua}, ${o.endereco.numero}${o.endereco.complemento ? ' • ' + o.endereco.complemento : ''} — ${o.endereco.bairro}${o.endereco.cidade ? ', ' + o.endereco.cidade : ''}${o.endereco.cep ? ' • CEP: ' + o.endereco.cep : ''}`
                    ) : (
                      o.Endereco_id ? `ID ${o.Endereco_id}` : '—'
                    )}
                  </div>
                )}
                
                <div className={styles.times}>
                  <div>
                    <strong>{(o.vem_retirar === true || o.vem_retirar === 1) ? 'Hora de retirada:' : 'Hora de entrega:'}</strong> {formatTime(o['hora_entrega'] as string | null)}
                    {(() => {
                      const d = (o['data_entrega'] as string | null);
                      const fm = (function(d?: string | null) {
                        if (!d) return null;
                        const s = String(d);
                        if (s.includes('T')) {
                          try { const dt = new Date(s); if (!isNaN(dt.getTime())) return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}`; } catch {}
                        }
                        const m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
                        if (m) return `${m[3]}/${m[2]}`;
                        return null;
                      })(d);
                      return fm ? ` • ${fm}` : '';
                    })()}
                  </div>
                  <div>
                    <strong>Hora do pedido:</strong> {formatTime(o['hora_pedido'] as string | null)}
                    {(() => {
                      const d = (o['data_pedido'] as string | null);
                      const fm = (function(d?: string | null) {
                        if (!d) return null;
                        const s = String(d);
                        if (s.includes('T')) {
                          try { const dt = new Date(s); if (!isNaN(dt.getTime())) return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}`; } catch {}
                        }
                        const m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
                        if (m) return `${m[3]}/${m[2]}`;
                        return null;
                      })(d);
                      return fm ? ` • ${fm}` : '';
                    })()}
                  </div>
                </div>
                
                {(o.cobrar_no_endereco === true || o.cobrar_no_endereco === 1) ? (
                  <div style={{ marginTop: 8 }}>
                    <strong style={{ color: '#2e7d32' }}>Cobrar no endereço</strong>
                  </div>
                ) : null}
                
                {(o.vem_retirar === true || o.vem_retirar === 1) ? (
                  <div style={{ marginTop: 8 }}>
                    <strong style={{ color: '#1976d2' }}>Vem retirar</strong>
                  </div>
                ) : null}
                
                {o.observacao && String(o.observacao).trim() && !String(o.observacao).startsWith('{') ? (
                  <div style={{ marginTop: 8 }}>
                    <strong>Observação:</strong>
                    <div style={{ 
                      marginTop: 4, 
                      padding: '8px 12px', 
                      background: '#f5f5f5', 
                      borderRadius: '6px',
                      fontSize: '0.9rem',
                      color: '#555',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {String(o.observacao)}
                    </div>
                  </div>
                ) : null}
              </div>

              {/* produtos */}
              {(() => {
                const cart = extractCart(o.carrinho || o.observacao) || [];
                if (cart && cart.length) {
                  return (
                    <div className={styles.productList}>
                      {cart.map((it: AnyObj, idx: number) => (
                        <span key={idx} className={styles.badge}>
                          {((it['nome'] as string) || (o._productNames && o._productNames[idx]) || `Produto #${(it['id'] as number | undefined) ?? idx}`)} {it['quantidade'] !== undefined ? ` x ${(it['quantidade'] as number)}` : ''}
                        </span>
                      ))}
                    </div>
                  );
                }
                if (o._productNames && o._productNames.length) {
                  return (
                    <div className={styles.productList}>
                      {o._productNames.map((n: string, i: number) => <span key={i} className={styles.badge}>{n}</span>)}
                    </div>
                  );
                }
                return null;
              })()}

              <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 8 }}>
                <button className={styles.secondaryBtn} onClick={() => { window.location.href = `/pedido/${o.id}`; }}>Ver detalhes</button>
              </div>
            </div>

      <div className={styles.statusColumn}>
    <div className={`${styles.statusLabel} ${styles.rightMeta}`}><strong>Status:</strong> {displayStatus(o.status as string | null)}</div>
          <div className={styles.statusActions}>
                  {/* Select box with allowed statuses (exclude 'Recebido') */}
                  <select
                    value={statusSelections[String(o.id ?? '')] || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (typeof o.id === 'number') setStatusSelections(curr => ({ ...curr, [String(o.id)]: val }));
                    }}
                    className={styles.statusSelect}
                  >
                    <option value="">Alterar status</option>
                    {['Preparando', 'Em_Rota', 'Entregue', 'Cancelado'].map(s => (
                      <option key={s} value={s}>{s === 'Em_Rota' ? 'Saiu para entrega' : s.replace('_', ' ')}</option>
                    ))}
                  </select>
                  <button
                    className={`${styles.btn} ${styles.statusUpdateBtn}`}
                    onClick={() => {
                      const sel = statusSelections[String(o.id ?? '')] || '';
                      if (typeof o.id === 'number' && sel) {
                        handleChangeStatus(o.id, sel);
                        setStatusSelections(curr => ({ ...curr, [String(o.id)]: '' }));
                      }
                    }}
                    disabled={!statusSelections[String(o.id ?? '')]}
                  >
                    Atualizar
                  </button>
                </div>
            </div>
          </div>
        )))}
      </div>
    </div>
  );
}
