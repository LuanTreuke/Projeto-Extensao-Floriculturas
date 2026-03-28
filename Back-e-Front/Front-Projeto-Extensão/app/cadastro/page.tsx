"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../../styles/Login.module.css';
import { cadastro, login } from '../../services/authService';
import { getCartFromServer } from '../../services/cartService';
import BackButton from '../../components/BackButton';

export default function CadastroPage() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [senha, setSenha] = useState('');
  const [senha2, setSenha2] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (senha !== senha2) {
      setError('As senhas não coincidem');
      return;
    }

    const res = await cadastro({ nome, email, senha, telefone });
    if (!res.success) {
      setError(res.message || 'Erro ao cadastrar');
      return;
    }

    // Após cadastrar, efetuar login automático para persistir sessão/usuario.
    try {
      try {
        const resLogin = await login(email, senha);
        const data =
          resLogin && typeof resLogin === 'object'
            ? (resLogin as Record<string, unknown>)
            : null;
        const loginSuccess = Boolean(data && data.success);
        if (!loginSuccess) {
          throw new Error(String(data?.message ?? 'Falha no login automático'));
        }

        const uCandidate = data ? data.usuario ?? data.user ?? data : null;
        const uObj =
          uCandidate && typeof uCandidate === 'object'
            ? (uCandidate as Record<string, unknown>)
            : null;
        const hasId = typeof uObj?.id === 'number';
        if (uObj && hasId && typeof window !== 'undefined') {
          localStorage.setItem('usuario', JSON.stringify(uObj));
        } else {
          throw new Error('Usuário inválido no login automático');
        }
      } catch (err) {
        console.warn('post-cadastro login/localStorage failed', err);
      }

      try {
        await getCartFromServer();
      } catch (e) {
        console.warn('refresh server cart failed', e);
      }
      try {
        localStorage.removeItem('floricultura_cart_v1');
      } catch {}
      try {
        window.dispatchEvent(new Event('cart-updated'));
      } catch {}
    } catch (err) {
      // Se o login automático falhar, apenas prosseguir para a tela de telefone.
      console.warn('login automático após cadastro falhou', err);
    }

    setSuccess('Cadastro realizado com sucesso!');
    setTimeout(() => router.push('/cadastro/telefone'), 1500);
  }

  return (
    <div className={styles.container}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <BackButton />
        <h2>Cadastro</h2>
        <input
          type="text"
          placeholder="Nome completo"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Confirmar senha"
          value={senha2}
          onChange={(e) => setSenha2(e.target.value)}
          required
        />
        {error && <span className={styles.error}>{error}</span>}
        {success && <span className={styles.success}>{success}</span>}
        <button type="submit">Avançar</button>
      </form>
    </div>
  );
}
