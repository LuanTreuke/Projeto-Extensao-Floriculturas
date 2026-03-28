import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cart } from './cart.entity';
import { CartItem } from './cart-item.entity';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { Usuario } from '../usuario/usuario.entity';
import { Produto } from '../produto/produto.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Cart, CartItem, Usuario, Produto])],
  providers: [CartService],
  controllers: [CartController],
  exports: [CartService],
})
export class CartModule {}
