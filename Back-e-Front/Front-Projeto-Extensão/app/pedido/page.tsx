"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../../styles/ProductOrder.module.css';
import { getCart, clearCart, cartTotal, CartItem } from '../../services/cartService';
import { fetchAddresses, AddressDto } from '../../services/addressService';
import { fetchPhones } from '../../services/phoneService';
import { getCurrentUser, User } from '../../services/authService';
import { createOrder } from '../../services/orderService';
import BackButton from '../../components/BackButton';
import Breadcrumb from '../../components/Breadcrumb';
import SmartImage from '../../components/SmartImage';
import { showSuccess, showError, showValidationError, showLoginRequired } from '../../utils/sweetAlert';

export default function UnifiedOrderPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [addresses, setAddresses] = useState<AddressDto[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<number | null>(null);
  const [nomeCliente, setNomeCliente] = useState('');
  const [hasUsuarioTelefone, setHasUsuarioTelefone] = useState<boolean | null>(null);
  const [nomeDestinatario, setNomeDestinatario] = useState('');
  const [dataEntrega, setDataEntrega] = useState('');
  const [horaEntrega, setHoraEntrega] = useState('');
  const [observacao, setObservacao] = useState('');
  const [cobrarNoEndereco, setCobrarNoEndereco] = useState(false);
  const [vemRetirar, setVemRetirar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const c = getCart();
    setItems(c);
    // compute total only on client after mount to avoid SSR/client mismatch
  try { setTotal(cartTotal()); } catch { setTotal(0); }
    const usuario = getCurrentUser() as User;
    if (usuario) {
      setNomeCliente(usuario.nome || '');
      // não definir hasUsuarioTelefone aqui para evitar piscar; aguardar checagem do servidor
    }
    
    // Restaurar dados salvos do localStorage
    try {
      const saved = localStorage.getItem('pedido_carrinho_form');
      if (saved) {
        const data = JSON.parse(saved);
        if (data.nomeCliente) setNomeCliente(data.nomeCliente);
        if (data.nomeDestinatario) setNomeDestinatario(data.nomeDestinatario);
        if (data.dataEntrega) setDataEntrega(data.dataEntrega);
        if (data.horaEntrega) setHoraEntrega(data.horaEntrega);
        if (data.vemRetirar !== undefined) setVemRetirar(data.vemRetirar);
        if (data.observacao) setObservacao(data.observacao);
        if (data.selectedAddress) setSelectedAddress(data.selectedAddress);
      }
    } catch { /* ignore */ }
    
    (async () => {
      const all = await fetchAddresses();
      const my = (all || []).filter((a) => a.Usuario_id === (usuario && usuario.id));
      setAddresses(my);
      try {
        const saved = localStorage.getItem('pedido_carrinho_form');
        if (saved) {
          const data = JSON.parse(saved);
          if (data.selectedAddress) setSelectedAddress(data.selectedAddress);
        } else {
          const pref = localStorage.getItem('checkout_selected_address');
          if (pref) setSelectedAddress(Number(pref));
          // Se houver apenas 1 endereço, seleciona automaticamente
          else if (my.length === 1) setSelectedAddress(my[0].id || null);
        }
      } catch { 
        // Se houver apenas 1 endereço, seleciona automaticamente
        if (my.length === 1) setSelectedAddress(my[0].id || null);
      }
      // checar telefone no servidor (não depender apenas do localStorage)
      try {
        const phones = await fetchPhones();
        setHasUsuarioTelefone(Array.isArray(phones) && phones.length > 0 ? true : !!(usuario as any)?.telefone);
      } catch { /* ignore */ }
    })();
    // revalidar ao voltar o foco para a aba (após cadastro de telefone)
    const onFocus = async () => {
      try {
        const phones = await fetchPhones();
        setHasUsuarioTelefone(Array.isArray(phones) && phones.length > 0);
      } catch { /* ignore */ }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', onFocus);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') onFocus();
      });
    }
    return () => {
      if (typeof window !== 'undefined') window.removeEventListener('focus', onFocus);
    };
  }, []);

  // phone selection removed

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) return showValidationError('Carrinho vazio');
    
    // Se vem retirar e não tem endereço selecionado, selecionar o primeiro disponível
    let enderecoFinal = selectedAddress;
    if (vemRetirar && !enderecoFinal && addresses.length > 0) {
      enderecoFinal = addresses[0].id || null;
    }
    
    if (!vemRetirar && !enderecoFinal) {
      setErrors(prev => ({ ...prev, selectedAddress: true }));
      return showValidationError('Selecione um endereço');
    }
    
    if (vemRetirar && !enderecoFinal) {
      showValidationError('Você precisa ter pelo menos um endereço cadastrado para continuar.');
      return;
    }
    const usuario = getCurrentUser() as User;
    if (!usuario || !usuario.id) {
      const goToLogin = await showLoginRequired();
      if (goToLogin) router.push('/login');
      return;
    }

  // validate delivery date/time: if a delivery date is selected, the combined
    // date+time must not be before the current datetime.
    if (dataEntrega) {
      try {
        let timePart = (horaEntrega && horaEntrega.trim().length) ? horaEntrega.trim() : '23:59';
        if (timePart.length === 5) timePart = timePart + ':00';
        const delivery = new Date(`${dataEntrega}T${timePart}`);
        if (isNaN(delivery.getTime())) {
          showError('Data ou hora de entrega inválida');
          return;
        }
        const now = new Date();
        if (delivery.getTime() < now.getTime()) {
          showError('A data e hora de entrega não podem ser anteriores à data/hora atual');
          return;
        }
      } catch {
        showError('Erro ao validar data/hora de entrega');
        return;
      }
    }

    setLoading(true);
  // validate required fields (all except observacao)
  const missing: string[] = [];
  if (!nomeCliente || !nomeCliente.trim()) missing.push('nomeCliente');
  if (!nomeDestinatario || !nomeDestinatario.trim()) missing.push('nomeDestinatario');
  if (!dataEntrega) missing.push('dataEntrega');
  if (!horaEntrega) missing.push('horaEntrega');
  if (hasUsuarioTelefone === false) {
    showValidationError('Para finalizar o pedido, cadastre um telefone de contato.');
    setLoading(false);
    return;
  }
  if (missing.length > 0) {
    const errObj: Record<string, boolean> = {};
    missing.forEach(m => { errObj[m] = true; });
    setErrors(prev => ({ ...prev, ...errObj }));
    showValidationError('Preencha os campos obrigatórios');
    setLoading(false);
    return;
  }
  // ensure cart not empty
  if (!items || items.length === 0) { showValidationError('Carrinho vazio'); setLoading(false); return; }
    try {
      // preparar payload do carrinho e enviar para o campo `carrinho` (string JSON)
      const cartPayload = items.map(i => ({ id: i.id, nome: i.nome, preco: i.preco, quantidade: i.quantidade, imagem_url: i.imagem_url }));
      const carrinhoObj = { cart: cartPayload } as Record<string, unknown>;
      if (observacao && typeof observacao === 'string' && observacao.trim().length > 0) carrinhoObj.nota = observacao;

      const dto = {
        carrinho: JSON.stringify(carrinhoObj),
        observacao: observacao || undefined,
        Endereco_id: enderecoFinal!,
        Usuario_id: usuario.id,
        nome_cliente: nomeCliente || usuario.nome || '',
        telefone_cliente: (usuario as any)?.telefone || undefined,
        data_entrega: dataEntrega || undefined,
        hora_entrega: horaEntrega || undefined,
        nome_destinatario: nomeDestinatario || undefined,
        cobrar_no_endereco: cobrarNoEndereco || false,
        vem_retirar: vemRetirar || false,
      };
  console.debug('[UnifiedOrderPage] createOrder DTO ->', dto);
  await createOrder(dto);
      clearCart();
      setItems([]);
      // Limpar dados salvos do localStorage
      try {
        localStorage.removeItem('pedido_carrinho_form');
      } catch { /* ignore */ }
      await showSuccess('Pedido criado com sucesso!');
      router.push('/');
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : String(e);
      showError('Erro ao criar pedido: ' + msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <BackButton />
        <Breadcrumb 
          items={[
            { label: 'Página inicial', href: '/' },
            { label: 'Finalizar Pedido' }
          ]}
        />
        <h1 className={styles.heading } style={{ marginTop: 24, fontSize: 30 }}>Finalizar pedido</h1>
        <form onSubmit={handleSubmit} className={styles.form}>
        {!vemRetirar && (
          <>
            <label>Endereço</label>
            <select className={`${styles.select} ${errors.selectedAddress ? styles.invalid : ''}`} value={selectedAddress || ''} onChange={e => { setSelectedAddress(Number(e.target.value)); setErrors(prev => ({ ...prev, selectedAddress: false })); try { localStorage.setItem('checkout_selected_address', String(Number(e.target.value))); } catch {} }}>
              <option value="">Selecione</option>
              {addresses.map(a => <option key={a.id} value={a.id}>{`${a.rua}, ${a.numero} - ${a.bairro}`}</option>)}
            </select>

            <div style={{ marginTop: 8 }}>
              <button type="button" className={styles.primaryBtn} onClick={() => {
                // Salvar dados do formulário no localStorage
                try {
                  const formData = {
                    nomeCliente,
                    nomeDestinatario,
                    dataEntrega,
                    horaEntrega,
                    observacao,
                    selectedAddress,
                    vemRetirar,
                  };
                  localStorage.setItem('pedido_carrinho_form', JSON.stringify(formData));
                } catch { /* ignore */ }
                router.push('/cadastro/endereco?returnTo=/pedido');
              }}>
                + Adicionar endereço
              </button>
            </div>
          </>
        )}

        <label>Nome</label>
        <input className={`${styles.input} ${errors.nomeCliente ? styles.invalid : ''}`} value={nomeCliente} onChange={e => { setNomeCliente(e.target.value); setErrors(prev => ({ ...prev, nomeCliente: false })); }} />

        {/* Aviso de telefone ausente */}
        {hasUsuarioTelefone === false && (
          <div style={{ background: '#fffaf0', border: '1px solid #ffe4a3', padding: 10, borderRadius: 8, color: '#7a4b00' }}>
            <div style={{ marginBottom: 6 }}>Você ainda não tem um telefone cadastrado. Cadastre para prosseguir.</div>
            <button type="button" className={styles.secondaryBtn} onClick={() => {
              // Salvar dados do formulário no localStorage
              try {
                const formData = {
                  nomeCliente,
                  nomeDestinatario,
                  dataEntrega,
                  horaEntrega,
                  observacao,
                  selectedAddress,
                  vemRetirar,
                };
                localStorage.setItem('pedido_carrinho_form', JSON.stringify(formData));
              } catch { /* ignore */ }
              router.push('/cadastro/telefone/novo?returnTo=/pedido');
            }}>
              Adicionar telefone
            </button>
          </div>
        )}

        <label>Quem vai receber?</label>
        <input placeholder="Nome do destinatário (se diferente)" className={`${styles.input} ${errors.nomeDestinatario ? styles.invalid : ''}`} value={nomeDestinatario} onChange={e => { setNomeDestinatario(e.target.value); setErrors(prev => ({ ...prev, nomeDestinatario: false })); }} />

        <label 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 8, 
            marginTop: 8,
            cursor: 'pointer',
            userSelect: 'none'
          }}
          onClick={() => {
            const newValue = !vemRetirar;
            setVemRetirar(newValue);
            if (newValue) setCobrarNoEndereco(false);
          }}
        >
          <div
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '4px',
              border: '2px solid #2e7d32',
              backgroundColor: vemRetirar ? '#2e7d32' : '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'all 0.2s'
            }}
          >
            {vemRetirar && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            )}
          </div>
          <span>Vou retirar na loja</span>
        </label>

        <div style={{ display: 'flex', gap: 16, width: '100%', marginTop: 12 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <label className={styles.deliveryLabel}>{vemRetirar ? 'Data de retirada' : 'Data de entrega'}</label>
            <input type="date" className={`${styles.input} ${errors.dataEntrega ? styles.invalid : ''}`} value={dataEntrega} onChange={e => { setDataEntrega(e.target.value); setErrors(prev => ({ ...prev, dataEntrega: false })); }} placeholder="dd/mm/aaaa" />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <label className={styles.deliveryLabel}>{vemRetirar ? 'Hora de retirada' : 'Hora de entrega'}</label>
            <input type="time" className={`${styles.input} ${errors.horaEntrega ? styles.invalid : ''}`} value={horaEntrega} onChange={e => { setHoraEntrega(e.target.value); setErrors(prev => ({ ...prev, horaEntrega: false })); }} placeholder="--:--" />
          </div>
        </div>

        {!vemRetirar && (
          <label 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8, 
              marginTop: 8,
              cursor: 'pointer',
              userSelect: 'none'
            }}
            onClick={() => setCobrarNoEndereco(!cobrarNoEndereco)}
          >
            <div
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '4px',
                border: '2px solid #2e7d32',
                backgroundColor: cobrarNoEndereco ? '#2e7d32' : '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.2s'
              }}
            >
              {cobrarNoEndereco && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              )}
            </div>
            <span>Cobrar no endereço</span>
          </label>
        )}

        <label>Observação</label>
        <textarea className={styles.textarea} value={observacao} onChange={e => setObservacao(e.target.value)} rows={4} />

        {hasUsuarioTelefone !== false && (
          <div style={{ marginTop: 12 }}>
            <button type="submit" className={styles.primaryBtn} disabled={loading}>Confirmar pedido ({items.length} itens) - Total R$ {Number(total).toFixed(2)}</button>
          </div>
        )}
      </form>

      <div style={{ marginTop: 20 }}>
        <h3>Itens no pedido</h3>
        {items.map(it => (
          <div key={it.id} style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8 }}>
            {it.imagem_url ? (
              <SmartImage src={it.imagem_url.split(',')[0].trim()} alt={it.nome || ''} width={64} height={64} style={{ objectFit: 'cover', borderRadius: 8 }} />
            ) : (
              <div style={{ width: 64, height: 64, background: '#f3f3f3', borderRadius: 8 }} />
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{it.nome}</div>
              <div>R$ {Number(it.preco).toFixed(2)} x {it.quantidade}</div>
            </div>
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}
