import { PedidoStatus } from '../pedido.entity';

export class CreatePedidoDto {
  imagem_entrega?: string;
  hora_entrega?: string;
  data_entrega?: string;
  nome_destinatario?: string;
  data_pedido?: string;
  hora_pedido?: string;
  nome_cliente?: string;
  telefone_cliente?: string;
  status?: PedidoStatus;
  pagamento_confirmado?: boolean;
  cobrar_no_endereco?: boolean;
  vem_retirar?: boolean;
  observacao?: string;
  carrinho?: string;
  Endereco_id: number;
  Usuario_id: number;
}

