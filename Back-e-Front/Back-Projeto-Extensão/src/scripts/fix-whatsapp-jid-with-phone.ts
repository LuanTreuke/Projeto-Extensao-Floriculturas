import { DataSource } from 'typeorm';
import { Usuario } from '../usuario/usuario.entity';

/**
 * Script para corrigir whatsapp_jid usando o telefone real do usuário
 * Converte números com @lid ou IDs inválidos para o formato correto usando o campo telefone
 * 
 * Uso: npx ts-node src/scripts/fix-whatsapp-jid-with-phone.ts
 */

async function fixWhatsAppJidWithPhone() {
  // Carregar variáveis de ambiente
  require('dotenv').config();

  const dataSource = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'floricultura',
    entities: [Usuario],
    synchronize: false,
    extra: {
      authPlugins: {
        mysql_native_password: () => () => Buffer.from([]),
        caching_sha2_password: () => () => Buffer.from([]),
      },
    },
  });

  try {
    console.log('🔌 Conectando ao banco de dados...');
    await dataSource.initialize();
    console.log('✅ Conectado ao banco de dados\n');

    const usuarioRepository = dataSource.getRepository(Usuario);

    // Buscar usuários com whatsapp_jid problemático
    // Critérios: contém @lid OU o número antes do @ tem mais de 15 dígitos (IDs inválidos)
    const todosUsuarios = await usuarioRepository.find();
    
    const usuariosProblematicos = todosUsuarios.filter(u => {
      if (!u.whatsapp_jid) return false;
      
      // Verificar se tem @lid
      if (u.whatsapp_jid.includes('@lid')) return true;
      
      // Verificar se o número é muito longo (ID inválido, não número de telefone)
      const phoneMatch = u.whatsapp_jid.match(/^(\d+)@/);
      if (phoneMatch && phoneMatch[1].length > 15) return true;
      
      return false;
    });

    console.log(`📊 Encontrados ${usuariosProblematicos.length} usuários com whatsapp_jid problemático\n`);

    if (usuariosProblematicos.length === 0) {
      console.log('✅ Nenhum registro precisa ser corrigido!');
      return;
    }

    console.log('🔧 Iniciando correção...\n');

    let corrigidos = 0;
    let semTelefone = 0;
    let erros = 0;

    for (const usuario of usuariosProblematicos) {
      try {
        if (!usuario.telefone) {
          console.log(`⚠️  ID ${usuario.id} (${usuario.nome}): Sem telefone cadastrado - marcando whatsapp_jid como NULL`);
          await usuarioRepository.update(usuario.id, {
            whatsapp_jid: undefined,
          });
          semTelefone++;
          continue;
        }

        // Usar o telefone real do cadastro
        const correctJid = `${usuario.telefone}@c.us`;

        console.log(`ID ${usuario.id} (${usuario.nome}):`);
        console.log(`  Telefone: ${usuario.telefone}`);
        console.log(`  Antigo: ${usuario.whatsapp_jid}`);
        console.log(`  Novo:   ${correctJid}\n`);

        // Atualizar no banco
        await usuarioRepository.update(usuario.id, {
          whatsapp_jid: correctJid,
        });

        corrigidos++;
      } catch (error) {
        console.error(`❌ Erro ao corrigir ID ${usuario.id}:`, error.message);
        erros++;
      }
    }

    console.log('='.repeat(60));
    console.log('📊 Resumo da correção:');
    console.log(`✅ Corrigidos com telefone real: ${corrigidos}`);
    console.log(`⚠️  Marcados como NULL (sem telefone): ${semTelefone}`);
    console.log(`❌ Erros: ${erros}`);
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Erro ao conectar/executar script:', error);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
      console.log('🔌 Conexão com banco de dados encerrada');
    }
  }
}

// Executar script
fixWhatsAppJidWithPhone()
  .then(() => {
    console.log('✅ Script finalizado com sucesso');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
