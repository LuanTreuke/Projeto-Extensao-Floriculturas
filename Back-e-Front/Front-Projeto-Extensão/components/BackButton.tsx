"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import styles from '../styles/BackButton.module.css';

type Props = {
  onClick?: () => void;
  ariaLabel?: string;
};

export default function BackButton({ onClick, ariaLabel = 'Voltar' }: Props) {
  const router = useRouter();
  return (
    <button
      type="button"
      className={styles.button}
      aria-label={ariaLabel}
      onClick={() => (onClick ? onClick() : router.back())}
    >
      <span className="material-icons" aria-hidden="true">arrow_back</span>
    </button>
  );
}


