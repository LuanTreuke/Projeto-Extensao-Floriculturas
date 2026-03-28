import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from './usuario.entity';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsuarioService {
  constructor(
    @InjectRepository(Usuario)
    private usuarioRepository: Repository<Usuario>,
  ) {}

  async findByEmail(email: string) {
    return this.usuarioRepository.findOne({ where: { email } });
  }

  async create(data: { nome: string; email: string; senha: string; telefone?: string; data_cadastro?: string }) {
    if (!data.senha) throw new Error('Senha obrigatória');
    const hashed = await bcrypt.hash(data.senha, 10);
    
    // Se data_cadastro foi enviada pelo frontend (formato YYYY-MM-DD), usar ela diretamente
    // Se não, formatar a data atual no formato YYYY-MM-DD
    let dataCadastro: string | Date;
    if (data.data_cadastro) {
      // Já vem no formato correto YYYY-MM-DD do frontend
      dataCadastro = data.data_cadastro;
    } else {
      // Gerar data atual no formato local
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      dataCadastro = `${year}-${month}-${day}`;
    }
    
    const usuario = this.usuarioRepository.create({ 
      ...data, 
      senha: hashed, 
      role: 'Cliente',
      data_cadastro: dataCadastro as any
    });
    return this.usuarioRepository.save(usuario);
  }

  async validateLogin(email: string, senha: string) {
    const usuario = await this.findByEmail(email);
    if (!usuario) return null;
    const valid = await bcrypt.compare(senha, usuario.senha);
    if (!valid) return null;
    return usuario;
  }

  async findById(id: number) {
    return this.usuarioRepository.findOne({ where: { id } });
  }

  async update(id: number, partial: Partial<{ nome: string; email: string; senha?: string; telefone?: string; role?: string }>) {
    // if senha present, hash it
    if (partial.senha) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const bcrypt = require('bcryptjs');
      // hash asynchronously
      (partial as any).senha = await bcrypt.hash(partial.senha, 10);
    }
    await this.usuarioRepository.update(id, partial as any);
    return this.findById(id);
  }

  async findAll() {
    return this.usuarioRepository.find({
      select: ['id', 'nome', 'email', 'telefone', 'role', 'data_cadastro'],
      // Não retornar senha por segurança
    });
  }

  async delete(id: number) {
    const usuario = await this.findById(id);
    if (!usuario) {
      throw new Error('Usuário não encontrado');
    }
    await this.usuarioRepository.delete(id);
    return { success: true, message: 'Conta excluída com sucesso' };
  }
}
