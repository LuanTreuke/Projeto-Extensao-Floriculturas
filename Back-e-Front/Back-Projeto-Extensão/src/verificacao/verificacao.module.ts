import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PhoneVerification } from './verificacao.entity';
import { VerificacaoService } from './verificacao.service';
import { VerificacaoController } from './verificacao.controller';
import { UsuarioModule } from '../usuario/usuario.module';

@Module({
  imports: [TypeOrmModule.forFeature([PhoneVerification]), UsuarioModule],
  providers: [VerificacaoService],
  controllers: [VerificacaoController],
  exports: [VerificacaoService],
})
export class VerificacaoModule {}
