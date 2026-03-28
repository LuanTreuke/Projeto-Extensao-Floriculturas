import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Telefone } from './telefone.entity';
import { TelefoneService } from './telefone.service';
import { TelefoneController } from './telefone.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Telefone])],
  providers: [TelefoneService],
  controllers: [TelefoneController],
  exports: [TelefoneService],
})
export class TelefoneModule {}
