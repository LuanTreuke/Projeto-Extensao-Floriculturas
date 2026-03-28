import { Controller, Get, Post, Delete, Body } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';

@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  /**
   * GET /whatsapp/status
   * Retorna o status atual do cliente WhatsApp
   */
  @Get('status')
  getStatus() {
    return this.whatsappService.getStatus();
  }

  /**
   * GET /whatsapp/qr
   * Retorna o QR Code atual (se disponível)
   */
  @Get('qr')
  getQRCode() {
    const qr = this.whatsappService.getQRCode();
    return { qr };
  }

  /**
   * POST /whatsapp/connect
   * Inicia a conexão com WhatsApp (gera QR Code)
   */
  @Post('connect')
  async connect() {
    return await this.whatsappService.initialize();
  }

  /**
   * POST /whatsapp/send
   * Envia uma mensagem para um número
   */
  @Post('send')
  async sendMessage(
    @Body('to') to: string,
    @Body('message') message: string
  ) {
    if (!to || !message) {
      return {
        ok: false,
        reason: 'invalid_phone' as const,
        error: 'Parâmetros to e message são obrigatórios',
      };
    }

    return this.whatsappService.sendMessage(to, message);
  }

  /**
   * POST /whatsapp/restart
   * Reinicia o cliente WhatsApp
   */
  @Post('restart')
  async restart() {
    return await this.whatsappService.restart();
  }

  /**
   * DELETE /whatsapp/disconnect
   * Desconecta o cliente WhatsApp
   */
  @Delete('disconnect')
  async disconnect() {
    await this.whatsappService.disconnect();
    return { success: true, message: 'Cliente desconectado' };
  }
}

