import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Endereco } from './endereco.entity';
import { CreateEnderecoDto } from './dto/create-endereco.dto';
import { Usuario } from '../usuario/usuario.entity';

@Injectable()
export class EnderecoService {
  constructor(
    @InjectRepository(Endereco)
    private enderecoRepository: Repository<Endereco>,
    @InjectRepository(Usuario)
    private userRepo: Repository<Usuario>,
  ) {}

  findAll(): Promise<Endereco[]> {
    return this.enderecoRepository.find();
  }

  findOne(id: number): Promise<Endereco | null> {
    return this.enderecoRepository.findOneBy({ id });
  }

  async create(dto: CreateEnderecoDto): Promise<Endereco> {
    const ent = this.enderecoRepository.create(dto as any);
    if (dto && dto.Usuario_id) {
      const u = await this.userRepo.findOne({ where: { id: dto.Usuario_id } });
      if (u) (ent as any).usuario = u;
    }
    const saved = await this.enderecoRepository.save(ent as any);
    return saved as Endereco;
  }

  async update(id: number, dto: Partial<CreateEnderecoDto>): Promise<Endereco> {
    // if updating Usuario_id, resolve relation explicitly
      const ent = await this.findOne(id);
      if (!ent) throw new Error('Endereço não encontrado');
      if (dto.Usuario_id) {
        const u = await this.userRepo.findOne({ where: { id: dto.Usuario_id } });
        (ent as any).usuario = u || null;
      } else {
        (ent as any).usuario = null;
      }
      // apply other fields
      Object.assign(ent, dto);
      await this.enderecoRepository.save(ent);
      return ent;
    }
    await this.enderecoRepository.update(id, dto);
    const endereco = await this.findOne(id);
    if (!endereco) throw new Error('Endereço não encontrado');
    return endereco;
  }

  async remove(id: number): Promise<void> {
    await this.enderecoRepository.delete(id);
  }
}
