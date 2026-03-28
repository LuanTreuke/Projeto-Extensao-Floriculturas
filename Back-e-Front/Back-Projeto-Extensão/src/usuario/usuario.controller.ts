import { Controller, Post, Body, Patch, Get, Param, Delete } from '@nestjs/common';
import { UsuarioService } from './usuario.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { LoginUsuarioDto } from './dto/login-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';

@Controller('usuario')
export class UsuarioController {
  constructor(private readonly usuarioService: UsuarioService) {}

  @Post('login')
  async login(@Body() loginDto: LoginUsuarioDto) {
    const usuario = await this.usuarioService.validateLogin(loginDto.email, loginDto.senha);
    if (!usuario) {
      return { success: false, message: 'Credenciais inválidas' };
    }
    // Retorne apenas dados seguros
    return { success: true, usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, role: usuario.role } };
  }

  @Post('cadastro')
  async cadastro(@Body() createUsuarioDto: CreateUsuarioDto) {
    const exists = await this.usuarioService.findByEmail(createUsuarioDto.email);
    if (exists) {
      return { success: false, message: 'Email já cadastrado' };
    }
    const usuario = await this.usuarioService.create(createUsuarioDto);
    return { success: true, usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, role: usuario.role } };
  }

  @Patch('telefone')
  async updateTelefone(@Body() body: { id: number; telefone?: string }) {
    const usuario = await this.usuarioService.update(body.id, { telefone: body.telefone });
    if (!usuario) return { success: false, message: 'Usuário não encontrado' };
    // return safe user object
    return { success: true, usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, telefone: usuario.telefone } };
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    const usuario = await this.usuarioService.findById(Number(id));
    if (!usuario) return { success: false, message: 'Usuário não encontrado' };
    return { success: true, usuario };
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    try {
      const result = await this.usuarioService.delete(Number(id));
      return result;
    } catch (error) {
      return { success: false, message: error.message || 'Erro ao excluir conta' };
    }
  }
}

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuarioService: UsuarioService) {}

  @Get()
  async findAll() {
    const usuarios = await this.usuarioService.findAll();
    return usuarios;
  }
}
