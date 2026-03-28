import { Controller, Get, Post, Param, Body, Patch, Delete } from '@nestjs/common';
import { EnderecoService } from './endereco.service';
import { CreateEnderecoDto } from './dto/create-endereco.dto';

@Controller('enderecos')
export class EnderecoController {
  constructor(private readonly enderecoService: EnderecoService) {}

  @Get()
  findAll() {
    return this.enderecoService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.enderecoService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateEnderecoDto) {
    return this.enderecoService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: number, @Body() dto: Partial<CreateEnderecoDto>) {
    return this.enderecoService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: number) {
    return this.enderecoService.remove(id);
  }
}
