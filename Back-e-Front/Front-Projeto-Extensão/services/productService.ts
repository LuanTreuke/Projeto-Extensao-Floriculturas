import api from './api';

export async function addProduct(produto: Omit<Product, 'id'>): Promise<Product> {
  const res = await api.post(`/produtos`, produto);
  return res.data as Product;
}

export async function fetchProductById(id: number): Promise<Product | null> {
  try {
    const res = await api.get(`/produtos/${id}`);
    return res.data as Product;
  } catch (err: unknown) {
    const maybeErr = err as { response?: { status?: number } } | undefined;
    const resp = maybeErr?.response;
    if (resp) {
      console.warn('fetchProductById: backend returned', resp.status);
      return null;
    }
    console.warn('fetchProductById: request failed', (err as Error)?.message ?? String(err));
    return null;
  }
}
export interface Product {
  id: number;
  nome: string;
  descricao?: string;
  preco: number;
  imagem_url?: string;
  Categoria_id?: number;
  categoria?: { id: number; nome?: string } | null;
  enabled?: boolean;
}

export async function fetchProducts(): Promise<Product[]> {
  try {
    const res = await api.get(`/produtos`);
    const data = res.data as unknown;
    if (Array.isArray(data)) return data as Product[];
    if (data && typeof data === 'object' && Array.isArray((data as any).items)) {
      return (data as any).items as Product[];
    }
    return [];
  } catch (err: unknown) {
    const maybeErr = err as { response?: { status?: number } } | undefined;
    const status = maybeErr?.response?.status;
    console.warn('fetchProducts failed', status ?? (err as Error)?.message ?? String(err));
    return [];
  }
}

export async function deleteProduct(id: number): Promise<boolean> {
  try {
    const res = await api.delete(`/produtos/${id}`);
    return res.status === 200 || res.status === 204 || (res.data && res.data.deleted === true);
  } catch (err: unknown) {
    const maybeErr = err as { response?: { status?: number } } | undefined;
    const status = maybeErr?.response?.status;
    console.warn('deleteProduct failed', status ?? (err as Error)?.message ?? String(err));
    return false;
  }
}

export async function updateProduct(id: number, payload: Partial<Product>): Promise<Product | null> {
  try {
    const res = await api.patch(`/produtos/${id}`, payload);
    return res.data as Product;
  } catch (err: unknown) {
    const maybeErr = err as { response?: { status?: number } } | undefined;
    const status = maybeErr?.response?.status;
    console.warn('updateProduct failed', status ?? (err as Error)?.message ?? String(err));
    return null;
  }
}
