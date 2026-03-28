import { DataSource } from 'typeorm';
import { Usuario } from '../usuario/usuario.entity';

/**
 * Script para corrigir whatsapp_jid que possuem @lid e convertê-los para @c.us
 * 
 * Uso: npx ts-node src/scripts/fix-whatsapp-jid.ts
 */

async function fixWhatsAppJid() {
  // Carregar variáveis de ambiente
  require('dotenv').config();

  // Configuração do banco de dados - igual ao app.module.ts
  const dataSource = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'floricultura',
    entities: [Usuario],
    synchronize: false,
    // Opções extras do MySQL para resolver problemas de autenticação
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
    console.log('✅ Conectado ao banco de dados');

    const usuarioRepository = dataSource.getRepository(Usuario);

    // Buscar todos os usuários com @lid no whatsapp_jid
    const usuariosComLid = await usuarioRepository
      .createQueryBuilder('usuario')
      .where('usuario.whatsapp_jid LIKE :pattern', { pattern: '%@lid%' })
      .getMany();

    console.log(`\n📊 Encontrados ${usuariosComLid.length} usuários com @lid no whatsapp_jid`);

    if (usuariosComLid.length === 0) {
      console.log('✅ Nenhum registro precisa ser corrigido!');
      return;
    }

    console.log('\n🔧 Iniciando correção...\n');

    let corrigidos = 0;
    let erros = 0;

    for (const usuario of usuariosComLid) {
      try {
        // Extrair o número do JID
        const phoneMatch = (usuario.whatsapp_jid || '').match(/^(\d+)@/);
        
        if (phoneMatch) {
          const phone = phoneMatch[1];
          const correctJid = `${phone}@c.us`;

          console.log(`ID ${usuario.id}: ${usuario.whatsapp_jid} → ${correctJid}`);

          // Atualizar no banco
          await usuarioRepository.update(usuario.id, {
            whatsapp_jid: correctJid
          });

          corrigidos++;
        } else {
          console.log(`⚠️  ID ${usuario.id}: Não foi possível extrair número de ${usuario.whatsapp_jid}`);
          erros++;
        }
      } catch (error) {
        console.error(`❌ Erro ao corrigir ID ${usuario.id}:`, error.message);
        erros++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 Resumo da correção:');
    console.log(`✅ Corrigidos: ${corrigidos}`);
    console.log(`❌ Erros: ${erros}`);
    console.log('='.repeat(50) + '\n');

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
fixWhatsAppJid()
  .then(() => {
    console.log('✅ Script finalizado com sucesso');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
