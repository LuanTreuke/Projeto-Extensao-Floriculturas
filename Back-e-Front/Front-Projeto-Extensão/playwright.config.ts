import { defineConfig, devices } from '@playwright/test';

/**
 * Configuração do Playwright para testes de integração
 */
export default defineConfig({
  testDir: './tests',
  
  // Timeout para cada teste
  timeout: 30 * 1000,
  
  // Tenta novamente em caso de falha
  retries: process.env.CI ? 2 : 0,
  
  // Número de workers (testes paralelos)
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter: usa 'html' localmente, 'github' no CI
  reporter: 'html',
  
  // Configurações compartilhadas para todos os projetos
  use: {
    // URL base do aplicativo
    baseURL: 'http://localhost:3000',
    
    // Coleta traces em caso de falha
    trace: 'on-first-retry',
    
    // Screenshot em falha
    screenshot: 'only-on-failure',
    
    // Video em falha
    video: 'retain-on-failure',
  },

  // Configura os projetos de teste
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    
    // Descomente para testar em outros navegadores
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
    
    // Teste em dispositivos móveis
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
  ],

  // Inicia o servidor de desenvolvimento antes dos testes
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
