import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Telefone } from './telefone.entity';
import { CreateTelefoneDto } from './dto/create-telefone.dto';

@Injectable()
export class TelefoneService {
  constructor(
    @InjectRepository(Telefone)
    private telefoneRepository: Repository<Telefone>,
  ) {}

  findAll(): Promise<Telefone[]> {
    return this.telefoneRepository.find();
  }

  findByUsuario(usuarioId: number): Promise<Telefone[]> {
    return this.telefoneRepository.find({ where: { Usuario_id: usuarioId } });
  }

  findOne(id: number): Promise<Telefone | null> {
    return this.telefoneRepository.findOneBy({ id });
  }

  create(dto: CreateTelefoneDto): Promise<Telefone> {
    return this.telefoneRepository.save(dto as any);
  }

  async update(id: number, dto: Partial<CreateTelefoneDto>): Promise<Telefone> {
    await this.telefoneRepository.update(id, dto as any);
    const telefone = await this.findOne(id);
    if (!telefone) throw new Error('Telefone não encontrado');
    return telefone;
  }

  async remove(id: number): Promise<void> {
    await this.telefoneRepository.delete(id);
  }
}
