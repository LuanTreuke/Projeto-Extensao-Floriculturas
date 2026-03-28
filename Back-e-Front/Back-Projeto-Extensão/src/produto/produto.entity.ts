import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Categoria } from '../categoria/categoria.entity';

@Entity('produto')
export class Produto {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  nome: string;

  @Column('text', { nullable: true })
  descricao: string;

  @Column('decimal', { precision: 10, scale: 2 })
  preco: number;

  @Column('text', { nullable: true })
  imagem_url: string;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @ManyToOne(() => Categoria, { nullable: true })
  @JoinColumn({ name: 'Categoria_id' })
  categoria: Categoria;
}
