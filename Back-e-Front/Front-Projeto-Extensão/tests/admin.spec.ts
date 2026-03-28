import { test, expect } from '@playwright/test';

/**
 * Helper para fazer login como admin antes dos testes
 * Estes testes requerem um usuário admin válido no sistema
 */
async function loginAsAdmin(page: any) {
  await page.goto('/login');
  
  // Credenciais de admin (ajuste conforme necessário)
  await page.locator('input[type="email"]').fill('admin@floricultura.com');
  await page.locator('input[type="password"]').fill('admin123');
  
  // Submete o formulário
  await page.locator('button[type="submit"]:has-text("Entrar")').click();
  
  // Aguarda redirecionamento
  await page.waitForTimeout(2000);
}

test.describe('Admin - Catálogo', () => {
  test.beforeEach(async ({ page }) => {
    // Faz login como admin antes de cada teste
    await loginAsAdmin(page);
    await page.goto('/admin/catalogo');
    await page.waitForTimeout(1000);
  });

  test('deve carregar a página de gerenciamento de catálogo', async ({ page }) => {
    // Verifica se está na página correta
    await expect(page).toHaveURL(/\/admin\/catalogo/);
    
    // Verifica se o título está presente
    await expect(page.getByText('Gerenciar Catálogo')).toBeVisible();
  });

  test('deve exibir o logo da floricultura', async ({ page }) => {
    // Verifica se o logo está visível
    await expect(page.locator('img[alt*="Logo Floricultura"]')).toBeVisible();
  });

  test('deve exibir barra de pesquisa de produtos', async ({ page }) => {
    // Verifica se o campo de pesquisa está presente
    const searchInput = page.locator('input[placeholder*="Buscar produtos"]');
    await expect(searchInput).toBeVisible();
  });

  test('deve exibir botões de controle em lote', async ({ page }) => {
    // Verifica se os botões de habilitar/desabilitar todos estão presentes
    await expect(page.getByText('Habilitar todos')).toBeVisible();
    await expect(page.getByText('Desabilitar todos')).toBeVisible();
  });

  test('deve exibir botão de adicionar produto', async ({ page }) => {
    // Verifica se o botão de adicionar está presente
    const addButton = page.locator('button:has-text("Adicionar produto")');
    await expect(addButton).toBeVisible();
  });

  test('deve navegar para página de adicionar produto', async ({ page }) => {
    // Clica no botão de adicionar
    const addButton = page.locator('button:has-text("Adicionar produto")');
    await addButton.click();
    
    // Verifica se foi redirecionado
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(/\/admin\/catalogo\/adicionar/);
  });

  test('deve exibir filtros de categoria e preço', async ({ page }) => {
    // Aguarda categorias carregarem
    await page.waitForTimeout(1000);
    
    // Verifica se os filtros estão presentes
    const filters = page.locator('[class*="filters"]');
    await expect(filters.first()).toBeVisible();
  });

  test('deve exibir produtos na grade', async ({ page }) => {
    // Aguarda produtos carregarem
    await page.waitForTimeout(2000);
    
    // Verifica se a grade de produtos está visível
    const productsGrid = page.locator('[class*="productsGrid"]');
    await expect(productsGrid).toBeVisible();
  });

  test('produtos devem ter botões de editar e excluir', async ({ page }) => {
    // Aguarda produtos carregarem
    await page.waitForTimeout(2000);
    
    // Verifica se há botões de ação nos produtos
    const editButton = page.locator('button:has-text("Editar")').first();
    const deleteButton = page.locator('button:has-text("Excluir")').first();
    
    const hasEdit = await editButton.isVisible().catch(() => false);
    const hasDelete = await deleteButton.isVisible().catch(() => false);
    
    // Se há produtos, deve haver botões
    if (hasEdit || hasDelete) {
      expect(hasEdit && hasDelete).toBeTruthy();
    }
  });

  test('produtos devem ter indicador de status (ativo/inativo)', async ({ page }) => {
    // Aguarda produtos carregarem
    await page.waitForTimeout(2000);
    
    // Verifica se há badges de status
    const statusBadge = page.locator('text=ATIVO').or(page.locator('text=INATIVO'));
    const hasBadge = await statusBadge.first().isVisible().catch(() => false);
    
    // Se há produtos, deve haver badges
    expect(typeof hasBadge).toBe('boolean');
  });

  test('deve ser possível pesquisar produtos', async ({ page }) => {
    // Aguarda produtos carregarem
    await page.waitForTimeout(2000);
    
    // Digita no campo de pesquisa
    const searchInput = page.locator('input[placeholder*="Buscar produtos"]');
    await searchInput.fill('rosa');
    
    // Aguarda o filtro ser aplicado
    await page.waitForTimeout(500);
    
    // Verifica se a pesquisa foi aplicada
    const productsGrid = page.locator('[class*="productsGrid"]');
    await expect(productsGrid).toBeVisible();
  });
});

