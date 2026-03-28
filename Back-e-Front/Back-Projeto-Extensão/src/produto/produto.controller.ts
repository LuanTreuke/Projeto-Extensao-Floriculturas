import { Controller, Get, Param, Post, Body, Delete, Patch, Headers, ForbiddenException } from '@nestjs/common';
import { ProdutoService } from './produto.service';
import { Produto } from './produto.entity';
import { CreateProdutoDto } from './dto/create-produto.dto';
import { UsuarioService } from '../usuario/usuario.service';

@Controller('produtos')
export class ProdutoController {
  constructor(private readonly produtoService: ProdutoService, private readonly usuarioService: UsuarioService) {}

  @Get()
  findAll(): Promise<Produto[]> {
    return this.produtoService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: number) {
    return this.produtoService.findOne(+id);
  }

  @Post()
  async create(@Headers('x-user-id') userId: string, @Body() dto: CreateProdutoDto) {
    const u = userId ? await this.usuarioService.findById(Number(userId)) : null;
    if (!u || u.role !== 'Admin') throw new ForbiddenException('Acesso negado');
    return this.produtoService.create(dto);
  }

  @Patch(':id')
  async update(@Headers('x-user-id') userId: string, @Param('id') id: number, @Body() dto: any) {
    const u = userId ? await this.usuarioService.findById(Number(userId)) : null;
    if (!u || u.role !== 'Admin') throw new ForbiddenException('Acesso negado');
    return this.produtoService.update(+id, dto);
  }

  @Delete(':id')
  async remove(@Headers('x-user-id') userId: string, @Param('id') id: number) {
    const u = userId ? await this.usuarioService.findById(Number(userId)) : null;
    if (!u || u.role !== 'Admin') throw new ForbiddenException('Acesso negado');
    return this.produtoService.remove(+id);
  }
}
