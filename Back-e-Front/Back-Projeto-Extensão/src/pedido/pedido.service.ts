import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pedido, PedidoStatus } from './pedido.entity';
import { CreatePedidoDto } from './dto/create-pedido.dto';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { UsuarioService } from '../usuario/usuario.service';

@Injectable()
export class PedidoService {
  constructor(
    @InjectRepository(Pedido)
    private pedidoRepository: Repository<Pedido>,
    private readonly whatsappService: WhatsappService,
    private readonly usuarioService: UsuarioService,
  ) {}

  private readonly logger = new Logger(PedidoService.name);

  findAll(): Promise<Pedido[]> {
    console.log('[PedidoService.findAll] starting...');
    try {
      const result = this.pedidoRepository.find({
        relations: ['endereco', 'usuario']
      });
      console.log('[PedidoService.findAll] query executed');
      return result;
    } catch (error) {
      console.error('[PedidoService.findAll] error:', error);
      throw error;
    }
  }

  findByUsuario(usuarioId: number): Promise<Pedido[]> {
    // Use query builder and explicit joins to ensure correct filtering by FK column
    return this.pedidoRepository
      .createQueryBuilder('pedido')
      .leftJoinAndSelect('pedido.endereco', 'endereco')
      .leftJoinAndSelect('pedido.usuario', 'usuario')
      .where('pedido.Usuario_id = :usuarioId', { usuarioId })
      .getMany();
  }

  findOne(id: number): Promise<Pedido | null> {
    return this.pedidoRepository.findOne({ where: { id }, relations: ['endereco', 'usuario'] });
  }

