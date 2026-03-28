"use client";
import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { fetchProductById, Product } from '../../../../services/productService';
import { fetchAddresses, AddressDto } from '../../../../services/addressService';
import { fetchPhones } from '../../../../services/phoneService';
import { getCurrentUser, User } from '../../../../services/authService';
import { createOrder, CreateOrderDto } from '../../../../services/orderService';
import styles from '../../../../styles/ProductOrder.module.css';
import Breadcrumb from '../../../../components/Breadcrumb';
import SmartImage from '../../../../components/SmartImage';
import { showSuccess, showError, showValidationError, showLoginRequired } from '../../../../utils/sweetAlert';

export default function ProductOrderPage() {
  const params = useParams();
  const id = Number(params?.id);
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [addresses, setAddresses] = useState<AddressDto[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<number | null>(null);
  const [nomeCliente, setNomeCliente] = useState('');
  const [nomeDestinatario, setNomeDestinatario] = useState('');
  const [dataEntrega, setDataEntrega] = useState('');
  const [horaEntrega, setHoraEntrega] = useState('');
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [cobrarNoEndereco, _setCobrarNoEndereco] = useState(false);
  const [vemRetirar, setVemRetirar] = useState(false);
  const [observacao, setObservacao] = useState('');
  const [orderQuantity, setOrderQuantity] = useState<number>(1);
  const [hasUsuarioTelefone, setHasUsuarioTelefone] = useState<boolean | null>(null);

  useEffect(() => {
    fetchProductById(id).then(p => { setProduct(p); setLoading(false); });
    
    // Restaurar dados salvos do localStorage
    try {
      const saved = localStorage.getItem(`pedido_direto_form_${id}`);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.nomeCliente) setNomeCliente(data.nomeCliente);
        if (data.nomeDestinatario) setNomeDestinatario(data.nomeDestinatario);
        if (data.dataEntrega) setDataEntrega(data.dataEntrega);
        if (data.horaEntrega) setHoraEntrega(data.horaEntrega);
        if (data.observacao) setObservacao(data.observacao);
        if (data.selectedAddress) setSelectedAddress(data.selectedAddress);
        if (data.orderQuantity) setOrderQuantity(data.orderQuantity);
        if (data.vemRetirar !== undefined) setVemRetirar(data.vemRetirar);
      }
    } catch { /* ignore */ }
    
    (async () => {
      const usuario = getCurrentUser() as User;
      const all = await fetchAddresses();
      if (usuario && usuario.id) {
        const my = (all || []).filter((a) => a.Usuario_id === usuario.id);
        setAddresses(my);
        // prefills com os dados do usuário logado quando disponíveis
        const saved = localStorage.getItem(`pedido_direto_form_${id}`);
        let hasAddressSaved = false;
        if (saved) {
          const data = JSON.parse(saved);
          if (data.nomeCliente) setNomeCliente(data.nomeCliente);
          if (data.selectedAddress) {
            hasAddressSaved = true;
          }
        } else if (usuario.nome) setNomeCliente(usuario.nome);
        
        // Se houver apenas 1 endereço e não houver endereço salvo, seleciona automaticamente
        if (my.length === 1 && !hasAddressSaved) {
          setSelectedAddress(my[0].id || null);
        }
        
        try {
          const phones = await fetchPhones();
          setHasUsuarioTelefone(Array.isArray(phones) && phones.length > 0 ? true : !!(usuario as any)?.telefone);
        } catch { setHasUsuarioTelefone(!!(usuario as any)?.telefone); }
      } else {
        setAddresses([]);
        setHasUsuarioTelefone(false);
      }
      // no phone select anymore; telefone comes from usuario.telefone when needed
    })();
    // revalidar ao retornar do cadastro pelo foco da aba
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
  }, [id]);

  // phone selection removed

  async function handlePedido(e: React.FormEvent) {
    e.preventDefault();
  const usuario = getCurrentUser() || ({ id: 0, nome: '', telefone: '' } as User);
  console.debug('[ProductOrderPage] getCurrentUser ->', usuario);
  console.debug('[ProductOrderPage] localStorage.usuario raw ->', typeof window !== 'undefined' ? localStorage.getItem('usuario') : null);
    // prepare product item early so validation can check it
    const prodItem = product ? {
      id: product.id,
      nome: product.nome,
      preco: product.preco,
      quantidade: orderQuantity || 1,
      imagem_url: product.imagem_url ? product.imagem_url.split(',')[0].trim() : null,
    } : null;
    
    // Se vem retirar e não tem endereço selecionado, selecionar o primeiro disponível
    let enderecoFinal = selectedAddress;
    if (vemRetirar && !enderecoFinal && addresses.length > 0) {
      enderecoFinal = addresses[0].id || null;
    }
    
    if (!vemRetirar && !enderecoFinal) {
      setErrors(prev => ({ ...prev, selectedAddress: true }));
      showValidationError('Selecione um endereço');
      return;
    }
    
    if (vemRetirar && !enderecoFinal) {
      showValidationError('Você precisa ter pelo menos um endereço cadastrado para continuar.');
      return;
    }
    
    const missing: string[] = [];
    // require logged in user
    if (!usuario || !usuario.id) {
      const goToLogin = await showLoginRequired();
      if (goToLogin) router.push('/login');
      return;
    }
    if (!nomeCliente || !nomeCliente.trim()) missing.push('nomeCliente');
  // telefone field removed from order form
    if (!nomeDestinatario || !nomeDestinatario.trim()) missing.push('nomeDestinatario');
    if (!dataEntrega) missing.push('dataEntrega');
    if (!horaEntrega) missing.push('horaEntrega');
    if (hasUsuarioTelefone === false) {
      showValidationError('Para finalizar o pedido, cadastre um telefone de contato.');
      return;
    }
    if (missing.length > 0) {
      const errObj: Record<string, boolean> = {};
      missing.forEach(m => { errObj[m] = true; });
      setErrors(prev => ({ ...prev, ...errObj }));
      showValidationError('Preencha os campos obrigatórios');
      return;
    }
    // ensure prodItem present
    if (!prodItem) { showValidationError('Produto inválido'); return; }
    // validate delivery date/time if provided
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
    // quando o pedido é feito diretamente da página do produto, vamos
    // serializar as informações do produto dentro do campo `carrinho` (campo novo no DB)
    // e deixar `observacao` apenas para a nota textual.
  const carrinhoPayload = prodItem ? { cart: [prodItem] } : {} as Record<string, unknown>;
    if (observacao && typeof observacao === 'string' && observacao.trim().length > 0) carrinhoPayload.nota = observacao;

    const dto = {
      nome_destinatario: nomeDestinatario,
      data_entrega: dataEntrega || undefined,
      hora_entrega: horaEntrega || undefined,
      nome_cliente: nomeCliente || usuario.nome || '',
      telefone_cliente: (usuario as any)?.telefone || undefined,
      // não enviar telefone do usuário automaticamente quando o campo do pedido for deixado em branco
  // telefone_cliente removed: we will not send telefone in the order payload
  // armazenamos o carrinho como string no novo campo `carrinho`; observacao permanece apenas texto
  carrinho: Object.keys(carrinhoPayload).length ? JSON.stringify(carrinhoPayload) : undefined,
  observacao: observacao && observacao.trim().length ? observacao : undefined,
      cobrar_no_endereco: cobrarNoEndereco,
      vem_retirar: vemRetirar,
      Endereco_id: enderecoFinal!,
      Usuario_id: (typeof usuario?.id === 'number' && usuario.id > 0) ? usuario.id : null,
    };
    try {
      console.debug('[ProductOrderPage] createOrder DTO ->', dto);
      await createOrder(dto as CreateOrderDto);
      // Limpar dados salvos do localStorage
      try {
        localStorage.removeItem(`pedido_direto_form_${id}`);
      } catch { /* ignore */ }
      await showSuccess('Pedido criado com sucesso!');
      router.push('/');
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      showError('Erro ao criar pedido: ' + msg);
    }
  }

  if (loading) return <div className={styles.container}><div className={styles.wrapper}>Carregando...</div></div>;
  if (!product) return <div className={styles.container}><div className={styles.wrapper}>Produto não encontrado</div></div>;

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <Breadcrumb 
          items={[
            { label: 'Página inicial', href: '/' },
            { label: 'Finalizar pedido' }
          ]}
        />
        <h1 className={styles.heading}>Fazer pedido — {product.nome}</h1>
        <div className={styles.card}>
        {product.imagem_url ? (
          <SmartImage src={product.imagem_url.split(',')[0].trim()} alt={product.nome} className={styles.image} width={400} height={400} style={{ objectFit: 'cover' }} />
        ) : (
          <div className={styles.image}>Img</div>
        )}
        <div className={styles.info}>
          <p className={styles.price}>R${Number(product.preco).toFixed(2)}</p>
          <form onSubmit={handlePedido} className={styles.form}>
            <label>Nome</label>
            <input className={`${styles.input} ${errors.nomeCliente ? styles.invalid : ''}`} value={nomeCliente} onChange={e => { setNomeCliente(e.target.value); setErrors(prev => ({ ...prev, nomeCliente: false })); }} placeholder="Seu nome" />
            {/* telefone removed from form */}

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
                      orderQuantity,
                      vemRetirar,
                    };
                    localStorage.setItem(`pedido_direto_form_${id}`, JSON.stringify(formData));
                  } catch { /* ignore */ }
                  router.push(`/cadastro/telefone/novo?returnTo=/product/${id}/pedido`);
                }}>
                  Adicionar telefone
                </button>
              </div>
            )}

            {!vemRetirar && (
              <>
                <label>Endereço</label>
                <select className={`${styles.select} ${errors.selectedAddress ? styles.invalid : ''}`} value={selectedAddress || ''} onChange={e => { setSelectedAddress(Number(e.target.value)); setErrors(prev => ({ ...prev, selectedAddress: false })); }}>
                  <option value="">Selecione</option>
                  {addresses.map(a => (
                    <option key={a.id} value={a.id}>{`${a.rua}, ${a.numero} - ${a.bairro}`}</option>
                  ))}
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
                        orderQuantity,
                        vemRetirar,
                      };
                      localStorage.setItem(`pedido_direto_form_${id}`, JSON.stringify(formData));
                    } catch { /* ignore */ }
                    router.push(`/cadastro/endereco?returnTo=/product/${id}/pedido`);
                  }}>
                    + Adicionar endereço
                  </button>
                </div>
              </>
            )}

            <label>Quem vai receber?</label>
            <input className={`${styles.input} ${errors.nomeDestinatario ? styles.invalid : ''}`} value={nomeDestinatario} onChange={e => { setNomeDestinatario(e.target.value); setErrors(prev => ({ ...prev, nomeDestinatario: false })); }} placeholder="Nome do destinatário (se diferente)" />

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
                if (newValue) _setCobrarNoEndereco(false);
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
                onClick={() => _setCobrarNoEndereco(!cobrarNoEndereco)}
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

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
              <label style={{ fontSize: 14 }}>Quantidade</label>
              <input type="number" min={1} value={orderQuantity} onChange={e => setOrderQuantity(Number(e.target.value) || 1)} className={styles.input} style={{ width: 90 }} />
              <div style={{ marginLeft: "auto", }}>Total: R${Number((product?.preco || 0) * orderQuantity).toFixed(2)}</div>
            </div>
              
            <div className={styles.actions} style={{ justifyContent: 'flex-end', gap: 12 }}>
              {hasUsuarioTelefone !== false && (
                <button type="submit" className={styles.primaryBtn}>Confirmar pedido</button>
              )}
              <button type="button" onClick={() => router.back()} className={styles.secondaryBtn}>Voltar</button>
            </div>

          </form>
        </div>
      </div>
      </div>
    </div>
  );
}
