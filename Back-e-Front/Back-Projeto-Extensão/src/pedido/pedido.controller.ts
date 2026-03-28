import { Controller, Get, Post, Patch, Param, Body, ParseEnumPipe, Headers, ForbiddenException, ParseIntPipe, NotFoundException, Logger } from '@nestjs/common';
import { PedidoService } from './pedido.service';
import { PedidoStatus } from './pedido.entity';
import { CreatePedidoDto } from './dto/create-pedido.dto';
import { UsuarioService } from '../usuario/usuario.service';

@Controller('pedidos')
export class PedidoController {
  private readonly logger = new Logger(PedidoController.name);
  constructor(private readonly pedidoService: PedidoService, private readonly usuarioService: UsuarioService) {}

  @Get()
  async findAll(@Headers('x-user-id') userId: string) {
    console.log('[PedidoController.findAll] userId:', userId);
    try {
      const u = userId ? await this.usuarioService.findById(Number(userId)) : null;
      console.log('[PedidoController.findAll] user found:', u ? { id: u.id, role: u.role } : null);
      if (!u || u.role !== 'Admin') throw new ForbiddenException('Acesso negado');
      console.log('[PedidoController.findAll] calling pedidoService.findAll()');
      const result = await this.pedidoService.findAll();
      console.log('[PedidoController.findAll] success, items count:', Array.isArray(result) ? result.length : 'not array');
      return result;
    } catch (error) {
      console.error('[PedidoController.findAll] error:', error);
      throw error;
    }
  }

  @Get('usuario/:usuarioId')
  findByUsuario(@Param('usuarioId', ParseIntPipe) usuarioId: number) {
    return this.pedidoService.findByUsuario(usuarioId);
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.pedidoService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreatePedidoDto) {
    return this.pedidoService.create(dto);
  }

  @Patch(':id/status')
  async updateStatus(
    @Headers('x-user-id') userId: string,
    @Param('id') id: number,
    @Body('status', new ParseEnumPipe(PedidoStatus)) status: PedidoStatus,
  ) {
    // Resolve the caller (may be undefined for anonymous requests)
    const caller = userId ? await this.usuarioService.findById(Number(userId)) : null;

    // If caller is Admin, allow any status change
    if (caller && caller.role === 'Admin') {
      return this.pedidoService.updateStatus(id, status);
    }

    // Non-admins are only allowed to cancel their own orders
    if (!caller) throw new ForbiddenException('Acesso negado');

    if (status !== PedidoStatus.CANCELADO) {
      // regular users cannot change other statuses
      throw new ForbiddenException('Acesso negado');
    }

    // verify order ownership
    const pedido = await this.pedidoService.findOne(id);
    if (!pedido) throw new NotFoundException('Pedido não encontrado');
    const ownerId = pedido.usuario?.id;
    if (!ownerId || ownerId !== caller.id) {
      throw new ForbiddenException('Somente o proprietário do pedido pode cancelá-lo');
    }

    // Client is canceling their own order
    return this.pedidoService.updateStatus(id, status);
  }

  // Admin-only: toggle per-order notifications
  @Patch(':id/notifications')
  async setNotifications(
    @Headers('x-user-id') userId: string,
    @Param('id', ParseIntPipe) id: number,
    @Body('enabled') enabled: boolean,
  ) {
    const caller = userId ? await this.usuarioService.findById(Number(userId)) : null;
    if (!caller || caller.role !== 'Admin') throw new ForbiddenException('Acesso negado');
    this.logger.log(`Admin ${caller?.id ?? 'unknown'} requested notifications_enabled=${enabled} for pedido id=${id}`);
    // delegate to service to update the flag
    const updated = await this.pedidoService.setNotificationsEnabled(id, !!enabled);
    this.logger.log(`Updated pedido id=${id} notifications_enabled=${(updated as any)?.notifications_enabled}`);
    return updated;
  }
}