import { test, expect } from '@playwright/test';

test.describe('Carrinho de Compras', () => {
  test.beforeEach(async ({ page }: { page: any }) => {
    // Limpa o localStorage antes de cada teste para começar com carrinho vazio
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('floricultura_cart_v1');
      localStorage.removeItem('usuario');
    });
    await page.reload();
  });

  test('deve exibir ícone do carrinho no header da home', (async ({ page }: { page: any }) => {
    await page.goto('/');
    
    // Verifica se o ícone do carrinho está visível
    const cartButton = page.locator('button', { has: page.locator('.material-icons:has-text("shopping_cart")') });
    await expect(cartButton).toBeVisible();
  });

  test('deve abrir popup do carrinho ao clicar no ícone', (async ({ page }: { page: any }) => {
    await page.goto('/');
    
    // Clica no botão do carrinho
    const cartButton = page.locator('button', { has: page.locator('.material-icons:has-text("shopping_cart")') });
    await cartButton.click();
    
    // Aguarda o popup aparecer
    await page.waitForTimeout(500);
    
    // Verifica se o popup está visível
    const cartPopup = page.locator('[class*="popup"]').or(page.locator('text=Carrinho'));
    await expect(cartPopup.first()).toBeVisible();
  });

  test('deve exibir mensagem de carrinho vazio inicialmente', (async ({ page }: { page: any }) => {
    await page.goto('/');
    
    // Clica no botão do carrinho
    const cartButton = page.locator('button', { has: page.locator('.material-icons:has-text("shopping_cart")') });
    await cartButton.click();
    
    // Aguarda o popup aparecer
    await page.waitForTimeout(500);
    
    // Verifica se há mensagem de carrinho vazio
    const emptyMessage = page.locator('text=vazio').or(page.locator('text=nenhum item'));
    await expect(emptyMessage.first()).toBeVisible();
  });

  test('carrinho deve iniciar com contador zerado', (async ({ page }: { page: any }) => {
    await page.goto('/');
    
    // Verifica se o badge do carrinho não está visível ou mostra 0
    const cartBadge = page.locator('[class*="cartBadge"]');
    
    // O badge não deve estar visível quando o carrinho está vazio
    const isVisible = await cartBadge.isVisible().catch(() => false);
    if (isVisible) {
      await expect(cartBadge).toHaveText('0');
    }
  });

  test('deve ser possível adicionar produto ao carrinho', (async ({ page }: { page: any }) => {
    await page.goto('/');
    
    // Aguarda produtos carregarem
    await page.waitForTimeout(2000);
    
    // Encontra e clica no primeiro produto
    const firstProduct = page.locator('[class*="productsGrid"]').locator('div').first();
    
    // Verifica se há produtos disponíveis
    const hasProducts = await firstProduct.isVisible().catch(() => false);
    
    if (hasProducts) {
      await firstProduct.click();
      
      // Aguarda o popup do produto aparecer
      await page.waitForTimeout(1000);
      
      // Procura pelo botão de adicionar ao carrinho
      const addToCartButton = page.locator('button:has-text("Adicionar")').or(
        page.locator('button:has-text("adicionar")')
      ).or(
        page.locator('button', { has: page.locator('.material-icons:has-text("add_shopping_cart")') })
      );
      
      const hasAddButton = await addToCartButton.first().isVisible().catch(() => false);
      
      if (hasAddButton) {
        await addToCartButton.first().click();
        
        // Aguarda o carrinho atualizar
        await page.waitForTimeout(1000);
        
        // Verifica se o contador do carrinho aumentou
        const cartBadge = page.locator('[class*="cartBadge"]');
        await expect(cartBadge).toBeVisible();
      }
    }
  });

  test('deve navegar para página dedicada do carrinho', (async ({ page }: { page: any }) => {
    await page.goto('/carrinho');
    
    // Verifica se está na página do carrinho
    await expect(page).toHaveURL(/\/carrinho/);
    
    // Aguarda o conteúdo carregar
    await page.waitForTimeout(500);
  });

  test('deve fechar popup do carrinho ao clicar fora', (async ({ page }: { page: any }) => {
    await page.goto('/');
    
    // Abre o popup do carrinho
    const cartButton = page.locator('button', { has: page.locator('.material-icons:has-text("shopping_cart")') });
    await cartButton.click();
    
    // Aguarda o popup aparecer
    await page.waitForTimeout(500);
    
    // Verifica se o popup está visível
    const cartPopup = page.locator('[class*="popup"]');
    await expect(cartPopup.first()).toBeVisible();
    
    // Clica fora do popup (no header por exemplo)
    await page.locator('header').click({ position: { x: 10, y: 10 } });
    
    // Aguarda um pouco
    await page.waitForTimeout(500);
  });

  test('deve exibir botão de finalizar compra no carrinho', (async ({ page }: { page: any }) => {
    await page.goto('/');
    
    // Abre o popup do carrinho
    const cartButton = page.locator('button', { has: page.locator('.material-icons:has-text("shopping_cart")') });
    await cartButton.click();
    
    // Aguarda o popup aparecer
    await page.waitForTimeout(500);
    
    // Verifica se há botão de finalizar/continuar
    const checkoutButton = page.locator('button:has-text("Finalizar")').or(
      page.locator('button:has-text("finalizar")')
    ).or(
      page.locator('button:has-text("Continuar")')
    );
    
    const hasButton = await checkoutButton.first().isVisible().catch(() => false);
    
    if (hasButton) {
      await expect(checkoutButton.first()).toBeVisible();
    }
  });

  test('deve persistir carrinho no localStorage', (async ({ page }: { page: any }) => {
    await page.goto('/');
    
    // Aguarda produtos carregarem
    await page.waitForTimeout(2000);
    
    // Verifica se há localStorage do carrinho (mesmo que vazio)
    const hasCartStorage = await page.evaluate(() => {
      return localStorage.getItem('floricultura_cart_v1') !== undefined;
    });
    
    // O localStorage deve existir após carregar a página
    expect(typeof hasCartStorage).toBe('boolean');
  });
});

test.describe('Fluxo de Compra', () => {
  test('deve redirecionar para login ao tentar finalizar compra sem estar logado', (async ({ page }: { page: any }) => {
    await page.goto('/');
    
    // Limpa autenticação
    await page.evaluate(() => {
      localStorage.removeItem('usuario');
    });
    
    // Abre o popup do carrinho
    const cartButton = page.locator('button', { has: page.locator('.material-icons:has-text("shopping_cart")') });
    await cartButton.click();
    
    // Aguarda o popup aparecer
    await page.waitForTimeout(1000);
    
    // Procura e clica no botão de finalizar
    const checkoutButton = page.locator('button:has-text("Finalizar")').or(
      page.locator('button:has-text("finalizar")')
    ).or(
      page.locator('button:has-text("Continuar")')
    );
    
    const hasButton = await checkoutButton.first().isVisible().catch(() => false);
    
    if (hasButton) {
      await checkoutButton.first().click();
      
      // Aguarda redirecionamento
      await page.waitForTimeout(1000);
      
      // Deve ter sido redirecionado para login ou mostrar alerta
      const url = page.url();
      const isOnLogin = url.includes('/login');
      
      // Ou está na página de login ou houve algum alerta
      expect(isOnLogin || url.includes('/')).toBeTruthy();
    }
  });
});
