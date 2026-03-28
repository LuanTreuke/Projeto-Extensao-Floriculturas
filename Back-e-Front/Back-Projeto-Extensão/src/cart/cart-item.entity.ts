import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Produto } from '../produto/produto.entity';

@Entity('cart_item')
export class CartItem {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @ManyToOne(() => (require('./cart.entity') as any).Cart, (cart: any) => cart.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'Cart_id' })
  cart: any;

  @ManyToOne(() => Produto, { nullable: true })
  @JoinColumn({ name: 'Produto_id' })
  produto: Produto | null;

  @Column('int')
  quantidade: number;

  @Column('decimal', { precision: 10, scale: 2, name: 'preco_unitario' })
  precoUnitario: number;

  @Column({ type: 'json', nullable: true })
  meta: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