  async create(dto: CreatePedidoDto): Promise<Pedido> {
    // Preencher data/hora do pedido automaticamente quando não fornecidas
    const now = new Date();
    if (!dto.data_pedido) {
      // YYYY-MM-DD (formato DATE do MySQL) - usando timezone local
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      dto.data_pedido = `${year}-${month}-${day}`;
    }
    if (!dto.hora_pedido) {
      // HH:MM:SS (formato TIME do MySQL) - toTimeString já usa hora local
      dto.hora_pedido = now.toTimeString().slice(0, 8);
    }

    // Validate delivery date/time is not in the past when provided
    if (dto.data_entrega) {
      try {
        let timePart = dto.hora_entrega && dto.hora_entrega.trim().length ? dto.hora_entrega.trim() : '23:59:59';
        if (timePart.length === 5) timePart = timePart + ':00';
        const delivery = new Date(`${dto.data_entrega}T${timePart}`);
        if (isNaN(delivery.getTime())) {
          throw new BadRequestException('Data ou hora de entrega inválida');
        }
        const nowCheck = new Date();
        if (delivery.getTime() < nowCheck.getTime()) {
          throw new BadRequestException('Data e hora de entrega não podem ser anteriores à data/hora atual');
        }
      } catch (e) {
        if (e instanceof BadRequestException) throw e;
        throw new BadRequestException('Erro ao validar data de entrega');
      }
    }

  // If telefone_cliente not provided but Usuario_id points to a user with telefone, fill it from the user
  if ((!dto.telefone_cliente || !dto.telefone_cliente.trim()) && dto.Usuario_id) {
    try {
      const u = await this.usuarioService.findById(dto.Usuario_id);
      if (u && u.telefone && String(u.telefone).trim()) {
        dto.telefone_cliente = String(u.telefone).trim();
      }
    } catch (e) {
      // ignore — we'll validate below and report missing if still not present
    }
  }

  // Validate required fields (all fields except observacao are mandatory)
  const missing: string[] = [];
  if (!dto.Endereco_id) missing.push('Endereco_id');
  if (!dto.Usuario_id) missing.push('Usuario_id');
  if (!dto.nome_cliente || !dto.nome_cliente.trim()) missing.push('nome_cliente');
  if (!dto.telefone_cliente || !dto.telefone_cliente.trim()) missing.push('telefone_cliente');
  if (!dto.nome_destinatario || !dto.nome_destinatario.trim()) missing.push('nome_destinatario');
  if (!dto.data_entrega) missing.push('data_entrega');
  if (!dto.hora_entrega) missing.push('hora_entrega');
  if (!dto.carrinho) missing.push('carrinho');
  if (missing.length > 0) throw new BadRequestException('Campos obrigatórios ausentes: ' + missing.join(', '));

  const pedido = this.pedidoRepository.create({
      // map relation ids into relation objects so TypeORM sets the FK columns
      ...dto,
      endereco: dto.Endereco_id ? { id: dto.Endereco_id } as any : undefined,
      usuario: dto.Usuario_id ? { id: dto.Usuario_id } as any : undefined,
      status: (dto.status as PedidoStatus) || PedidoStatus.RECEBIDO,
    });
    try {
      const saved = await this.pedidoRepository.save(pedido);

      // attempt to send a whatsapp confirmation to the user (only if notifications enabled)
      try {
        // load relations to access usuario telefone and notification flag
        const full = await this.pedidoRepository.findOne({ where: { id: (saved as any).id }, relations: ['usuario'] });
        // Interpret notifications_enabled consistently: accept 0/'0'/false as disabled.
        const rawNot = (full as any)?.notifications_enabled;
        const notificationsEnabled = rawNot === undefined || rawNot === null ? true : !(rawNot === 0 || rawNot === '0' || rawNot === false);
        if (notificationsEnabled) {
          const phone = full?.usuario?.telefone || saved.telefone_cliente;
          this.logger.log(
            `[pedido_whatsapp] event=send_attempt pedidoId=${(saved as any).id} notificationsEnabled=${notificationsEnabled} phone=${this.maskPhone(phone)}`,
          );
          const cartText = this.formatCartMessage(saved.carrinho);
          
          // Construir mensagem detalhada
          let message = `Recebemos seu pedido:\n${cartText}\n`;
          
          // Adicionar destinatário
          if (saved.nome_destinatario) {
            message += `- Para: ${saved.nome_destinatario}\n`;
          }
          
          // Adicionar data e hora de entrega
          if (saved.data_entrega) {
            const dataFormatada = this.formatDateBR(saved.data_entrega);
            message += `- Data de entrega: ${dataFormatada}\n`;
          }
          if (saved.hora_entrega) {
            message += `- Hora de entrega: ${saved.hora_entrega}\n`;
          }
          
          // Adicionar observação se houver
          if (saved.observacao && saved.observacao.trim()) {
            message += `- Observação: ${saved.observacao}\n`;
          }
          
          // Adicionar cobrar no endereço se marcado
          if (saved.cobrar_no_endereco) {
            message += `- Cobrar no endereço\n`;
          }
          
          message += `\nAguarde enquanto confirmamos seu pedido, se precisar de algo a mais é só nos contatar!`;
          
          const sendResult = await this.whatsappService.sendMessage(phone, message);
          if (!sendResult.ok) {
            this.logger.warn(
              `[pedido_whatsapp] event=send_failed pedidoId=${(saved as any).id} reason=${sendResult.reason}${sendResult.error ? ` error="${sendResult.error}"` : ''}`,
            );
          } else {
            this.logger.log(`[pedido_whatsapp] event=send_success pedidoId=${(saved as any).id}`);
          }
        } else {
          this.logger.log(`Notifications disabled for pedido id=${(saved as any).id}; skipping whatsapp send.`);
        }
      } catch (e) {
        this.logger.error('Failed to send whatsapp for new pedido', e && e.stack ? e.stack : e);
      }

      return saved;
    } catch (err) {
      // Log detailed context for debugging
      console.error('Failed to save Pedido. DTO:', dto);
      console.error('Created entity to save:', pedido);
      console.error('Save error:', err && err.stack ? err.stack : err);
      // Surface a concise message to the client
      throw new InternalServerErrorException('Falha ao salvar pedido: ' + (err && err.message ? err.message : String(err)));
    }
  }

