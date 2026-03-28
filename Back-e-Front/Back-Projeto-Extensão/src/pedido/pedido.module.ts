import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pedido } from './pedido.entity';
import { PedidoService } from './pedido.service';
import { PedidoController } from './pedido.controller';
import { Endereco } from '../endereco/endereco.entity';
import { EnderecoModule } from '../endereco/endereco.module';
import { UsuarioModule } from '../usuario/usuario.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { VerificacaoModule } from '../verificacao/verificacao.module';

@Module({
  imports: [TypeOrmModule.forFeature([Pedido, Endereco]), EnderecoModule, UsuarioModule, VerificacaoModule, WhatsappModule],
  providers: [PedidoService],
  controllers: [PedidoController],
  exports: [PedidoService],
})
export class PedidoModule {}
