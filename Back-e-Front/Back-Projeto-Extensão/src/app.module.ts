import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProdutoModule } from './produto/produto.module';
import { CategoriaModule } from './categoria/categoria.module';
import { UsuarioModule } from './usuario/usuario.module';
import { PedidoModule } from './pedido/pedido.module';
import { EnderecoModule } from './endereco/endereco.module';
import { TelefoneModule } from './telefone/telefone.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { CartModule } from './cart/cart.module';
import { UploadModule } from './upload/upload.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: false,
    }),
  ProdutoModule,
  CategoriaModule,
  UsuarioModule,
  PedidoModule,
  EnderecoModule,
  TelefoneModule,
  WhatsappModule,
  CartModule,
  UploadModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
