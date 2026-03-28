import api from './api';

export interface AddressDto {
  id?: number;
  rua: string;
  numero: string;
  bairro: string;
  cep: string;
  cidade: string;
  complemento?: string;
  Usuario_id?: number | null;
}

export async function fetchAddresses() {
  try {
  const res = await api.get(`/enderecos`);
    return res.data as AddressDto[];
  } catch (err) {
    if (err instanceof Error) {
      console.warn('fetchAddresses: request failed', err.message);
    } else {
      console.warn('fetchAddresses: request failed', String(err));
    }
    return [];
  }
}

export async function createAddress(dto: AddressDto) {
  try {
  // mostrar payload enviado para depuração
  console.debug('[createAddress] sending dto:', dto);
  const res = await api.post(`/enderecos`, dto);
    return res.data as AddressDto;
  } catch (err) {
  // Monta uma mensagem legível a partir do erro
    const msg = err instanceof Error ? err.message : String(err);
    console.error('createAddress failed', msg);
  // Lança Error com a mensagem para que o componente possa exibir
  throw new Error(msg);
  }
}

export async function updateAddress(id: number, dto: Partial<AddressDto>) {
  try {
  const res = await api.patch(`/enderecos/${id}`, dto);
    return res.data as AddressDto;
  } catch (err) {
    console.error('updateAddress failed', err instanceof Error ? err.message : String(err));
    throw err;
  }
}

export async function deleteAddress(id: number) {
  try {
  await api.delete(`/enderecos/${id}`);
    return true;
  } catch (err) {
    console.error('deleteAddress failed', err instanceof Error ? err.message : String(err));
    throw err;
  }
}
