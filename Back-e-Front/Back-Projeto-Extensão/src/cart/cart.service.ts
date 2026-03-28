import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from './cart.entity';
import { CartItem } from './cart-item.entity';
import { Usuario } from '../usuario/usuario.entity';
import { Produto } from '../produto/produto.entity';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart) private cartRepo: Repository<Cart>,
    @InjectRepository(CartItem) private itemRepo: Repository<CartItem>,
    @InjectRepository(Usuario) private userRepo: Repository<Usuario>,
    @InjectRepository(Produto) private produtoRepo: Repository<Produto>,
  ) {}

  async getCartByUser(Usuario_id: number) {
    if (!Usuario_id) return null;
    const cart = await this.cartRepo.findOne({
      where: { usuario: { id: Usuario_id } },
      relations: ['items', 'items.produto'],
    });
    return cart || null;
  }

  async ensureCartForUser(Usuario_id: number) {
    // ensure single cart per user. If multiple carts exist (race/dup), merge them.
    if (!Usuario_id) return null;
    // find all carts for user
    const carts = await this.cartRepo.find({ where: { usuario: { id: Usuario_id } }, relations: ['items', 'items.produto'] });
    if (carts && carts.length > 0) {
      // pick the first as canonical
      const primary = carts[0];
      if (carts.length > 1) {
        // merge items from other carts into primary
        for (let i = 1; i < carts.length; i++) {
          const other = carts[i];
          for (const it of other.items || []) {
            // try find existing by produto id or by meta.nome
            let found: CartItem | undefined;
            if (it.produto) {
              found = (primary.items || []).find((p) => p.produto && (p.produto as any).id === (it.produto as any).id);
            }
            if (!found && it.meta && (it.meta as any).nome) {
              found = (primary.items || []).find((p) => p.meta && (p.meta as any).nome === (it.meta as any).nome);
            }
            if (found) {
              found.quantidade = (found.quantidade || 0) + (it.quantidade || 0);
              await this.itemRepo.save(found);
            } else {
              // reassign item's cart to primary
              it.cart = primary;
              await this.itemRepo.save(it);
            }
          }
          // remove the other empty cart
          try { await this.cartRepo.remove(other); } catch (e) { /* ignore */ }
        }
      }
      return await this.cartRepo.findOne({ where: { id: primary.id }, relations: ['items', 'items.produto'] });
    }

    // no cart exists, create new
    const user = await this.userRepo.findOne({ where: { id: Usuario_id } });
    const cart = this.cartRepo.create();
    // assign properties safely
    (cart as any).usuario = user || null;
    (cart as any).items = [];
    await this.cartRepo.save(cart);
    return await this.cartRepo.findOne({ where: { id: (cart as any).id }, relations: ['items', 'items.produto'] });
  }

  async addItem(Usuario_id: number, payload: { produtoId?: number; nome?: string; preco: number; quantidade?: number; imagem_url?: string; meta?: any }) {
    const cart = await this.ensureCartForUser(Usuario_id);
    if (!cart) {
      // server-side add requires a user cart. Return null to indicate failure.
      return null;
    }
    const produto = payload.produtoId ? await this.produtoRepo.findOne({ where: { id: payload.produtoId } }) : null;

    // try find same produto in cart
    let existing: CartItem | undefined;
    if (produto) {
      existing = (cart.items || []).find((it) => it.produto && (it.produto as any).id === produto.id);
    } else if (payload.nome) {
      existing = (cart.items || []).find((it) => it.meta && (it.meta as any).nome === payload.nome);
    }

    if (existing) {
      existing.quantidade = (existing.quantidade || 0) + (payload.quantidade || 1);
      existing.precoUnitario = payload.preco; // update price snapshot
      await this.itemRepo.save(existing);
      return existing;
    }

    const item = this.itemRepo.create();
    item.cart = cart as any;
    item.produto = produto || null;
    item.quantidade = payload.quantidade || 1;
    item.precoUnitario = payload.preco;
    item.meta = { nome: payload.nome, imagem_url: payload.imagem_url, ...(payload.meta || {}) };
    await this.itemRepo.save(item);
    return item;
  }

  async updateQty(itemId: number, quantidade: number) {
    const item = await this.itemRepo.findOne({ where: { id: itemId }, relations: ['cart'] });
    if (!item) return null;
    if (quantidade <= 0) {
      await this.itemRepo.remove(item);
      return null;
    }
    item.quantidade = quantidade;
    return this.itemRepo.save(item);
  }

  async removeItem(itemId: number) {
    const item = await this.itemRepo.findOne({ where: { id: itemId } });
    if (!item) return null;
    await this.itemRepo.remove(item);
    return true;
  }

  async clearCart(Usuario_id: number) {
    const cart = await this.getCartByUser(Usuario_id);
    if (!cart) return null;
    if (cart.items && cart.items.length > 0) {
      await this.itemRepo.remove(cart.items);
    }
    return true;
  }

  /**
   * Merge an array of guest items into the user's cart.
   * items: [{ produtoId?, nome, preco, quantidade, imagem_url, meta }]
   */
  async mergeCart(Usuario_id: number, items: Array<any>) {
    if (!Usuario_id) return null;
    const cart = await this.ensureCartForUser(Usuario_id);
    if (!cart) return null;
    for (const payload of (items || [])) {
      const produto = payload.produtoId ? await this.produtoRepo.findOne({ where: { id: payload.produtoId } }) : null;
      // try find existing
      let existing: CartItem | undefined;
      if (produto) {
        existing = (cart.items || []).find((it) => it.produto && (it.produto as any).id === produto.id);
      }
      if (!existing && payload.nome) {
        existing = (cart.items || []).find((it) => it.meta && (it.meta as any).nome === payload.nome);
      }
      if (existing) {
        // avoid doubling when guest cart was a copy of server cart (logout preserved)
        // choose conservative merge: keep the larger quantity between server and guest
        existing.quantidade = Math.max((existing.quantidade || 0), (payload.quantidade || 0));
        await this.itemRepo.save(existing);
      } else {
        const it = this.itemRepo.create();
        it.cart = cart as any;
        it.produto = produto || null;
        it.quantidade = payload.quantidade || 1;
        it.precoUnitario = payload.preco || 0;
        it.meta = { nome: payload.nome, imagem_url: payload.imagem_url, ...(payload.meta || {}) };
        await this.itemRepo.save(it);
      }
    }
    return await this.cartRepo.findOne({ where: { id: (cart as any).id }, relations: ['items', 'items.produto'] });
  }
}
