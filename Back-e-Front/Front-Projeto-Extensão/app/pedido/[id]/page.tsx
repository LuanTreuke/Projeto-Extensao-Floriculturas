"use client";
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import styles from '../../../styles/OrderDetails.module.css';
import { fetchOrderById } from '../../../services/orderService';
import SmartImage from '../../../components/SmartImage';

function formatDateTime(dateStr?: string, timeStr?: string) {
  if (!dateStr) return '—';
  const datePart = dateStr;
  const timePart = timeStr ? (timeStr.length === 5 ? timeStr + ':00' : timeStr) : '00:00:00';
  const d = new Date(`${datePart}T${timePart}`);
  if (isNaN(d.getTime())) return `${datePart} ${timeStr || ''}`;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

function displayStatus(status?: string | null) {
  if (!status) return '—';
  if (status === 'Em_Rota') return 'Saiu para entrega';
  return String(status).replace(/_/g, ' ');
}

export default function PedidoDetalhePage() {
  const params = useParams();
  const id = Number(params?.id);
  const router = useRouter();
  type AnyObj = Record<string, unknown>;
  type Order = AnyObj & {
    id?: number;
    nome_cliente?: string;
    nome_destinatario?: string | null;
    usuario?: { nome?: string; telefone?: string } | null;
    telefone_cliente?: string | null;
    endereco?: { rua?: string; numero?: string; complemento?: string; bairro?: string; cidade?: string; cep?: string } | null;
    Endereco_id?: number | null;
    data_entrega?: string;
    hora_entrega?: string;
    status?: string;
    data_pedido?: string;
    hora_pedido?: string;
    cobrar_no_endereco?: number | string | boolean;
    vem_retirar?: number | string | boolean;
    observacao?: unknown;
    carrinho?: unknown;
  };
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const o = await fetchOrderById(id);
      setOrder(o);
      setLoading(false);
    })();
  }, [id]);

  function extractCart(obs: unknown): AnyObj[] {
    if (!obs) return [];
    try {
      const parsed = typeof obs === 'string' ? JSON.parse(String(obs)) : obs;
      // formatos possíveis: { cart: [...] } | [...] | { items: [...] }
      if (parsed && typeof parsed === 'object') {
        const obj = parsed as Record<string, unknown>;
        if (Array.isArray(obj['cart'] as unknown)) return obj['cart'] as AnyObj[];
        if (Array.isArray(obj['items'] as unknown)) return obj['items'] as AnyObj[];
      }
      if (Array.isArray(parsed)) return parsed as AnyObj[];
      return [];
    } catch { return []; }
  }

  if (loading) return <div className={styles.container}>Carregando...</div>;
  if (!order) return <div className={styles.container}>Pedido não encontrado</div>;

  const cart = extractCart((order && (order['carrinho'] as unknown)) ?? undefined) || [];
  const unique: AnyObj[] = [];
  const seen = new Set<string>();
  cart.forEach((it: AnyObj) => {
    const id = (it['id'] as number | undefined) ?? '';
    const nome = (it['nome'] as string | undefined) ?? '';
    const key = `${id}::${nome}`;
    if (!seen.has(key)) { seen.add(key); unique.push(it); }
    else {
      const ex = unique.find(u => ((u['id'] as number | undefined) === (it['id'] as number | undefined) && (u['nome'] as string | undefined) === (it['nome'] as string | undefined)));
      if (ex) {
        const prev = (ex['quantidade'] as number | undefined) ?? 0;
        const add = (it['quantidade'] as number | undefined) ?? 0;
        ex['quantidade'] = prev + add;
      }
    }
  });

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>Pedido #{order.id}</h1>
      <div className={styles.card}>
        <div className={styles.row}>
          <div className={styles.left}>
            <div className={styles.meta}>
              <div className={styles.metaItem}><span className={styles.label}>Cliente:</span> <span className={styles.muted}>{order.nome_cliente || order.usuario?.nome}</span></div>
              <div className={styles.metaItem}><span className={styles.label}>Nome do destinatário:</span> <span className={styles.muted}>{order.nome_destinatario || '—'}</span></div>
              <div className={styles.metaItem}><span className={styles.label}>Telefone:</span> <span className={styles.muted}>{order.telefone_cliente || order.usuario?.telefone || '—'}</span></div>
              <div className={styles.metaItem}><span className={styles.label}>Endereço:</span> <span className={styles.muted}>{order.endereco ? `${order.endereco.rua}, ${order.endereco.numero}${order.endereco.complemento ? ' • ' + order.endereco.complemento : ''} — ${order.endereco.bairro}${order.endereco.cidade ? ', ' + order.endereco.cidade : ''}${order.endereco.cep ? ' • CEP: ' + order.endereco.cep : ''}` : (order.Endereco_id ? `ID ${order.Endereco_id}` : '—')}</span></div>
              <div className={styles.metaItem}><span className={styles.label}>Data & Hora entrega:</span> <span className={styles.muted}>{formatDateTime(order.data_entrega, order.hora_entrega)}</span></div>
            </div>
          </div>
          <div className={styles.rightColumn}>
            <div className={styles.status}><span className={styles.label}>Status:</span> {displayStatus(order.status as string | null)}</div>
            <div><span className={styles.label}>Pedido em:</span> <span className={styles.muted}>{formatDateTime(order.data_pedido, order.hora_pedido)}</span></div>
            <div><span className={styles.label}>Cobrar no endereço:</span> <span className={styles.muted}>{((order.cobrar_no_endereco === 1) || (order.cobrar_no_endereco === '1') || (order.cobrar_no_endereco === true)) ? 'Sim' : 'Não'}</span></div>
            <div><span className={styles.label}>Vem retirar:</span> <span className={styles.muted}>{((order.vem_retirar === 1) || (order.vem_retirar === '1') || (order.vem_retirar === true)) ? 'Sim' : 'Não'}</span></div>
          </div>
        </div>

        <div className={styles.productList}>
          <strong>Produtos:</strong>
          <ul>
            {unique.map((it: AnyObj, idx: number) => {
              const imageUrl = (it['imagem_url'] as string | undefined) || (it['imagem'] as string | undefined) || (it['imagemUrl'] as string | undefined);
              const firstImage = imageUrl ? imageUrl.split(',')[0].trim() : '';
              return (
              <li key={idx} className={styles.productItem}>
                {firstImage ? (
                  <SmartImage src={firstImage} alt={(it['nome'] as string | undefined) ?? ''} width={80} height={80} className={styles.productImg} style={{ objectFit: 'cover' }} />
                ) : (
                  <div className={styles.productImg}>Img</div>
                )}
                <div className={styles.productInfo}>
                  <div className={styles.productTitle}>{(it['nome'] as string | undefined) ?? ''}</div>
                  <div className={styles.productDesc}>{((it['descricao'] as string | undefined) || (it['categoria'] as string | undefined)) ? `${(it['descricao'] as string | undefined) || ''}` : ''}</div>
                </div>
                <div className={styles.productQuantityPrice}>
                  <div>{(it['quantidade'] as number | undefined) ? `x ${(it['quantidade'] as number).toString()}` : ''}</div>
                  <div style={{ fontWeight: 600 }}>{(it['preco'] as number | undefined) ? `R$ ${Number(it['preco']).toFixed(2)}` : ''}</div>
                </div>
              </li>
              );
            })}
          </ul>
        </div>

        <div style={{ marginTop: 12 }}>
          <strong>Observação:</strong>
          <div style={{ marginTop: 8 }}>
            {order.observacao ? (() => {
              try {
                const parsed = typeof order.observacao === 'string' ? JSON.parse(order.observacao) : order.observacao;
                return <pre className={styles.obsPre}>{JSON.stringify(parsed, null, 2)}</pre>;
              } catch {
                return <div style={{ whiteSpace: 'pre-wrap' }}>{String(order.observacao)}</div>;
              }
            })() : <div>—</div>}
          </div>
        </div>

        <div className={styles.actions}>
          <button className={styles.secondaryBtn} onClick={() => router.back()}>Voltar</button>
        </div>
      </div>
    </div>
  );
}
