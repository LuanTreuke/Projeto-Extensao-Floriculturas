import { Controller, Get, Post, Put, Delete, Body, Query, Param } from '@nestjs/common';
import { CartService } from './cart.service';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  // GET /cart?Usuario_id=123
  @Get()
  async getCart(@Query('Usuario_id') Usuario_id: string) {
    const uid = Usuario_id ? Number(Usuario_id) : 0;
    const cart = await this.cartService.getCartByUser(uid as any);
    return cart || { items: [] };
  }

  // POST /cart/items
  // body: { Usuario_id, produtoId?, nome, preco, quantidade, imagem_url }
  @Post('items')
  async addItem(@Body() body: any) {
    const uid = body.Usuario_id ? Number(body.Usuario_id) : 0;
    const item = await this.cartService.addItem(uid as any, body);
    return item;
  }

  // POST /cart/merge  body: { Usuario_id, items: [...] }
  @Post('merge')
  async merge(@Body() body: any) {
    const uid = body.Usuario_id ? Number(body.Usuario_id) : 0;
    const items = Array.isArray(body.items) ? body.items : [];
    const cart = await this.cartService.mergeCart(uid as any, items);
    return cart;
  }

  // PUT /cart/items/:id  body: { quantidade }
  @Put('items/:id')
  async updateItem(@Param('id') id: string, @Body() body: any) {
    const item = await this.cartService.updateQty(Number(id), Number(body.quantidade));
    return item;
  }

  // DELETE /cart/items/:id
  @Delete('items/:id')
  async deleteItem(@Param('id') id: string) {
    await this.cartService.removeItem(Number(id));
    return { ok: true };
  }

  // POST /cart/clear  body: { Usuario_id }
  @Post('clear')
  async clear(@Body() body: any) {
    const uid = body.Usuario_id ? Number(body.Usuario_id) : 0;
    await this.cartService.clearCart(uid as any);
    return { ok: true };
  }
}
