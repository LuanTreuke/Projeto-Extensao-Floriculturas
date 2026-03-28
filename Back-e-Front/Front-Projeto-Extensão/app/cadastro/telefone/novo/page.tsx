"use client";
import React, { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../../../../styles/CadastroWhatsApp.module.css';
import { getCurrentUser, User } from '../../../../services/authService';
import api from '../../../../services/api';

export default function CadastroTelefoneNovoPage() {
  const router = useRouter();
  const [returnTo, setReturnTo] = useState<string | null>(null);

  // prefer an explicit returnTo query param; if absent, fall back to history.back()
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const p = new URLSearchParams(window.location.search);
        setReturnTo(p.get('returnTo'));
      }
    } catch {
      setReturnTo(null);
    }
  }, []);

  const usuario = getCurrentUser() as User | null;

  // company WhatsApp number (provided)
  const companyNumber = '554235242223';

  // default message — user can copy/open the prefilled message link
  const [token, setToken] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const defaultMessage = useMemo(() => {
    const emailPart = usuario?.email ? ` (usuário: ${usuario.email})` : '';
    return `Olá, quero verificar meu telefone para vincular à minha conta${emailPart}`;
  }, [usuario]);

  // Generate token on demand when user clicks the button instead of automatically on load
  async function generateToken() {
    setGenerating(true);
    setError(null);

    try {
      const usuarioId = typeof usuario?.id === 'number' ? usuario.id : null;
      if (!usuarioId) {
        setError('Sessão inválida. Faça login novamente para validar seu WhatsApp.');
        return;
      }

      const payload: { usuarioId: number; telefone?: string } = { usuarioId };
      if (usuario?.telefone) payload.telefone = String(usuario.telefone);

      const res = await api.post('/verificacao', payload);
      const json = res.data;
      if (json && json.token) setToken(json.token);
      else setError('Resposta inválida do servidor');
    } catch (err: unknown) {
      console.warn('Could not create verification token', err);
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || 'Erro ao criar token');
    } finally {
      setGenerating(false);
    }
  }

  const encoded = encodeURIComponent(`${defaultMessage} TOKEN:${token ?? ''}`);
  const waLink = `https://wa.me/${companyNumber}?text=${encoded}`;

  function handleOpen() {
    // open in new tab and navigate back to returnTo in current tab
    try {
      window.open(waLink, '_blank');
    } catch {
      // ignore
    }

    // mark that we should check phone status after returning from WhatsApp
    try {
      if (typeof window !== 'undefined') localStorage.setItem('check_phone_after_whatsapp', '1');
    } catch {}

    // wait 3 seconds to give the user time to switch to WhatsApp and send the message
    setTimeout(() => {
      // If the caller explicitly requested a returnTo URL, pass it to the confirmation page.
      // Otherwise go to the cadastro flow page so they continue signup.
      if (returnTo && returnTo.trim().length > 0) {
        router.push(`/cadastro/telefone?returnTo=${encodeURIComponent(returnTo)}`);
      } else {
        router.push('/cadastro/telefone');
      }
    }, 3000);
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>Cadastrar WhatsApp</h1>

      <div className={styles.instructionsBox}>
        <h2 className={styles.instructionsTitle}>Siga estes 4 passos simples:</h2>

        <div className={styles.stepContainer}>
          <div className={styles.stepRow}>
            <div className={styles.stepNumber}>1</div>
            <div className={styles.stepContent}>
              <h3>Clique no botão verde abaixo</h3>
              <p>O botão irá gerar um link especial para você</p>
            </div>
          </div>
        </div>

        <div className={styles.stepContainer}>
          <div className={styles.stepRow}>
            <div className={styles.stepNumber}>2</div>
            <div className={styles.stepContent}>
              <h3>Clique novamente para abrir o WhatsApp</h3>
              <p>
                Após gerar o link, o botão mudará. Clique nele de novo para abrir o WhatsApp no
                seu celular ou computador
              </p>
            </div>
          </div>
        </div>

        <div className={styles.stepContainer}>
          <div className={styles.stepRow}>
            <div className={styles.stepNumber}>3</div>
            <div className={styles.stepContent}>
              <h3>Envie a mensagem</h3>
              <p>
                No WhatsApp, uma mensagem já estará pronta. <strong>Basta clicar no botão de enviar</strong>.
              </p>
            </div>
          </div>
        </div>

        <div className={styles.stepContainer}>
          <div className={styles.stepRow}>
            <div className={styles.stepNumber}>4</div>
            <div className={styles.stepContent}>
              <h3>Retorne à esta página</h3>
              <p>Depois de enviar a mensagem no whatsapp, retorne à esta página para concluir o cadastro.</p>
            </div>
          </div>
        </div>

        <div className={styles.importantBox}>
          <p>
            <strong>💡 Importante:</strong> Não edite a mensagem, apenas envie para o número da
            floricultura: <strong>+55 42 3524-2223</strong>
          </p>
        </div>
      </div>

      <div className={styles.buttonContainer}>
        <button
          type="button"
          className={styles.primaryBtn}
          onClick={async () => {
            if (!token) await generateToken();
            else handleOpen();
          }}
          disabled={generating}
        >
          {generating ? '⏳ Gerando...' : token ? '✅ Abrir WhatsApp' : '🔗 Começar'}
        </button>
        <button type="button" className={styles.secondaryBtn} onClick={() => router.push('/')}>
          Voltar
        </button>
      </div>

      {error && <div className={styles.errorBox}>❌ Erro: {error}</div>}

      {token && (
        <div className={styles.successBox}>
          ✅ Link gerado! Agora clique no botão verde acima para abrir o WhatsApp
        </div>
      )}
    </div>
  );
}
