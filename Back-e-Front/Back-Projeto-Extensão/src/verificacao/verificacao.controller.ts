import { Controller, Post, Body } from '@nestjs/common';
import { VerificacaoService } from './verificacao.service';

@Controller('verificacao')
export class VerificacaoController {
  constructor(private readonly verificacaoService: VerificacaoService) {}

  @Post()
  async create(@Body() body: { usuarioId?: number; telefone?: string }) {
    const ent = await this.verificacaoService.createToken(body.usuarioId ?? null, body.telefone ?? undefined);
    return { ok: true, token: ent.token, expires_at: ent.expires_at };
  }

  @Post('consume')
  async consume(@Body() body: { token: string; fromJid: string }) {
    const res = await this.verificacaoService.consumeToken(body.token, body.fromJid);
    return res;
  }
}
