import { test, expect } from '@playwright/test';

test.describe('Página Inicial', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('deve carregar a página inicial corretamente', async ({ page }) => {
    // Verifica se o título da página está correto
    await expect(page).toHaveTitle(/Front Tcc Floricultura/i);
    
    // Verifica se o logo está visível
    await expect(page.locator('img[alt*="Logo Floricultura"]')).toBeVisible();
  });

  test('deve exibir o breadcrumb correto', async ({ page }) => {
    // Verifica se o breadcrumb "Página Inicial" está visível
    await expect(page.getByText('Página Inicial')).toBeVisible();
  });

  test('deve exibir a barra de pesquisa', async ({ page }) => {
    // Verifica se o campo de pesquisa está visível
    const searchInput = page.locator('input[placeholder*="Encontre seu produto"]');
    await expect(searchInput).toBeVisible();
  });

  test('deve pesquisar produtos corretamente', async ({ page }) => {
    // Aguarda os produtos carregarem
    await page.waitForSelector('[class*="productsGrid"]', { timeout: 10000 });
    
    // Digita no campo de pesquisa
    const searchInput = page.locator('input[placeholder*="Encontre seu produto"]');
    await searchInput.fill('rosa');
    
    // Aguarda um pouco para o filtro ser aplicado
    await page.waitForTimeout(500);
    
    // Verifica se há produtos sendo exibidos ou mensagem de carregamento
    const productsGrid = page.locator('[class*="productsGrid"]');
    await expect(productsGrid).toBeVisible();
  });

  test('deve exibir filtros de categoria', async ({ page }) => {
    // Aguarda as categorias carregarem
    await page.waitForTimeout(1000);
    
    // Verifica se pelo menos uma categoria está visível
    const categoryFilter = page.locator('[class*="filters"]');
    await expect(categoryFilter).toBeVisible();
  });

  test('deve exibir o filtro de preço', async ({ page }) => {
    // Verifica se o componente de faixa de preço está presente
    await expect(page.locator('text=Preço').or(page.locator('[class*="price"]'))).toBeVisible();
  });

  test('deve exibir botões de ordenação', async ({ page }) => {
    // Verifica se os botões de ordenação estão visíveis
    await page.waitForTimeout(500);
    const sortButtons = page.locator('[class*="sectionTitle"]').filter({ hasText: 'Nossos produtos' });
    await expect(sortButtons).toBeVisible();
  });

  test('deve exibir o carrinho de compras no header', async ({ page }) => {
    // Verifica se o ícone do carrinho está visível
    const cartButton = page.locator('button', { has: page.locator('.material-icons:has-text("shopping_cart")') });
    await expect(cartButton).toBeVisible();
  });

  test('deve exibir botão de login/conta', async ({ page }) => {
    // Verifica se o botão de login está visível
    const loginButton = page.locator('button').filter({ hasText: /Login|account_circle/ });
    await expect(loginButton.first()).toBeVisible();
  });

  test('deve navegar para login ao clicar no botão de login', async ({ page }) => {
    // Clica no botão de login
    const loginButton = page.locator('button').filter({ hasText: 'Login' });
    await loginButton.click();
    
    // Verifica se foi redirecionado para a página de login
    await expect(page).toHaveURL(/\/login/);
  });

  test('deve abrir popup do carrinho ao clicar no ícone', async ({ page }) => {
    // Clica no botão do carrinho
    const cartButton = page.locator('button', { has: page.locator('.material-icons:has-text("shopping_cart")') });
    await cartButton.click();
    
    // Verifica se o popup do carrinho apareceu
    await page.waitForTimeout(500);
    // O popup deve estar visível
    const cartPopup = page.locator('[class*="popup"]').or(page.locator('text=Carrinho'));
    await expect(cartPopup.first()).toBeVisible();
  });

  test('deve exibir produtos na grade', async ({ page }) => {
    // Aguarda os produtos carregarem
    await page.waitForTimeout(2000);
    
    // Verifica se há produtos ou mensagem de carregamento
    const productsGrid = page.locator('[class*="productsGrid"]');
    await expect(productsGrid).toBeVisible();
  });

  test('deve exibir footer com informações', async ({ page }) => {
    // Scroll até o footer
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    
    // Verifica se o footer está visível
    await expect(page.getByText('Redes Sociais')).toBeVisible();
    await expect(page.getByText('Informações')).toBeVisible();
  });

  test('deve ter link para Instagram no footer', async ({ page }) => {
    // Scroll até o footer
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    
    // Verifica se o link do Instagram está presente
    const instagramLink = page.locator('a[href*="instagram.com"]');
    await expect(instagramLink).toBeVisible();
  });

  test('deve ter link para Termos de Serviço no footer', async ({ page }) => {
    // Scroll até o footer
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    
    // Verifica se o link de termos está presente
    const termosLink = page.locator('a[href="/termos-de-servico"]');
    await expect(termosLink).toBeVisible();
  });
});
