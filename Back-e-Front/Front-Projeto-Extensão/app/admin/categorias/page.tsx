"use client";
import React, { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import styles from '../../../styles/AdminLayout.module.css';
import { fetchCategories, createCategory, updateCategory, deleteCategory, moveCategoryUp, moveCategoryDown, Categoria } from '../../../services/categoryService';
import { showValidationError, showError, showSuccess, showDeleteConfirm, showToast } from '../../../utils/sweetAlert';

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const cats = await fetchCategories();
        if (mounted) setCategorias(cats || []);
      } catch (err) {
        console.warn('Falha ao carregar categorias', err);
        if (mounted) setCategorias([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  async function handleAdd() {
    if (!newName.trim()) return showValidationError('Informe o nome da categoria');
    
    // Validar se já existe uma categoria com este nome
    const nomeNormalizado = newName.trim().toLowerCase();
    const categoriaExistente = categorias.find(c => c.nome.toLowerCase() === nomeNormalizado);
    if (categoriaExistente) {
      return showValidationError('Já existe uma categoria com este nome');
    }
    
    try {
      const created = await createCategory(newName.trim());
      setCategorias((s) => [created, ...s]);
      setNewName('');
      showToast('Categoria criada com sucesso', 'success');
    } catch (err) {
      console.error('Erro ao criar categoria', err);
      showError('Falha ao criar categoria');
    }
  }

  async function handleEdit(cat: Categoria) {
    const { value: novo } = await Swal.fire({
      title: 'Editar categoria',
      input: 'text',
      inputLabel: 'Nome da categoria',
      inputValue: cat.nome,
      showCancelButton: true,
      confirmButtonColor: '#2e7d32',
      cancelButtonColor: '#757575',
      confirmButtonText: 'Salvar',
      cancelButtonText: 'Cancelar',
      inputValidator: (value) => {
        if (!value) {
          return 'O nome não pode estar vazio';
        }
        // Validar se já existe outra categoria com este nome
        const nomeNormalizado = value.trim().toLowerCase();
        const categoriaExistente = categorias.find(c => c.id !== cat.id && c.nome.toLowerCase() === nomeNormalizado);
        if (categoriaExistente) {
          return 'Já existe uma categoria com este nome';
        }
        return null;
      }
    });
    if (!novo) return;
    try {
      const updated = await updateCategory(cat.id, novo);
      setCategorias((s) => s.map(c => (c.id === cat.id ? (updated || { ...cat, nome: novo }) : c)));
      showToast('Categoria atualizada com sucesso', 'success');
    } catch (err) {
      console.error('Erro ao editar categoria', err);
      showError('Falha ao editar categoria');
    }
  }

  async function handleDelete(cat: Categoria) {
    const ok = await showDeleteConfirm(cat.nome);
    if (!ok) return;
    try {
      const success = await deleteCategory(cat.id);
      if (success) {
        setCategorias((s) => s.filter(c => c.id !== cat.id));
        showToast('Categoria excluída com sucesso', 'success');
      } else {
        showError('Falha ao excluir categoria');
      }
    } catch (err) {
      console.error('Erro ao excluir categoria', err);
      showError('Falha ao excluir categoria');
    }
  }

  async function handleMoveUp(id: number) {
    try {
      const updated = await moveCategoryUp(id);
      setCategorias(updated);
      showToast('Ordem atualizada', 'success');
    } catch (err) {
      console.error('Erro ao mover categoria', err);
      showError('Falha ao atualizar ordem');
    }
  }

  async function handleMoveDown(id: number) {
    try {
      const updated = await moveCategoryDown(id);
      setCategorias(updated);
      showToast('Ordem atualizada', 'success');
    } catch (err) {
      console.error('Erro ao mover categoria', err);
      showError('Falha ao atualizar ordem');
    }
  }


  return (
    <div className={styles.adminMain}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: '2px solid #dee2e6' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 600, color: '#343a40', margin: '0 0 4px 0' }}>Gerenciar Categorias</h1>
            <p style={{ color: '#6c757d', margin: 0, fontSize: '0.95rem' }}>Organize e gerencie as categorias de produtos</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Nova categoria"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            style={{ flex: 1, padding: 14, fontSize: 16, borderRadius: 8, border: '1px solid #e6e6e6', background: '#fff' }}
          />
          <button
            className={styles.headerControlBtn}
            onClick={handleAdd}
            style={{ background: '#cbead6', color: '#222' }}
          >Adicionar</button>
        </div>

        {loading ? (
          <div>Carregando categorias...</div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, background: '#fff', border: '1px solid #ececec', borderRadius: 8 }}>
            {categorias.map((cat, index) => (
              <li key={cat.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #f5f5f5' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <button
                      onClick={() => handleMoveUp(cat.id)}
                      disabled={index === 0}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: index === 0 ? 'not-allowed' : 'pointer',
                        padding: 2,
                        opacity: index === 0 ? 0.3 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      title="Mover para cima"
                    >
                      <span style={{ fontSize: 18 }}>▲</span>
                    </button>
                    <button
                      onClick={() => handleMoveDown(cat.id)}
                      disabled={index === categorias.length - 1}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: index === categorias.length - 1 ? 'not-allowed' : 'pointer',
                        padding: 2,
                        opacity: index === categorias.length - 1 ? 0.3 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      title="Mover para baixo"
                    >
                      <span style={{ fontSize: 18 }}>▼</span>
                    </button>
                  </div>
                  <span style={{ fontWeight: 600, color: '#222' }}>{cat.nome}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    className={styles.adminActionBtn}
                    onClick={() => handleEdit(cat)}
                    style={{ background: '#f0f2f5', color: '#222' }}
                  >Editar</button>
                  <button
                    className={styles.adminActionBtnDanger}
                    onClick={() => handleDelete(cat)}
                  >Excluir</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
