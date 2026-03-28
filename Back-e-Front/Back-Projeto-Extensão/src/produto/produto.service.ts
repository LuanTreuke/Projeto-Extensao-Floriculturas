import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Produto } from './produto.entity';
import { CreateProdutoDto } from './dto/create-produto.dto';
import { Categoria } from '../categoria/categoria.entity';
import { UploadService } from '../upload/upload.service';

@Injectable()
export class ProdutoService {
  constructor(
    @InjectRepository(Produto)
    private produtoRepository: Repository<Produto>,
    @InjectRepository(Categoria)
    private categoriaRepository: Repository<Categoria>,
    private readonly uploadService: UploadService,
  ) {}

  findAll(): Promise<Produto[]> {
    return this.produtoRepository.find({ relations: ['categoria'] });
  }

  async findOne(id: number): Promise<Produto | null> {
    return this.produtoRepository.findOne({ where: { id }, relations: ['categoria'] });
  }

  async create(dto: CreateProdutoDto): Promise<Produto> {
    let categoriaEntity: Categoria | undefined = undefined;
    if (dto.Categoria_id) {
      const found = await this.categoriaRepository.findOneBy({ id: dto.Categoria_id });
      if (!found) {
        throw new BadRequestException('Categoria inválida');
      }
      categoriaEntity = found;
    }

    // usar cast any/DeepPartial para evitar erros estritos de tipagem
    const payload: any = {
      nome: dto.nome,
      descricao: dto.descricao,
      preco: dto.preco,
      imagem_url: dto.imagem_url,
      categoria: categoriaEntity || null,
      enabled: dto.enabled !== undefined ? !!dto.enabled : true,
    };

    const produto = this.produtoRepository.create(payload);
    return (await this.produtoRepository.save(produto)) as unknown as Produto;
  }

  async remove(id: number): Promise<{ deleted: boolean }> {
    // Buscar produto para descobrir a imagem vinculada
    const existing = await this.produtoRepository.findOne({ where: { id } });

    const res = await this.produtoRepository.delete(id);
    const deleted = !!(res.affected && res.affected > 0);

    // Se o produto existia e foi apagado, tentar remover o arquivo físico
    if (deleted && existing?.imagem_url) {
      try {
        await this.uploadService.deleteFile(existing.imagem_url);
      } catch {
        // se falhar ao apagar o arquivo, não bloquear a exclusão do produto
      }
    }

    return { deleted };
  }

  async update(id: number, dto: any): Promise<Produto> {
    const { Categoria_id, ...rest } = dto;

    // Buscar produto atual para comparar imagem antiga
    const current = await this.produtoRepository.findOne({ where: { id }, relations: ['categoria'] });

    if (!current) throw new BadRequestException('Produto não encontrado');

    // validar categoria se foi enviada
    if (Categoria_id !== undefined && Categoria_id !== null) {
      const found = await this.categoriaRepository.findOneBy({ id: Categoria_id });
      if (!found) throw new BadRequestException('Categoria inválida');
    }

    // atualizar apenas os campos existentes na entidade (evita erro de propriedade)
    const allowed: any = {};
    if (rest.nome !== undefined) allowed.nome = rest.nome;
    if (rest.descricao !== undefined) allowed.descricao = rest.descricao;
    if (rest.preco !== undefined) allowed.preco = rest.preco;
    if (rest.imagem_url !== undefined) allowed.imagem_url = rest.imagem_url;
  if (rest.enabled !== undefined) allowed.enabled = !!rest.enabled;

    if (Object.keys(allowed).length > 0) {
      await this.produtoRepository.update(id, allowed);
    }

    // Se a imagem foi alterada/limpa, tentar remover a antiga
    if (rest.imagem_url !== undefined && current.imagem_url && rest.imagem_url !== current.imagem_url) {
      try {
        await this.uploadService.deleteFile(current.imagem_url);
      } catch {
        // se falhar ao apagar o arquivo, não bloquear a atualização
      }
    }

    // atualizar relação ManyToOne separadamente
    if (Categoria_id !== undefined) {
      if (Categoria_id === null || Categoria_id === '') {
        // remover relação (set null)
        await this.produtoRepository.createQueryBuilder().relation(Produto, 'categoria').of(id).set(null);
      } else {
        await this.produtoRepository.createQueryBuilder().relation(Produto, 'categoria').of(id).set(Categoria_id);
      }
    }

    const updated = await this.produtoRepository.findOne({ where: { id }, relations: ['categoria'] });
    if (!updated) throw new BadRequestException('Produto não encontrado');
    return updated as Produto;
  }
}
