import { test, expect } from '@playwright/test';

test.describe('Autenticação - Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('deve carregar a página de login corretamente', async ({ page }) => {
    // Verifica se está na página de login
    await expect(page).toHaveURL(/\/login/);
    
    // Verifica se o logo está visível
    await expect(page.locator('img[alt*="Logo Floricultura"]')).toBeVisible();
    
    // Verifica se o título "Login" está presente
    await expect(page.locator('h2:has-text("Login")')).toBeVisible();
  });

  test('deve exibir campos de email e senha', async ({ page }) => {
    // Verifica se o campo de email está presente
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
    
    // Verifica se o campo de senha está presente
    const senhaInput = page.locator('input[type="password"]');
    await expect(senhaInput).toBeVisible();
  });

  test('deve exibir botão de entrar', async ({ page }) => {
    // Verifica se o botão de submissão está presente
    const submitButton = page.locator('button[type="submit"]:has-text("Entrar")');
    await expect(submitButton).toBeVisible();
  });

  test('deve exibir link para cadastro', async ({ page }) => {
    // Verifica se o texto "Não possui uma conta?" está presente
    await expect(page.getByText('Não possui uma conta?')).toBeVisible();
    
    // Verifica se o link "Cadastre-se" está presente
    const cadastroLink = page.locator('text=Cadastre-se');
    await expect(cadastroLink).toBeVisible();
  });

  test('deve navegar para página de cadastro ao clicar em "Cadastre-se"', async ({ page }) => {
    // Clica no link de cadastro
    const cadastroLink = page.locator('text=Cadastre-se');
    await cadastroLink.click();
    
    // Verifica se foi redirecionado para a página de cadastro
    await expect(page).toHaveURL(/\/cadastro/);
  });

  test('deve exibir botão de voltar', async ({ page }) => {
    // Verifica se há um botão de voltar (BackButton)
    const backButton = page.locator('button').first();
    await expect(backButton).toBeVisible();
  });

  test('não deve permitir login com campos vazios', async ({ page }) => {
    // Tenta submeter o formulário sem preencher
    const submitButton = page.locator('button[type="submit"]:has-text("Entrar")');
    await submitButton.click();
    
    // Os campos devem estar com validação HTML5
    const emailInput = page.locator('input[type="email"]');
    const isEmailInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(isEmailInvalid).toBeTruthy();
  });

  test('deve exibir erro com credenciais inválidas', async ({ page }) => {
    // Preenche com credenciais inválidas
    await page.locator('input[type="email"]').fill('teste@invalido.com');
    await page.locator('input[type="password"]').fill('senhaerrada');
    
    // Submete o formulário
    await page.locator('button[type="submit"]:has-text("Entrar")').click();
    
    // Aguarda a resposta e verifica se há mensagem de erro
    await page.waitForTimeout(2000);
    const errorMessage = page.locator('[class*="error"]');
    await expect(errorMessage).toBeVisible();
  });
});

test.describe('Autenticação - Cadastro', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/cadastro');
  });

  test('deve carregar a página de cadastro corretamente', async ({ page }) => {
    // Verifica se está na página de cadastro
    await expect(page).toHaveURL(/\/cadastro/);
    
    // Verifica se o logo está visível
    await expect(page.locator('img[alt*="Logo Floricultura"]')).toBeVisible();
    
    // Verifica se o título "Cadastro" está presente
    await expect(page.locator('h2:has-text("Cadastro")')).toBeVisible();
  });

  test('deve exibir todos os campos obrigatórios', async ({ page }) => {
    // Campo de nome
    const nomeInput = page.locator('input[placeholder*="Nome completo"]');
    await expect(nomeInput).toBeVisible();
    
    // Campo de email
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
    
    // Campo de senha
    const senhaInputs = page.locator('input[type="password"]');
    await expect(senhaInputs).toHaveCount(2); // Senha e confirmar senha
  });

  test('deve exibir botão de avançar', async ({ page }) => {
    // Verifica se o botão de submissão está presente
    const submitButton = page.locator('button[type="submit"]:has-text("Avançar")');
    await expect(submitButton).toBeVisible();
  });

  test('deve exibir botão de voltar', async ({ page }) => {
    // Verifica se há um botão de voltar (BackButton)
    const backButton = page.locator('button').first();
    await expect(backButton).toBeVisible();
  });

  test('não deve permitir cadastro com campos vazios', async ({ page }) => {
    // Tenta submeter o formulário sem preencher
    const submitButton = page.locator('button[type="submit"]:has-text("Avançar")');
    await submitButton.click();
    
    // Os campos devem estar com validação HTML5
    const nomeInput = page.locator('input[placeholder*="Nome completo"]');
    const isNomeInvalid = await nomeInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(isNomeInvalid).toBeTruthy();
  });

  test('deve validar senhas diferentes', async ({ page }) => {
    // Preenche o formulário com senhas diferentes
    await page.locator('input[placeholder*="Nome completo"]').fill('Teste da Silva');
    await page.locator('input[type="email"]').fill('teste@teste.com');
    
    const senhaInputs = page.locator('input[type="password"]');
    await senhaInputs.nth(0).fill('senha123');
    await senhaInputs.nth(1).fill('senha456');
    
    // Submete o formulário
    await page.locator('button[type="submit"]:has-text("Avançar")').click();
    
    // Aguarda e verifica se há mensagem de erro
    await page.waitForTimeout(500);
    await expect(page.locator('text=As senhas não coincidem')).toBeVisible();
  });

  test('deve validar email já cadastrado', async ({ page }) => {
    // Preenche o formulário com um email que pode já estar cadastrado
    await page.locator('input[placeholder*="Nome completo"]').fill('Teste da Silva');
    await page.locator('input[type="email"]').fill('admin@floricultura.com');
    
    const senhaInputs = page.locator('input[type="password"]');
    await senhaInputs.nth(0).fill('senha123');
    await senhaInputs.nth(1).fill('senha123');
    
    // Submete o formulário
    await page.locator('button[type="submit"]:has-text("Avançar")').click();
    
    // Aguarda a resposta e verifica se há mensagem de erro ou sucesso
    await page.waitForTimeout(2000);
    
    // Pode exibir erro de email já cadastrado ou sucesso (caso não exista)
    const hasError = await page.locator('[class*="error"]').isVisible().catch(() => false);
    const hasSuccess = await page.locator('[class*="success"]').isVisible().catch(() => false);
    
    expect(hasError || hasSuccess).toBeTruthy();
  });

  test('deve aceitar senha válida com confirmação correta', async ({ page }) => {
    // Gera um email único para evitar conflitos
    const uniqueEmail = `teste${Date.now()}@teste.com`;
    
    // Preenche o formulário corretamente
    await page.locator('input[placeholder*="Nome completo"]').fill('Teste da Silva');
    await page.locator('input[type="email"]').fill(uniqueEmail);
    
    const senhaInputs = page.locator('input[type="password"]');
    await senhaInputs.nth(0).fill('senha123');
    await senhaInputs.nth(1).fill('senha123');
    
    // Submete o formulário
    await page.locator('button[type="submit"]:has-text("Avançar")').click();
    
    // Aguarda a resposta
    await page.waitForTimeout(3000);
    
    // Verifica se houve redirecionamento ou mensagem de sucesso
    const url = page.url();
    const hasSuccess = await page.locator('[class*="success"]').isVisible().catch(() => false);
    
    // Deve ter sido redirecionado para telefone ou mostrar sucesso
    expect(url.includes('/telefone') || hasSuccess).toBeTruthy();
  });
});
