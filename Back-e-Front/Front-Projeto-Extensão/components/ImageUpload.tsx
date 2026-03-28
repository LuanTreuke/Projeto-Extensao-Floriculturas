"use client";

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { buildImageURL } from '@/utils/imageUtils';

interface ImageUploadProps {
  onFileSelected: (file: File | null) => void;
  currentImage?: string;
  disabled?: boolean;
}

export default function ImageUpload({ onFileSelected, currentImage, disabled = false }: ImageUploadProps) {
  const [preview, setPreview] = useState<string>(currentImage ? buildImageURL(currentImage) : '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Atualizar preview quando currentImage mudar
  useEffect(() => {
    if (currentImage) {
      setPreview(buildImageURL(currentImage));
    }
  }, [currentImage]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Tipo de arquivo não suportado. Use: JPG, PNG, GIF ou WebP');
      e.target.value = '';
      return;
    }

    // Validar tamanho (15MB)
    const maxSize = 15 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('Arquivo muito grande. Máximo 15MB permitido.');
      e.target.value = '';
      return;
    }

    // Criar preview local (base64)
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Notificar o componente pai sobre o arquivo selecionado
    onFileSelected(file);

    // Limpar o input para permitir nova seleção
    e.target.value = '';
  };

  const handleRemoveImage = () => {
    setPreview('');
    onFileSelected(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Input oculto - aceita tanto câmera quanto arquivo */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
        onChange={handleFileSelect}
        disabled={disabled}
        style={{ display: 'none' }}
      />

      {/* Botão unificado */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={handleButtonClick}
          disabled={disabled}
          style={{
            background: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            padding: '12px 16px',
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flex: '1',
            minWidth: '200px'
          }}
        >
          <i className="bi bi-image" style={{ fontSize: 20 }}></i>
          Selecionar Imagem
        </button>

        {/* Botão remover (se há preview) */}
        {preview && (
          <button
            type="button"
            onClick={handleRemoveImage}
            disabled={disabled}
            style={{
              background: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              padding: '12px 16px',
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <i className="bi bi-trash" style={{ fontSize: 18 }}></i>
            Remover
          </button>
        )}
      </div>

      <div style={{ 
        fontSize: '0.8rem', 
        color: '#666', 
        textAlign: 'center'
      }}>
        Formatos: JPG, PNG, GIF, WebP (máx. 15MB)
      </div>

      {/* Preview da imagem */}
      {preview && (
        <div style={{
          border: '2px dashed #cbead6',
          borderRadius: 8,
          padding: 16,
          textAlign: 'center',
          background: '#f8f9fa'
        }}>
          <Image
            src={preview}
            alt="Preview"
            width={300}
            height={200}
            style={{
              maxWidth: '300px',
              maxHeight: '200px',
              objectFit: 'contain',
              borderRadius: 8,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
            unoptimized={preview.startsWith('data:')}
            onError={() => {
              if (process.env.NODE_ENV === 'development') {
                console.warn('Preview da imagem não pôde ser carregado:', preview);
              }
            }}
          />
        </div>
      )}
    </div>
  );
}
