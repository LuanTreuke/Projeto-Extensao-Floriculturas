"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

interface NgrokImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  style?: React.CSSProperties;
}

// Cache global de blob URLs para evitar requisições duplicadas e revogações prematuras
const blobCache = new Map<string, string>();

/**
 * Componente que lida com imagens do ngrok fazendo fetch com headers corretos
 * para pular a página de aviso do ngrok
 */
export default function NgrokImage({ src, alt, className, width, height, style }: NgrokImageProps) {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    if (!src) {
      setLoading(false);
      return;
    }

    const isNgrok = src.includes('ngrok');
    
    // Se não for ngrok, usar src direto
    if (!isNgrok) {
      setImageSrc(src);
      setLoading(false);
      return;
    }

    // Verificar se já temos essa URL em cache
    if (blobCache.has(src)) {
      const cachedUrl = blobCache.get(src)!;
      if (isMounted) {
        setImageSrc(cachedUrl);
        setLoading(false);
      }
      return;
    }

    // Para URLs do ngrok, usar proxy do Next.js para evitar CORS
    const fetchImage = async () => {
      try {
        // Usar API route como proxy
        const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(src)}`;
        const response = await fetch(proxyUrl);

        if (!response.ok) {
          throw new Error('Falha ao carregar imagem');
        }

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        
        // Adicionar ao cache
        blobCache.set(src, objectUrl);
        
        if (isMounted) {
          setImageSrc(objectUrl);
          setLoading(false);
        }
      } catch (err) {
        console.error('Erro ao carregar imagem do ngrok:', err);
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      }
    };

    fetchImage();

    // Cleanup: apenas marcar componente como desmontado
    // NÃO revogar blob URL para permitir reuso
    return () => {
      isMounted = false;
    };
  }, [src]);

  if (loading) {
    return (
      <div 
        className={className} 
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f0f0f0',
          color: '#999',
          fontSize: '0.85rem'
        }}
      >
        Carregando...
      </div>
    );
  }

  if (error || !imageSrc) {
    return (
      <div 
        className={className} 
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f0f0f0',
          color: '#666',
          fontSize: '1.5rem'
        }}
      >
        🖼️
      </div>
    );
  }

  // Se tiver width e height, usar componente Image do Next.js
  if (width && height) {
    return (
      <Image
        src={imageSrc}
        alt={alt}
        className={className}
        width={width}
        height={height}
        style={style}
        unoptimized={imageSrc.startsWith('blob:')}
        onError={() => setError(true)}
      />
    );
  }

  // Caso contrário, usar img nativo
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageSrc}
      alt={alt}
      className={className}
      style={style}
      onError={() => setError(true)}
    />
  );
}