  async updateStatus(id: number, status: PedidoStatus): Promise<Pedido> {
    const pedido = await this.pedidoRepository.findOneBy({ id });
    if (!pedido) throw new NotFoundException('Pedido não encontrado');
    // validar status recebido
    const allowed = Object.values(PedidoStatus);
    if (!allowed.includes(status)) {
      throw new BadRequestException(`Status inválido. Valores válidos: ${allowed.join(', ')}`);
    }

    // Preferir atualização parcial para não regravar relações
    try {
      await this.pedidoRepository.update(id, { status });
      const updated = await this.pedidoRepository.findOne({ where: { id }, relations: ['endereco', 'usuario'] });
      if (!updated) throw new NotFoundException('Pedido não encontrado após atualização');

      // send whatsapp on status changes
      try {
        const rawNot = (updated as any)?.notifications_enabled;
        const notificationsEnabled = rawNot === undefined || rawNot === null ? true : !(rawNot === 0 || rawNot === '0' || rawNot === false);
        if (notificationsEnabled) {
          const phone = updated.usuario?.telefone || updated.telefone_cliente;
          this.logger.log(
            `[pedido_whatsapp] event=send_attempt pedidoId=${id} notificationsEnabled=${notificationsEnabled} phone=${this.maskPhone(phone)}`,
          );
          const msg = this.messageForStatus(updated.status);
          if (msg) {
            const sendResult = await this.whatsappService.sendMessage(phone, msg);
            if (!sendResult.ok) {
              this.logger.warn(
                `[pedido_whatsapp] event=send_failed pedidoId=${id} status=${updated.status} reason=${sendResult.reason}${sendResult.error ? ` error="${sendResult.error}"` : ''}`,
              );
            } else {
              this.logger.log(`[pedido_whatsapp] event=send_success pedidoId=${id} status=${updated.status}`);
            }
          }
        } else {
          this.logger.log(`Notifications disabled for pedido id=${id}; skipping whatsapp on status=${updated.status}`);
        }
      } catch (e) {
        this.logger.error('Failed to send whatsapp on status update', e && e.stack ? e.stack : e);
      }

      return updated;
    } catch (err) {
      // logs detalhados para depuração
      console.error('Failed to update pedido status (partial update). id:', id);
      console.error('Status recebido:', status);
      console.error('Erro completo:', err && err.stack ? err.stack : err);
      throw new InternalServerErrorException('Falha ao atualizar status do pedido');
    }
  }

  private formatDateBR(dateStr?: string): string | null {
    if (!dateStr) return null;
    try {
      // dateStr vem no formato YYYY-MM-DD (ex: 2025-11-24)
      const [year, month, day] = dateStr.split('-');
      return `${day}/${month}/${year}`;
    } catch (_) {
      return dateStr; // retorna original se falhar
    }
  }

  private formatCartMessage(carrinho?: string) {
    if (!carrinho) return '• (não há itens registrados)';
    try {
      const parsed = JSON.parse(carrinho);
      // Support two shapes:
      // 1) an array: [ { id, nome, quantidade } ]
      // 2) an object with .cart: { cart: [ ... ] }
      const items = Array.isArray(parsed) ? parsed : (parsed && Array.isArray((parsed as any).cart) ? (parsed as any).cart : null);
      if (items && Array.isArray(items)) {
        return items
          .map((it: any) => {
            const name = it.nome || it.name || it.title || 'Produto';
            const qty = typeof it.quantidade !== 'undefined' ? it.quantidade : (typeof it.quantity !== 'undefined' ? it.quantity : 1);
            return `• ${name} x ${qty}`;
          })
          .join('\n');
      }
    } catch (_) {
      // not JSON, fall back to raw string
    }
    return String(carrinho).split('\n').map((l) => `• ${l}`).join('\n');
  }

  private messageForStatus(status: PedidoStatus): string | null {
    switch (status) {
      case PedidoStatus.CANCELADO:
        return 'Seu pedido foi cancelado. Se precisar, entre em contato conosco.';
      case PedidoStatus.PREPARANDO:
        return 'Seu pedido está sendo preparado!';
      case PedidoStatus.EM_ROTA:
        return 'Seu pedido saiu para entrega!';
      case PedidoStatus.ENTREGUE:
        return 'Seu pedido foi entregue! Obrigado por comprar conosco.';
      case PedidoStatus.RECEBIDO:
        return 'Recebemos seu pedido e em breve o confirmaremos.';
      default:
        return null;
    }
  }

  private maskPhone(phone?: string): string {
    if (!phone) return 'unknown';
    const digits = String(phone).replace(/\D/g, '');
    if (digits.length <= 4) return digits || 'unknown';
    return `***${digits.slice(-4)}`;
  }

  // Update the notifications_enabled flag for a pedido
  async setNotificationsEnabled(id: number, enabled: boolean): Promise<Pedido> {
    const pedido = await this.pedidoRepository.findOneBy({ id });
    if (!pedido) throw new NotFoundException('Pedido não encontrado');
    try {
      await this.pedidoRepository.update(id, { notifications_enabled: enabled } as any);
      const updated = await this.pedidoRepository.findOne({ where: { id }, relations: ['endereco', 'usuario'] });
      if (!updated) throw new NotFoundException('Pedido não encontrado após atualização');
      return updated;
    } catch (err) {
      this.logger.error('Failed to update notifications_enabled for pedido id=' + id, err && err.stack ? err.stack : err);
      throw new InternalServerErrorException('Falha ao atualizar preferência de notificações');
    }
  }
}
