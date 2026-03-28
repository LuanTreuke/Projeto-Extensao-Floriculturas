import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Usuario } from '../usuario/usuario.entity';

@Entity('telefone')
export class Telefone {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 30 })
  telefone: string;

  @Column({ name: 'Usuario_id', type: 'int', unsigned: true, nullable: true })
  Usuario_id: number;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'Usuario_id' })
  usuario?: Usuario;
}
