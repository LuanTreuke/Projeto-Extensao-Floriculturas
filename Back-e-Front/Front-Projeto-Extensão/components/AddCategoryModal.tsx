"use client";

import React, { useState } from 'react';
import { createCategory } from '@/services/categoryService';
import { showSuccess, showError } from '@/utils/sweetAlert';

interface AddCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoryAdded: () => void;
}

export default function AddCategoryModal({ isOpen, onClose, onCategoryAdded }: AddCategoryModalProps) {
  const [categoryName, setCategoryName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!categoryName.trim()) {
      showError('Por favor, insira um nome para a categoria');
      return;
    }

    try {
      setLoading(true);
      await createCategory(categoryName.trim());
      await showSuccess('Categoria adicionada com sucesso!');
      setCategoryName('');
      onCategoryAdded();
      onClose();
    } catch (error) {
      console.error('Erro ao adicionar categoria:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao adicionar categoria!';
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setCategoryName('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={handleCancel}
    >
      <div 
        style={{
          backgroundColor: '#fff',
          borderRadius: 12,
          padding: 32,
          maxWidth: 500,
          width: '90%',
          boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: 600,
          marginBottom: 24,
          color: '#222',
        }}>
          Adicionar Nova Categoria
        </h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontWeight: 500, color: '#222' }}>
              Nome da Categoria
            </label>
            <input
              type="text"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="Ex: Plantas Ornamentais"
              required
              disabled={loading}
              style={{
                padding: 10,
                borderRadius: 8,
                border: '1px solid #cbead6',
                fontSize: '1rem',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 16, justifyContent: 'flex-end', marginTop: 8 }}>
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              style={{
                background: '#f3f7f4',
                color: '#222',
                border: 'none',
                borderRadius: 8,
                padding: '12px 24px',
                fontWeight: 500,
                fontSize: '1rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                background: '#cbead6',
                color: '#222',
                border: 'none',
                borderRadius: 8,
                padding: '12px 24px',
                fontWeight: 600,
                fontSize: '1rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Adicionando...' : 'Adicionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
