import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { PhoneVerification } from './verificacao.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { UsuarioService } from '../usuario/usuario.service';

@Injectable()
export class VerificacaoService {
  constructor(
    @InjectRepository(PhoneVerification)
    private readonly repo: Repository<PhoneVerification>,
    private readonly usuarioService: UsuarioService,
  ) {}

  private generateToken(len = 6) {
    // numeric token of length `len`
    const max = Math.pow(10, len) - 1;
    const n = Math.floor(Math.random() * (max + 1));
    return String(n).padStart(len, '0');
  }

  async createToken(usuarioId: number | null, telefone?: string, ttlMinutes = 30) {
    const token = this.generateToken(6);
    const now = new Date();
    const expires = new Date(now.getTime() + ttlMinutes * 60 * 1000);
    const ent = this.repo.create({
      token,
      Usuario_id: usuarioId ?? null,
      telefone: telefone ?? null,
      consumed: false,
      expires_at: expires,
    });
    await this.repo.save(ent);
    return ent;
  }

  async consumeToken(token: string, fromJid: string) {
    if (!token) throw new BadRequestException('token required');
    const ent = await this.repo.findOne({ where: { token } });
    if (!ent) throw new NotFoundException('token not found');
    if (ent.consumed) throw new BadRequestException('token already consumed');
    if (ent.expires_at && ent.expires_at.getTime() < Date.now()) {
      throw new BadRequestException('token expired');
    }

    // Resolve a usable phone before consuming the token.
    let phone: string | null = null;
    let correctJid = fromJid;

    if (fromJid.includes('@lid')) {
      // @lid may be a temporary WhatsApp identifier. Prefer the phone persisted with the token.
      phone = ent.telefone;
      if (phone) {
        correctJid = `${phone}@c.us`;
      }
    } else {
      const phoneMatch = (fromJid || '').match(/^(\d+)@/);
      phone = phoneMatch ? phoneMatch[1] : null;
      correctJid = fromJid;
    }

    if (ent.Usuario_id) {
      if (!phone) {
        throw new BadRequestException('could not resolve phone from sender jid');
      }
      const updateData: any = {
        telefone: phone,
        whatsapp_jid: correctJid,
      };
      await this.usuarioService.update(ent.Usuario_id, updateData);
    }

    // Mark as consumed only after successful updates.
    ent.consumed = true;
    ent.consumed_at = new Date();
    ent.consumed_jid = correctJid;
    await this.repo.save(ent);

    return { ok: true, token: ent.token, usuarioId: ent.Usuario_id, telefone: phone };
  }
}
