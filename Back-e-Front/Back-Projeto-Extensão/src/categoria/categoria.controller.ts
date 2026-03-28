import { Controller, Get, Post, Body, Param, Put, Delete, HttpCode, NotFoundException, BadRequestException } from '@nestjs/common';
import { CategoriaService } from './categoria.service';
import { CreateCategoriaDto } from './dto/create-categoria.dto';

@Controller('categorias')
export class CategoriaController {
  constructor(private readonly categoriaService: CategoriaService) {}

  @Get()
  findAll() {
    return this.categoriaService.findAll();
  }

  @Post()
  @HttpCode(201)
  async create(@Body() dto: CreateCategoriaDto) {
    if (!dto || typeof dto.nome !== 'string' || dto.nome.trim().length === 0) {
      throw new BadRequestException('Campo "nome" é obrigatório');
    }
    return await this.categoriaService.create(dto.nome.trim());
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: CreateCategoriaDto) {
    if (!dto || typeof dto.nome !== 'string' || dto.nome.trim().length === 0) {
      throw new BadRequestException('Campo "nome" é obrigatório');
    }
    const updated = await this.categoriaService.update(Number(id), dto.nome.trim());
    if (!updated) throw new NotFoundException('Categoria não encontrada');
    return updated;
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string) {
    const success = await this.categoriaService.remove(Number(id));
    if (!success) throw new NotFoundException('Categoria não encontrada');
    return;
  }

  @Post(':id/move-up')
  async moveUp(@Param('id') id: string) {
    return await this.categoriaService.moveUp(Number(id));
  }

  @Post(':id/move-down')
  async moveDown(@Param('id') id: string) {
    return await this.categoriaService.moveDown(Number(id));
  }
}
