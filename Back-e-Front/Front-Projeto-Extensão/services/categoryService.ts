import api from './api';

export interface Categoria {
  id: number;
  nome: string;
  ordem?: number;
}

export async function fetchCategories(): Promise<Categoria[]> {
  const res = await api.get('/categorias');
  return res.data || [];
}

export async function createCategory(nome: string): Promise<Categoria> {
  const res = await api.post('/categorias', { nome });
  return res.data;
}

export async function updateCategory(id: number, nome: string): Promise<Categoria | null> {
  const res = await api.put(`/categorias/${id}`, { nome });
  return res.data || null;
}

export async function deleteCategory(id: number): Promise<boolean> {
  const res = await api.delete(`/categorias/${id}`);
  return res.status === 204 || res.status === 200;
}

export async function moveCategoryUp(id: number): Promise<Categoria[]> {
  const res = await api.post(`/categorias/${id}/move-up`);
  return res.data || [];
}

export async function moveCategoryDown(id: number): Promise<Categoria[]> {
  const res = await api.post(`/categorias/${id}/move-down`);
  return res.data || [];
}
