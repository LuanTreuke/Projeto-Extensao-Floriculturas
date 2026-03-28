import api from './api';
import { getCurrentUser } from './authService';

export interface PhoneDto {
  id?: number;
  telefone: string;
  Usuario_id?: number | null;
}

export async function fetchPhones() {
  try {
    // Prefer asking the server for phones belonging to the current user.
    // If no user is logged in, return an empty list (no phones available).
    const usuario = getCurrentUser();
    if (!usuario || !usuario.id) return [];
    // The backend now stores a single telefone on the usuario record.
    const res = await api.get(`/usuario/${usuario.id}`);
    // normalize to array for compatibility with places that expected an array
    const phone = res.data?.usuario?.telefone ? [{ telefone: res.data.usuario.telefone }] : [];
    return phone as PhoneDto[];
  } catch (err) {
    if (err instanceof Error) {
      console.warn('fetchPhones: request failed', err.message);
    } else {
      console.warn('fetchPhones: request failed', String(err));
    }
    return [];
  }
}

export async function createPhone(dto: PhoneDto) {
  try {
    console.debug('[createPhone] sending dto:', dto);
    // Create a phone by updating the current user's telefone field
    const usuario = getCurrentUser();
    if (!usuario || !usuario.id) throw new Error('Usuário não autenticado');
    const res = await api.patch(`/usuario/telefone`, { id: usuario.id, telefone: dto.telefone });
    return { telefone: res.data.usuario.telefone } as PhoneDto;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('createPhone failed', msg);
    throw new Error(msg);
  }
}

export async function updatePhone(id: number, dto: Partial<PhoneDto>) {
  try {
    // Update (replace) telefone on the usuario record. id parameter is ignored in the single-phone model.
    const usuario = getCurrentUser();
    if (!usuario || !usuario.id) throw new Error('Usuário não autenticado');
    const res = await api.patch(`/usuario/telefone`, { id: usuario.id, telefone: dto.telefone });
    return { telefone: res.data.usuario.telefone } as PhoneDto;
  } catch (err) {
    console.error('updatePhone failed', err instanceof Error ? err.message : String(err));
    throw err;
  }
}

export async function deletePhone(id: number) {
  try {
    const usuario = getCurrentUser();
    if (!usuario || !usuario.id) throw new Error('Usuário não autenticado');
    const res = await api.patch(`/usuario/telefone`, { id: usuario.id, telefone: null });
    return !!res.data.usuario;
  } catch (err) {
    console.error('deletePhone failed', err instanceof Error ? err.message : String(err));
    throw err;
  }
}
