import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Usuario } from '../usuario/usuario.entity';

@Entity('endereco')
export class Endereco {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  rua: string;

  @Column({ length: 10 })
  numero: string;

  @Column({ length: 255 })
  bairro: string;

  @Column({ length: 255 })
  cep: string;

  @Column({ length: 50 })
  cidade: string;

  @Column({ type: 'text', nullable: true })
  complemento: string;

  @Column({ name: 'Usuario_id', nullable: true })
  Usuario_id: number;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'Usuario_id' })
  usuario?: Usuario;
}
