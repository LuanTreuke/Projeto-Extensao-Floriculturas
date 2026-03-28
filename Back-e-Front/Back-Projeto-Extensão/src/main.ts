import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableShutdownHooks();
  
  // Configurar pasta para servir arquivos estáticos
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });
  const defaultOrigins = [
    'http://localhost:3000',
    'https://floricultura4estacoes.vercel.app',
    'https://apifloricultura4estacoes.com.br',
    '*.vercel.app', // Permitir todos os subdomínios do Vercel
  ];
  const fromEnv = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const allowedOrigins = [...new Set([...defaultOrigins, ...fromEnv])];

  const isAllowedOrigin = (origin: string | undefined): boolean => {
    if (!origin) return true; // non-browser clients / same-origin
    if (allowedOrigins.includes(origin)) return true;
    
    // Permitir ngrok automaticamente
    if (origin.includes('ngrok-free.app') || origin.includes('ngrok.io') || origin.includes('ngrok.app')) {
      return true;
    }
    
    for (const entry of allowedOrigins) {
      if (!entry) continue;
      if (entry === '*') return true;
      // suporte a *.dominio.tld
      if (entry.startsWith('*.') && origin.endsWith(entry.slice(1))) return true;
      // suporte a .dominio.tld (atalho comum)
      if (entry.startsWith('.') && origin.endsWith(entry)) return true;
    }
    return false;
  };

  app.enableCors({
    origin: (origin, cb) => {
      const ok = isAllowedOrigin(origin);
      if (!ok && origin && !origin.startsWith('chrome-extension://')) {
        // log leve para diagnóstico de origem bloqueada
        // eslint-disable-next-line no-console
        console.warn('[CORS] Origin bloqueado:', origin, 'permitidos=', allowedOrigins.join(','));
      }
      return ok ? cb(null, true) : cb(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['*'],
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 3001, '0.0.0.0');
}
bootstrap();
