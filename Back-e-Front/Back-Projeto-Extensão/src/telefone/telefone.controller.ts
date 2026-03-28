import { Controller, Get, Post, Body, Param, Patch, Delete } from '@nestjs/common';
import { TelefoneService } from './telefone.service';
import { CreateTelefoneDto } from './dto/create-telefone.dto';

@Controller('telefones')
export class TelefoneController {
  constructor(private readonly telefoneService: TelefoneService) {}

  @Get()
  findAll() {
    return this.telefoneService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.telefoneService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateTelefoneDto) {
    return this.telefoneService.create(dto);
  }

  @Get('usuario/:usuarioId')
  findByUsuario(@Param('usuarioId') usuarioId: string) {
    const id = Number(usuarioId);
    return this.telefoneService.findByUsuario(id);
  }
  @Patch(':id')
  update(@Param('id') id: number, @Body() dto: Partial<CreateTelefoneDto>) {
    return this.telefoneService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: number) {
    return this.telefoneService.remove(id);
  }
}
