import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Endereco } from '../endereco/endereco.entity';
import { Usuario } from '../usuario/usuario.entity';

export enum PedidoStatus {
  RECEBIDO = 'Recebido',
  PREPARANDO = 'Preparando',
  EM_ROTA = 'Em_Rota',
  CANCELADO = 'Cancelado',
  ENTREGUE = 'Entregue',
}

@Entity('Pedido')
export class Pedido {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  imagem_entrega: string;

  @Column({ type: 'time', nullable: true })
  hora_entrega: string;

  @Column({ type: 'date', nullable: true })
  data_entrega: string;

  @Column({ length: 255, nullable: true })
  nome_destinatario: string;

  @Column({ type: 'date', nullable: true })
  data_pedido: string;

  @Column({ type: 'time', nullable: true })
  hora_pedido: string;

  @Column({ length: 255, nullable: true })
  nome_cliente: string;

  @Column({ length: 15, nullable: true })
  telefone_cliente: string;

  @Column({ type: 'enum', enum: PedidoStatus, default: PedidoStatus.RECEBIDO })
  status: PedidoStatus;

  @Column({ type: 'tinyint', default: 0 })
  pagamento_confirmado: boolean;

  @Column({ type: 'tinyint', default: 0 })
  cobrar_no_endereco: boolean;

  @Column({ type: 'tinyint', default: 0 })
  vem_retirar: boolean;

  @Column({ type: 'text', nullable: true })
  observacao: string;

  @Column({ type: 'text', nullable: true })
  carrinho: string;

  // When false, the system should not send notifications (Whatsapp) for this pedido
  @Column({ type: 'tinyint', default: 1 })
  notifications_enabled: boolean;

  @ManyToOne(() => Endereco)
  @JoinColumn({ name: 'Endereco_id' })
  endereco: Endereco;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'Usuario_id' })
  usuario: Usuario;
}