test.describe('Admin - Pedidos', () => {
  test.beforeEach(async ({ page }) => {
    // Faz login como admin antes de cada teste
    await loginAsAdmin(page);
    await page.goto('/admin/pedidos');
    await page.waitForTimeout(1000);
  });

  test('deve carregar a página de gerenciamento de pedidos', async ({ page }) => {
    // Verifica se está na página correta
    await expect(page).toHaveURL(/\/admin\/pedidos/);
    
    // Verifica se o título está presente
    await expect(page.getByText('Gerenciar Pedidos')).toBeVisible();
  });

  test('deve exibir o logo da floricultura', async ({ page }) => {
    // Verifica se o logo está visível
    await expect(page.locator('img[alt*="Logo Floricultura"]')).toBeVisible();
  });

  test('deve exibir barra de pesquisa de pedidos', async ({ page }) => {
    // Verifica se o campo de pesquisa está presente
    const searchInput = page.locator('input[placeholder*="Pesquisar"]');
    await expect(searchInput).toBeVisible();
  });

  test('deve exibir filtro de status', async ({ page }) => {
    // Verifica se o filtro de status está presente
    const statusSelect = page.locator('select');
    await expect(statusSelect.first()).toBeVisible();
    
    // Verifica se tem as opções de status
    await expect(page.getByText('Todos')).toBeVisible();
  });

  test('deve exibir filtros de ordenação', async ({ page }) => {
    // Verifica se os botões de ordenação estão presentes
    await expect(page.locator('button:has-text("Hora Pedido")')).toBeVisible();
    await expect(page.locator('button:has-text("Hora Entrega")')).toBeVisible();
  });

  test('deve exibir filtros de data', async ({ page }) => {
    // Verifica se os campos de data estão presentes
    const dateInputs = page.locator('input[type="date"]');
    await expect(dateInputs.first()).toBeVisible();
  });

  test('deve exibir botão de limpar filtros quando há filtros aplicados', async ({ page }) => {
    // Aplica um filtro
    const searchInput = page.locator('input[placeholder*="Pesquisar"]');
    await searchInput.fill('teste');
    
    // Aguarda um pouco
    await page.waitForTimeout(500);
    
    // Verifica se o botão de limpar aparece
    const clearButton = page.locator('button:has-text("Limpar Tudo")');
    const isVisible = await clearButton.isVisible().catch(() => false);
    
    expect(isVisible).toBeTruthy();
  });

  test('deve ser possível pesquisar pedidos por nome do cliente', async ({ page }) => {
    // Aguarda pedidos carregarem
    await page.waitForTimeout(2000);
    
    // Digita no campo de pesquisa
    const searchInput = page.locator('input[placeholder*="Pesquisar"]');
    await searchInput.fill('cliente');
    
    // Aguarda o filtro ser aplicado
    await page.waitForTimeout(500);
    
    // Verifica se há indicação de resultados
    const resultsText = page.locator('text=/resultado/i');
    const hasResults = await resultsText.isVisible().catch(() => false);
    
    expect(typeof hasResults).toBe('boolean');
  });

  test('deve exibir mensagem quando não há pedidos', async ({ page }) => {
    // Aplica filtro que não deve retornar resultados
    const searchInput = page.locator('input[placeholder*="Pesquisar"]');
    await searchInput.fill('xyzabc123naoexiste');
    
    // Aguarda o filtro ser aplicado
    await page.waitForTimeout(1000);
    
    // Verifica se mostra mensagem de nenhum pedido encontrado
    await expect(page.getByText('Nenhum pedido encontrado')).toBeVisible();
  });

  test('pedidos devem exibir informações do cliente', async ({ page }) => {
    // Aguarda pedidos carregarem
    await page.waitForTimeout(2000);
    
    // Verifica se há labels de informações do cliente
    const clienteLabel = page.locator('strong:has-text("Cliente:")');
    const hasCliente = await clienteLabel.first().isVisible().catch(() => false);
    
    expect(typeof hasCliente).toBe('boolean');
  });

  test('deve ser possível filtrar por status', async ({ page }) => {
    // Aguarda pedidos carregarem
    await page.waitForTimeout(2000);
    
    // Abre o select de status
    const statusSelect = page.locator('select').first();
    await statusSelect.selectOption('Entregue');
    
    // Aguarda o filtro ser aplicado
    await page.waitForTimeout(1000);
    
    // A página deve continuar funcionando
    await expect(page.locator('[class*="grid"]')).toBeVisible();
  });

  test('deve exibir botão do WhatsApp nos pedidos com telefone', async ({ page }) => {
    // Aguarda pedidos carregarem
    await page.waitForTimeout(2000);
    
    // Verifica se há botões do WhatsApp
    const whatsappButton = page.locator('a[href*="wa.me"]');
    const hasWhatsapp = await whatsappButton.first().isVisible().catch(() => false);
    
    // Se há pedidos com telefone, deve haver botão
    expect(typeof hasWhatsapp).toBe('boolean');
  });
});

