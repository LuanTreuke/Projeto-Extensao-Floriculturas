import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Usuario {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nome: string;

  @Column({ unique: true })
  email: string;

  @Column()
  senha: string;

  @Column({ nullable: true })
  telefone: string;

  @Column({ nullable: true })
  whatsapp_jid: string;

  @Column({ default: 'Cliente' })
  role: 'Cliente' | 'Entregador' | 'Admin';

  @Column({ type: 'date', nullable: true })
  data_cadastro: Date;
}
