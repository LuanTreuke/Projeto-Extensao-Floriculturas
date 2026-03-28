"use client";

import React from 'react';
import Image from 'next/image';
import { buildImageURL } from '@/utils/imageUtils';
import NgrokImage from './NgrokImage';

interface SmartImageProps {
  src: string;
  alt: string;
  className?: string;
  width: number;
  height: number;
  style?: React.CSSProperties;
}

/**
 * Componente que automaticamente escolhe entre Image ou NgrokImage
 * baseado na URL fornecida
 */
export default function SmartImage({ src, alt, className, width, height, style }: SmartImageProps) {
  // Validação mais robusta: verifica se src é uma string válida e não vazia
  if (!src || typeof src !== 'string' || src.trim() === '') {
    return (
      <div 
        className={className} 
        style={{
          ...style,
          width,
          height,
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

  const imgSrc = buildImageURL(src);
  
  // Verifica se buildImageURL retornou uma URL válida
  if (!imgSrc || imgSrc.trim() === '') {
    return (
      <div 
        className={className} 
        style={{
          ...style,
          width,
          height,
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
  const isNgrok = imgSrc.includes('ngrok');

  if (isNgrok) {
    return (
      <NgrokImage
        src={imgSrc}
        alt={alt}
        className={className}
        width={width}
        height={height}
        style={style}
      />
    );
  }

  return (
    <Image
      src={imgSrc}
      alt={alt}
      className={className}
      width={width}
      height={height}
      style={style}
      onError={() => {
        if (process.env.NODE_ENV === 'development') {
          console.error(`❌ Erro ao carregar imagem "${alt}":`, imgSrc);
        }
      }}
    />
  );
}

