import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Produto } from './produto.entity';
import { Categoria } from '../categoria/categoria.entity';
import { ProdutoService } from './produto.service';
import { ProdutoController } from './produto.controller';
import { UsuarioModule } from '../usuario/usuario.module';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [TypeOrmModule.forFeature([Produto, Categoria]), UsuarioModule, UploadModule],
  providers: [ProdutoService],
  controllers: [ProdutoController],
})
export class ProdutoModule {}
