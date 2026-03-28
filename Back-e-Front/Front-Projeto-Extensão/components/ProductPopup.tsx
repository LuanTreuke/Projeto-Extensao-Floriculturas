"use client";
import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import styles from '../styles/ProductDetail.module.css';
import { fetchProductById, Product } from '../services/productService';
import { getCurrentUser, User } from '../services/authService';
import { addToCart } from '../services/cartService';
import { buildImageURL } from '@/utils/imageUtils';
import NgrokImage from './NgrokImage';
import AddToCartModal from './AddToCartModal';

type Props = {
  productId: number;
  onClose?: () => void;
  inline?: boolean;
};

export default function ProductPopup({ productId, onClose, inline = false }: Props) {
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [showAddToCartModal, setShowAddToCartModal] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const p = await fetchProductById(productId);
        setProduct(p);
        setCurrentImageIndex(0); // Reset para primeira imagem ao trocar de produto
      } finally {
        setLoading(false);
      }
    })();
    try {
      const u: User = getCurrentUser();
      setIsLoggedIn(!!u && typeof u.id === 'number');
    } catch {}
  }, [productId]);

  useEffect(() => {
    if (inline) return;
    const scrollY = window.scrollY || window.pageYOffset || 0;
    const prev = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      left: document.body.style.left,
      right: document.body.style.right,
    };
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (onClose) onClose();
      }
    }

    function preventScroll(e: Event) { e.preventDefault(); }

    window.addEventListener('keydown', onKey);
    const overlayEl = overlayRef.current;
    if (overlayEl) {
      overlayEl.addEventListener('wheel', preventScroll, { passive: false });
      overlayEl.addEventListener('touchmove', preventScroll, { passive: false });
    }

    return () => {
      window.removeEventListener('keydown', onKey);
      if (overlayEl) {
        overlayEl.removeEventListener('wheel', preventScroll);
        overlayEl.removeEventListener('touchmove', preventScroll);
      }
      document.body.style.overflow = prev.overflow;
      document.body.style.position = prev.position;
      document.body.style.top = prev.top;
      document.body.style.left = prev.left;
      document.body.style.right = prev.right;
      window.scrollTo(0, scrollY);
    };
  }, [inline, onClose]);

  const content = (
    <div className={styles.container} role="dialog" aria-label="Produto">
      {loading ? (
        <div>Carregando...</div>
      ) : !product ? (
        <div>Produto não encontrado</div>
      ) : (
        <div className={styles.layout}>
          {product.imagem_url ? (() => {
            // Separar múltiplas URLs por vírgula
            const imageUrls = product.imagem_url.split(',').map(url => url.trim()).filter(url => url);
            const currentImageUrl = buildImageURL(imageUrls[currentImageIndex] || imageUrls[0]);
            const isNgrok = currentImageUrl.includes('ngrok');
            const hasMultipleImages = imageUrls.length > 1;
            
            return (
              <div style={{ position: 'relative' }}>
                {isNgrok ? (
                  <NgrokImage
                    src={currentImageUrl}
                    alt={product.nome}
                    className={styles.image}
                    width={400}
                    height={400}
                    style={{ objectFit: 'cover' }}
                  />
                ) : (
                  <Image
                    src={currentImageUrl}
                    alt={product.nome}
                    className={styles.image}
                    width={400}
                    height={400}
                    style={{ objectFit: 'cover' }}
                    onError={() => {
                      console.error(`❌ Erro ao carregar imagem no modal do produto "${product.nome}":`, currentImageUrl);
                    }}
                  />
                )}
                
                {/* Setas de navegação - apenas se houver múltiplas imagens */}
                {hasMultipleImages && (
                  <>
                    <button
                      onClick={() => setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : imageUrls.length - 1))}
                      style={{
                        position: 'absolute',
                        left: 8,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'rgba(0, 0, 0, 0.6)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: 40,
                        height: 40,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.5rem',
                        zIndex: 10
                      }}
                      aria-label="Imagem anterior"
                    >
                      ‹
                    </button>
                    
                    <button
                      onClick={() => setCurrentImageIndex((prev) => (prev < imageUrls.length - 1 ? prev + 1 : 0))}
                      style={{
                        position: 'absolute',
                        right: 8,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'rgba(0, 0, 0, 0.6)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: 40,
                        height: 40,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.5rem',
                        zIndex: 10
                      }}
                      aria-label="Próxima imagem"
                    >
                      ›
                    </button>
                    
                    {/* Indicador de posição */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 8,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'rgba(0, 0, 0, 0.6)',
                        color: 'white',
                        padding: '4px 12px',
                        borderRadius: 12,
                        fontSize: '0.85rem',
                        fontWeight: 500
                      }}
                    >
                      {currentImageIndex + 1} / {imageUrls.length}
                    </div>
                  </>
                )}
              </div>
            );
          })() : (
            <div className={styles.image}>Img</div>
          )}
          <div className={styles.info}>
            <h1 className={styles.title}>{product.nome}</h1>
            <p className={styles.price}>R${Number(product.preco).toFixed(2)}</p>
            <p className={styles.description}>{product.descricao}</p>

            {isLoggedIn ? (
              <>
                <div className={styles.actions}>
                  <button className={styles.orderBtn} onClick={() => {
                    if (onClose) onClose();
                    router.push(`/product/${productId}/pedido`);
                  }}>Fazer pedido</button>
                </div>

                <div className={styles.actions}>
                  <button className={styles.shoppingCart} onClick={() => {
                    const firstImage = product.imagem_url ? product.imagem_url.split(',')[0].trim() : '';
                    addToCart({ id: product.id, nome: product.nome, preco: product.preco, imagem_url: firstImage });
                    setShowAddToCartModal(true);
                  }}>
                    <span className={'material-icons'}>shopping_cart</span>
                    Adicionar ao carrinho
                  </button>
                </div>
              </>
            ) : (
              <div className={styles.loginNotice}>
                <p>Faça login para realizar o pedido ou adicionar ao carrinho.</p>
                <button className={styles.loginNoticeBtn} onClick={() => router.push('/login')}>Ir para login</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  if (inline) return content;

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 30000 }}>
        <div
          ref={overlayRef}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 30000 }}
          onClick={() => { if (onClose) onClose(); }}
        />
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'min(900px, 95vw)',
            maxHeight: '85vh',
            overflow: 'hidden',
            background: 'white',
            borderRadius: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            zIndex: 30001,
          }}
        >
          <button
            aria-label="Fechar"
            onClick={() => { if (onClose) onClose(); }}
            style={{
              position: 'sticky',
              top: 0,
              marginLeft: 'auto',
              display: 'block',
              background: 'transparent',
              border: 'none',
              padding: 12,
              cursor: 'pointer',
              zIndex: 1,
            }}
          >
            <span className="material-icons" style={{ fontSize: 22 }}>close</span>
          </button>
          {content}
        </div>
      </div>
      
      {showAddToCartModal && product && (
        <AddToCartModal
          productName={product.nome}
          onClose={() => setShowAddToCartModal(false)}
          onGoToCart={() => {
            setShowAddToCartModal(false);
            if (onClose) onClose();
            router.push('/carrinho');
          }}
        />
      )}
    </>
  );
}


