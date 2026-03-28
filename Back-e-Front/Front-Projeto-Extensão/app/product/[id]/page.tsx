"use client";
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { getCurrentUser, User } from '../../../services/authService';
import stylesModule from '../../../styles/ProductDetail.module.css';
import { useRouter, useParams } from 'next/navigation';
import { fetchProductById, Product } from '../../../services/productService';
import styles from '../../../styles/ProductDetail.module.css';
import { addToCart } from '../../../services/cartService';

export default function ProductPage() {
  const params = useParams();
  const id = Number(params?.id);
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [addedMsg, setAddedMsg] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  useEffect(() => {
    fetchProductById(id).then(p => { setProduct(p); setLoading(false); });
    try {
      const u: User = getCurrentUser();
      setIsLoggedIn(!!u && typeof u.id === 'number');
    } catch {
      // ignore
    }
  }, [id]);

  if (loading) return <div>Carregando...</div>;
  if (!product) return <div>Produto não encontrado</div>;

  return (
    <div className={styles.container}>
      <div className={styles.layout}>
        {product.imagem_url ? (
          <Image src={product.imagem_url.split(',')[0].trim()} alt={product.nome} className={styles.image} width={400} height={400} style={{ objectFit: 'cover' }} />
        ) : (
          <div className={styles.image}>Img</div>
        )}
        <div className={styles.info}>
          <h1 className={styles.title}>{product.nome}</h1>
          <p className={styles.price}>R${Number(product.preco).toFixed(2)}</p>
          <p className={styles.description}>{product.descricao}</p>

          {isLoggedIn ? (
            <>
              <div className={styles.actions}>
                <button className={styles.orderBtn} onClick={() => router.push(`/product/${id}/pedido`)}>Fazer pedido</button>
              </div>

              <div className={styles.actions}>
                <button className={styles.shoppingCart} onClick={() => {
                  const firstImage = product.imagem_url ? product.imagem_url.split(',')[0].trim() : '';
                  addToCart({ id: product.id, nome: product.nome, preco: product.preco, imagem_url: firstImage });
                  setAddedMsg('Adicionado');
                  setTimeout(() => setAddedMsg(null), 1500);
                }}>
                  <span className={`material-icons ${styles.icon}`}>shopping_cart</span>
                  {addedMsg || 'Adicionar ao carrinho'}
                </button>
              </div>
            </>
          ) : (
            <div className={stylesModule.loginNotice}>
              <p>Faça login para realizar o pedido ou adicionar ao carrinho.</p>
              <button className={stylesModule.loginNoticeBtn} onClick={() => router.push('/login')}>Ir para login</button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
