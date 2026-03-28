"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../../../styles/Login.module.css';
import { fetchPhones, PhoneDto } from '../../../services/phoneService';
import BackButton from '../../../components/BackButton';

export default function CadastroPage() {
  const router = useRouter();
  const [returnTo, setReturnTo] = useState<string | null>(null);

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

  const [checking, setChecking] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [phones, setPhones] = useState<PhoneDto[]>([]);

  useEffect(() => {
    let mounted = true;
    async function checkNow() {
      setChecking(true);
      try {
        const ph = await fetchPhones();
        if (!mounted) return;
        setPhones(ph || []);
        if (ph && ph.length > 0) {
          setSuccessMessage('Número cadastrado com sucesso!');
          try { localStorage.removeItem('check_phone_after_whatsapp'); } catch {}
        }
      } catch (err) {
        console.warn('check phones failed', err);
      } finally {
        if (mounted) setChecking(false);
      }
    }

    // helper to start a short polling loop
    function startPollingIfFlag() {
      try {
        const flag = typeof window !== 'undefined' ? localStorage.getItem('check_phone_after_whatsapp') : null;
        if (flag) {
          // poll up to 12 times (every 1s) for phone to appear
          let attempts = 0;
          const iv = setInterval(async () => {
            attempts += 1;
            await checkNow();
            if ((typeof window !== 'undefined' && !localStorage.getItem('check_phone_after_whatsapp')) || attempts >= 12) {
              clearInterval(iv);
            }
          }, 1000);
        } else {
          // normal one-time fetch to show current phone if present
          checkNow();
        }
      } catch (err) {
        // fail silently
        checkNow();
      }
    }

    // initial run
    startPollingIfFlag();

    // when the user focuses the tab (returns from WhatsApp), try checking immediately
    const onFocus = () => { checkNow().catch(() => {}); };
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', onFocus);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') onFocus();
      });
    }

    return () => {
      mounted = false;
      try {
        if (typeof window !== 'undefined') {
          window.removeEventListener('focus', onFocus);
        }
      } catch {}
    };
  }, []);

  return (
    <div className={styles.container}>
      <form className={styles.form}>
        <BackButton />
        <h2>Cadastrar whatsapp</h2>
        <div style={{justifyContent:'center', textAlign: 'center'}}>
          <p>Para continuar, adicione seu número de whatsapp.</p>
        </div>
        {successMessage && <div style={{ color: 'green', marginBottom: 12 }}>{successMessage}</div>}

        {/* If no phone: show only the Add button and helper text. */}
        {(!phones || phones.length === 0) ? (
          <>
            <button type="button" onClick={() => router.push('/cadastro/telefone/novo' + (returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''))}>Adicionar telefone</button>
            <div style={{ color: '#666', fontSize: 12, marginTop: 8 }}>Aguardando confirmação do número antes de concluir o cadastro.</div>
          </>
        ) : (
          /* If phone exists: show only the Concluir button */
          <button
            type="button"
            style={{ background: '#b2e0c2' }}
            onClick={() => {
              // Redirecionar para returnTo se existir, caso contrário para a home
              if (returnTo && returnTo.trim().length > 0) {
                router.push(returnTo);
              } else {
                router.push('/');
              }
            }}
            title="Concluir cadastro"
          >
            Concluir cadastro
          </button>
        )}
      </form>
    </div>
  );
}
