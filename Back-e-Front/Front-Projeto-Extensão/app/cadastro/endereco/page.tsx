"use client";
import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from '../../../styles/ProductOrder.module.css';
import { createAddress, AddressDto } from '../../../services/addressService';
import { getCurrentUser, User } from '../../../services/authService';

function CadastroEnderecoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo') || '/';
  const [rua, setRua] = useState('');
  const [numero, setNumero] = useState('');
  const [bairro, setBairro] = useState('');
  const [cep, setCep] = useState('');
  const [cidade, setCidade] = useState('');
  const [complemento, setComplemento] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // obter usuário atual a partir do helper centralizado
    const usuario = getCurrentUser() as User | null;
    const dto: AddressDto = {
      rua, numero, bairro, cep, cidade, complemento,
      Usuario_id: (typeof usuario?.id === 'number' && usuario.id > 0) ? usuario.id : null,
    };
  console.debug('[CadastroEnderecoPage] getCurrentUser ->', usuario);
  console.debug('[CadastroEnderecoPage] localStorage.usuario raw ->', typeof window !== 'undefined' ? localStorage.getItem('usuario') : null);
    setLoading(true);
    try {
      await createAddress(dto);
        setMessage('Endereço criado com sucesso');
      setTimeout(() => router.push(returnTo), 1200);
  } catch (err: unknown) {
  console.error('createAddress error', err);
  const msg = (err instanceof Error) ? err.message : String(err);
  setMessage(msg || 'Erro ao criar endereço');
    } finally { setLoading(false); }
  }

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <h1 className={styles.heading}>Cadastrar endereço</h1>
        <form onSubmit={handleSubmit} className={styles.form}>
        <label>Rua</label>
        <input className={styles.input} value={rua} onChange={e => setRua(e.target.value)} required />
        <label>Número</label>
        <input className={styles.input} value={numero} onChange={e => setNumero(e.target.value)} required />
        <label>Bairro</label>
        <input className={styles.input} value={bairro} onChange={e => setBairro(e.target.value)} required />
        <label>CEP</label>
        <input className={styles.input} value={cep} onChange={e => setCep(e.target.value)} required />
        <label>Cidade</label>
        <input className={styles.input} value={cidade} onChange={e => setCidade(e.target.value)} required />
        <label>Complemento</label>
        <input className={styles.input} value={complemento} onChange={e => setComplemento(e.target.value)} />
        <div className={styles.actions}>
          <button type="submit" className={styles.primaryBtn} disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</button>
          <button type="button" className={styles.secondaryBtn} onClick={() => router.back()}>Cancelar</button>
        </div>
        {message && <div style={{ marginTop: 8 }}>{message}</div>}
      </form>
      </div>
    </div>
  );
}

export default function CadastroEnderecoPage() {
  return (
    <Suspense fallback={<div className={styles.container}><div className={styles.wrapper}>Carregando...</div></div>}>
      <CadastroEnderecoContent />
    </Suspense>
  );
}
