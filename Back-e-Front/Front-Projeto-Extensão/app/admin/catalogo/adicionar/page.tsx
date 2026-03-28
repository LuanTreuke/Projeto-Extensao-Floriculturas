"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { addProduct, Product } from '@/services/productService';
import { fetchCategories, Categoria } from '@/services/categoryService';
import { uploadImage } from '@/services/uploadService';
import { showSuccess, showError } from '@/utils/sweetAlert';
import MultiImageUpload from '@/components/MultiImageUpload';
import AddCategoryModal from '@/components/AddCategoryModal';

export default function AdicionarProdutoPage() {
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [preco, setPreco] = useState('');
  const [categoria, setCategoria] = useState('');
  const [categories, setCategories] = useState<Categoria[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  function handleFilesSelected(files: File[]) {
    console.log('📸 Arquivos selecionados:', files.length);
    setSelectedFiles(files);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (loading) return;

    try {
      setLoading(true);
      
      const imagemUrls: string[] = [];
      
      // Se há arquivos selecionados, fazer upload de cada um
      if (selectedFiles.length > 0) {
        console.log(`📤 Fazendo upload de ${selectedFiles.length} imagem(ns)...`);
        
        for (let i = 0; i < selectedFiles.length; i++) {
          const file = selectedFiles[i];
          setUploadProgress(`Enviando imagem ${i + 1} de ${selectedFiles.length}...`);
          console.log(`📤 Upload ${i + 1}/${selectedFiles.length}: ${file.name}`);
          
          try {
            const uploadResult = await uploadImage(file);
            imagemUrls.push(uploadResult.url);
            console.log(`✅ Upload ${i + 1}/${selectedFiles.length} concluído:`, uploadResult.url);
          } catch (uploadError) {
            console.error(`❌ Erro no upload da imagem ${i + 1}:`, uploadError);
            setUploadProgress('');
            throw new Error(`Falha ao fazer upload da imagem ${file.name}`);
          }
        }
        setUploadProgress('Finalizando...');
      }
      
      // Juntar as URLs com vírgula
      const imagemUrl = imagemUrls.join(',');

      const dto = {
        nome,
        descricao,
        preco: Number(preco),
        imagem_url: imagemUrl,
        Categoria_id: Number(categoria || 0),
        enabled,
      };
      
      console.log('📤 Enviando produto:', dto);
      await addProduct(dto as Omit<Product, 'id'>);
      await showSuccess('Produto adicionado com sucesso!');
      router.push('/admin/catalogo');
    } catch (error) {
      console.error('Erro ao adicionar produto:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao adicionar produto!';
      showError(errorMessage);
    } finally {
      setLoading(false);
      setUploadProgress('');
    }
  }

  async function loadCategories() {
    try {
      const cats = await fetchCategories();
      setCategories(cats);
    } catch (e) {
      console.warn('Failed to load categories', e);
    }
  }

  function handleCategoryAdded() {
    loadCategories();
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const cats = await fetchCategories();
        if (!mounted) return;
        setCategories(cats);
      } catch (e) {
        // keep empty categories on error
        console.warn('Failed to load categories', e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
  <div style={{maxWidth: 800, margin: '0 auto', color: '#222'}}>
      <h1 style={{fontSize: '2rem', fontWeight: 600, marginBottom: 24, textAlign: 'center'}}>Adicione um produto</h1>
      <form onSubmit={handleSubmit} style={{background: '#fff', borderRadius: 12, boxShadow: '0 2px 16px rgba(0,0,0,0.08)', padding: 32, display: 'flex', flexDirection: 'column', gap: 24}}>
        <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
          <label style={{fontWeight: 500}}>Imagens do produto</label>
          <MultiImageUpload onFilesSelected={handleFilesSelected} maxImages={5} />
        </div>
        <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
          <label>Nome do produto</label>
          <input value={nome} onChange={e => setNome(e.target.value)} required style={{padding: 10, borderRadius: 8, border: '1px solid #cbead6'}} />
        </div>
        <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
          <label>Descrição</label>
          <textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={3} style={{padding: 10, borderRadius: 8, border: '1px solid #cbead6'}} />
        </div>
        <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
          <label>Preço (R$)</label>
          <input type="number" value={preco} onChange={e => setPreco(e.target.value)} required style={{padding: 10, borderRadius: 8, border: '1px solid #cbead6'}} />
        </div>
        <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <label>Categoria</label>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              disabled={loading}
              style={{
                background: '#cbead6',
                color: '#222',
                border: 'none',
                borderRadius: 8,
                padding: '8px 16px',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
            >
              + Nova Categoria
            </button>
          </div>
          <select value={categoria} onChange={e => setCategoria(e.target.value)} required style={{padding: 10, borderRadius: 8, border: '1px solid #cbead6'}}>
            <option value="">Selecione a categoria</option>
            {categories.length > 0 ? categories.map(c => (
              <option key={c.id} value={String(c.id)}>{c.nome}</option>
            )) : (
              <>
                <option value="1">Buquês</option>
                <option value="2">Arranjos</option>
                <option value="3">Flores</option>
                <option value="4">Cestas</option>
              </>
            )}
          </select>
        </div>
        <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
          <input id="enabled" type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} />
        </div>
        <div style={{display: 'flex', gap: 16, justifyContent: 'flex-end'}}>
          <button 
            type="button" 
            onClick={() => router.push('/admin/catalogo')} 
            disabled={loading}
            style={{background: '#f3f7f4', color: '#222', border: 'none', borderRadius: 8, padding: '12px 24px', fontWeight: 500, fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1}}
          >
            Cancelar
          </button>
          <button 
            type="submit"
            disabled={loading}
            style={{background: '#cbead6', color: '#222', border: 'none', borderRadius: 8, padding: '12px 24px', fontWeight: 600, fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1}}
          >
            {loading ? (uploadProgress || 'Adicionando...') : 'Adicionar'}
          </button>
        </div>
      </form>
      
      <AddCategoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCategoryAdded={handleCategoryAdded}
      />
    </div>
  );
}
