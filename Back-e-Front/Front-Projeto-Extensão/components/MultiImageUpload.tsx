"use client";

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { buildImageURL } from '@/utils/imageUtils';

interface MultiImageUploadProps {
  onFilesSelected: (files: File[]) => void;
  currentImages?: string[];
  disabled?: boolean;
  maxImages?: number;
}

export default function MultiImageUpload({ 
  onFilesSelected, 
  currentImages = [], 
  disabled = false,
  maxImages = 5 
}: MultiImageUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Atualizar previews quando currentImages mudar
  React.useEffect(() => {
    if (currentImages.length > 0) {
      setPreviews(currentImages.map(img => buildImageURL(img)));
    }
  }, [currentImages]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    // Validar tipo de arquivo
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const validFiles = files.filter(file => {
      if (!validTypes.includes(file.type)) {
        alert(`Arquivo ${file.name} não é um tipo suportado. Use: JPG, PNG, GIF ou WebP`);
        return false;
      }
      // Validar tamanho (15MB)
      const maxSize = 15 * 1024 * 1024;
      if (file.size > maxSize) {
        alert(`Arquivo ${file.name} muito grande. Máximo 15MB permitido.`);
        return false;
      }
      return true;
    });

    // Verificar se não excede o limite
    const totalImages = selectedFiles.length + validFiles.length;
    if (totalImages > maxImages) {
      alert(`Você pode adicionar no máximo ${maxImages} imagens. Atualmente você tem ${selectedFiles.length} imagem(ns).`);
      return;
    }

    // Criar previews locais usando Promise.all para evitar condições de corrida
    try {
      const newPreviews = await Promise.all(
        validFiles.map((file) => {
          return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              resolve(e.target?.result as string);
            };
            reader.onerror = () => {
              reject(new Error(`Erro ao ler arquivo ${file.name}`));
            };
            reader.readAsDataURL(file);
          });
        })
      );

      // Atualizar estado com todas as imagens
      const updatedFiles = [...selectedFiles, ...validFiles];
      const updatedPreviews = [...previews, ...newPreviews];
      setSelectedFiles(updatedFiles);
      setPreviews(updatedPreviews);
      onFilesSelected(updatedFiles);
    } catch (error) {
      console.error('Erro ao processar imagens:', error);
      alert('Erro ao processar uma ou mais imagens. Tente novamente.');
    }

    // Limpar o input para permitir nova seleção
    e.target.value = '';
  };

  const handleRemoveImage = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    setPreviews(newPreviews);
    onFilesSelected(newFiles);
  };

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleCameraClick = () => {
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
      cameraInputRef.current.click();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Input oculto para galeria - aceita múltiplos arquivos */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        disabled={disabled || selectedFiles.length >= maxImages}
        style={{ display: 'none' }}
      />
      
      {/* Input oculto para câmera */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        disabled={disabled || selectedFiles.length >= maxImages}
        style={{ display: 'none' }}
      />

      {/* Botões para adicionar imagens */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <button
          type="button"
          onClick={handleButtonClick}
          disabled={disabled || selectedFiles.length >= maxImages}
          style={{
            flex: 1,
            background: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            padding: '12px 16px',
            fontSize: '0.9rem',
            cursor: disabled || selectedFiles.length >= maxImages ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            opacity: disabled || selectedFiles.length >= maxImages ? 0.6 : 1
          }}
        >
          <i className="bi bi-image" style={{ fontSize: 20 }}></i>
          Adicionar Imagens ({selectedFiles.length}/{maxImages})
        </button>
        
        <button
          type="button"
          onClick={handleCameraClick}
          disabled={disabled || selectedFiles.length >= maxImages}
          style={{
            background: '#4a4a4a',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            padding: '12px 16px',
            cursor: disabled || selectedFiles.length >= maxImages ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: disabled || selectedFiles.length >= maxImages ? 0.6 : 1,
            minWidth: '56px',
            flexShrink: 0
          }}
        >
          <i className="bi bi-camera" style={{ fontSize: 20 }}></i>
        </button>
      </div>

      <div style={{ 
        fontSize: '0.8rem', 
        color: '#666'
      }}>
        Formatos: JPG, PNG, GIF, WebP (máx. 15MB cada) • Máximo de {maxImages} imagens
      </div>

      {/* Grid de previews das imagens */}
      {previews.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          gap: 16,
          marginTop: 8
        }}>
          {previews.map((preview, index) => (
            <div
              key={index}
              style={{
                position: 'relative',
                border: '2px solid #cbead6',
                borderRadius: 8,
                padding: 8,
                background: '#f8f9fa',
                textAlign: 'center'
              }}
            >
              <button
                type="button"
                onClick={() => handleRemoveImage(index)}
                disabled={disabled}
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  background: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  width: 24,
                  height: 24,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  zIndex: 1
                }}
              >
                ×
              </button>
              <div style={{
                position: 'absolute',
                top: 4,
                left: 4,
                background: 'rgba(0,0,0,0.6)',
                color: 'white',
                borderRadius: 4,
                padding: '2px 6px',
                fontSize: '0.7rem',
                fontWeight: 600
              }}>
                {index + 1}
              </div>
              <Image
                src={preview}
                alt={`Preview ${index + 1}`}
                width={150}
                height={150}
                style={{
                  width: '100%',
                  height: '150px',
                  objectFit: 'cover',
                  borderRadius: 4
                }}
                unoptimized={preview.startsWith('data:')}
                onError={() => {
                  if (process.env.NODE_ENV === 'development') {
                    console.warn('Preview da imagem não pôde ser carregado:', preview);
                  }
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
