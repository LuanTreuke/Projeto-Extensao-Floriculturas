export class CreateEnderecoDto {
  rua: string;
  numero: string;
  bairro: string;
  cep: string;
  cidade: string;
  complemento?: string;
  Usuario_id?: number;
}
