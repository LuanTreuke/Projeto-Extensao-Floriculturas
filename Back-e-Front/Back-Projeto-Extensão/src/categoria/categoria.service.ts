import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Categoria } from './categoria.entity';

@Injectable()
export class CategoriaService {
  constructor(
    @InjectRepository(Categoria)
    private categoriaRepository: Repository<Categoria>,
  ) {}

  findAll(): Promise<Categoria[]> {
    return this.categoriaRepository.find({ order: { ordem: 'ASC', id: 'ASC' } });
  }

  async createIfNotExists(nome: string): Promise<Categoria> {
    let found = await this.categoriaRepository.findOneBy({ nome });
    if (found) return found;
    const cat = this.categoriaRepository.create({ nome });
    return this.categoriaRepository.save(cat);
  }

  async create(nome: string): Promise<Categoria> {
    // Get the highest ordem value and add 10
    const maxOrdem = await this.categoriaRepository
      .createQueryBuilder('categoria')
      .select('MAX(categoria.ordem)', 'max')
      .getRawOne();
    const nextOrdem = (maxOrdem?.max ?? 0) + 10;
    const cat = this.categoriaRepository.create({ nome, ordem: nextOrdem });
    return this.categoriaRepository.save(cat);
  }

  async update(id: number, nome: string): Promise<Categoria | null> {
    const existing = await this.categoriaRepository.findOneBy({ id });
    if (!existing) return null;
    existing.nome = nome;
    return this.categoriaRepository.save(existing);
  }

  async remove(id: number): Promise<boolean> {
    const res = await this.categoriaRepository.delete(id);
    return (res.affected ?? 0) > 0;
  }

  async moveUp(id: number): Promise<Categoria[]> {
    const current = await this.categoriaRepository.findOneBy({ id });
    if (!current) return this.findAll();

    // Find the category with the next lower ordem value
    const previous = await this.categoriaRepository
      .createQueryBuilder('categoria')
      .where('categoria.ordem < :ordem', { ordem: current.ordem })
      .orderBy('categoria.ordem', 'DESC')
      .getOne();

    if (previous) {
      // Swap ordem values
      const tempOrdem = current.ordem;
      current.ordem = previous.ordem;
      previous.ordem = tempOrdem;
      await this.categoriaRepository.save([current, previous]);
    }

    return this.findAll();
  }

  async moveDown(id: number): Promise<Categoria[]> {
    const current = await this.categoriaRepository.findOneBy({ id });
    if (!current) return this.findAll();

    // Find the category with the next higher ordem value
    const next = await this.categoriaRepository
      .createQueryBuilder('categoria')
      .where('categoria.ordem > :ordem', { ordem: current.ordem })
      .orderBy('categoria.ordem', 'ASC')
      .getOne();

    if (next) {
      // Swap ordem values
      const tempOrdem = current.ordem;
      current.ordem = next.ordem;
      next.ordem = tempOrdem;
      await this.categoriaRepository.save([current, next]);
    }

    return this.findAll();
  }
}