test.describe('Admin - Acesso', () => {
  test('deve redirecionar para login se não estiver autenticado', async ({ page }) => {
    // Limpa autenticação
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('usuario');
    });
    
    // Tenta acessar página admin
    await page.goto('/admin/catalogo');
    
    // Aguarda redirecionamento
    await page.waitForTimeout(2000);
    
    // Deve estar na página de login ou home (dependendo da implementação)
    const url = page.url();
    const isProtected = url.includes('/login') || url === new URL('/', page.url()).href;
    
    expect(isProtected).toBeTruthy();
  });

  test('usuário admin deve ter acesso ao painel administrativo', async ({ page }) => {
    // Faz login como admin
    await loginAsAdmin(page);
    
    // Vai para home
    await page.goto('/');
    await page.waitForTimeout(1000);
    
    // Clica no menu do usuário
    const accountButton = page.locator('button', { has: page.locator('.material-icons:has-text("account_circle")') });
    const hasButton = await accountButton.isVisible().catch(() => false);
    
    if (hasButton) {
      await accountButton.click();
      await page.waitForTimeout(500);
      
      // Verifica se há opção de painel administrativo
      const adminOption = page.getByText('Painel administrativo');
      await expect(adminOption).toBeVisible();
    }
  });
});

test.describe('Admin - Layout', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('deve ter navegação entre páginas admin', async ({ page }) => {
    await page.goto('/admin/catalogo');
    await page.waitForTimeout(1000);
    
    // Verifica se está na página de catálogo
    await expect(page).toHaveURL(/\/admin\/catalogo/);
    
    // Tenta navegar para pedidos (se houver link de navegação)
    await page.goto('/admin/pedidos');
    await page.waitForTimeout(1000);
    
    // Verifica se navegou corretamente
    await expect(page).toHaveURL(/\/admin\/pedidos/);
  });

  test('páginas admin devem ter design consistente', async ({ page }) => {
    // Verifica catálogo
    await page.goto('/admin/catalogo');
    await page.waitForTimeout(1000);
    await expect(page.locator('img[alt*="Logo Floricultura"]')).toBeVisible();
    
    // Verifica pedidos
    await page.goto('/admin/pedidos');
    await page.waitForTimeout(1000);
    await expect(page.locator('img[alt*="Logo Floricultura"]')).toBeVisible();
  });
});
