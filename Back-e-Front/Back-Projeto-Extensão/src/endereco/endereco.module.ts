import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Endereco } from './endereco.entity';
import { Usuario } from '../usuario/usuario.entity';
import { EnderecoService } from './endereco.service';
import { EnderecoController } from './endereco.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Endereco, Usuario])],
  providers: [EnderecoService],
  controllers: [EnderecoController],
  exports: [EnderecoService],
})
export class EnderecoModule {}
