"use client";
import React from 'react';
import styles from '../styles/AddToCartModal.module.css';
import { useRouter } from 'next/navigation';

type Props = {
  productName: string;
  onClose: () => void;
  onGoToCart: () => void;
};

export default function AddToCartModal({ productName, onClose, onGoToCart }: Props) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <span className="material-icons" style={{ color: '#2f7a3e', fontSize: 48 }}>
            check_circle
          </span>
        </div>
        <h2 className={styles.title}>Produto adicionado ao carrinho!</h2>
        <p className={styles.productName}>{productName}</p>
        <div className={styles.actions}>
          <button className={styles.continueBtn} onClick={onClose}>
            Continuar comprando
          </button>
          <button className={styles.cartBtn} onClick={onGoToCart}>
            <span className="material-icons" style={{ fontSize: 18 }}>shopping_cart</span>
            Ir para o carrinho
          </button>
        </div>
      </div>
    </div>
  );
}
