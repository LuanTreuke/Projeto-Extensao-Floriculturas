const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require('docx');

const outputPath = path.join(__dirname, '..', 'TCC_Interface_Report.docx');

// o documento será criado ao final com as seções construídas

function codeParagraph(code) {
  return new Paragraph({ children: [ new TextRun({ text: code, font: 'Courier New', size: 18 }) ] });
}

function normalParagraph(text) {
  return new Paragraph({ children: [ new TextRun({ text, font: 'Times New Roman', size: 24 }) ] });
}

const children = [];
children.push(new Paragraph({ text: 'Desenvolvimento da Interface Inicial — Relatório', heading: HeadingLevel.TITLE }));

children.push(normalParagraph('\n1. Desenvolvimento da Interface Inicial'));
children.push(normalParagraph('A interface inicial foi desenvolvida como uma aplicação web utilizando Next.js e React com TypeScript. O projeto organiza rotas e componentes reutilizáveis, incluindo um painel administrativo para gerenciar o catálogo de produtos. A comunicação com o backend é realizada via HTTP usando a biblioteca axios, configurada em um cliente central (services/api.ts). A navegação utiliza rotas do Next.js: a listagem de produtos encontra-se em /admin/catalogo, o formulário de adição em /admin/catalogo/adicionar, e a edição em /admin/catalogo/[id]/editar.'));

children.push(new Paragraph({ text: 'Trecho representativo (configuração do cliente HTTP):', heading: HeadingLevel.HEADING_2 }));
children.push(codeParagraph("// services/api.ts (excerto)\nconst api = axios.create({ baseURL: API_URL, timeout: 10000 });\napi.interceptors.request.use((config) => {\n  const raw = localStorage.getItem('usuario');\n  if (raw) {\n    const u = JSON.parse(raw);\n    if (u && (u.id || u.id === 0)) config.headers = { ...(config.headers || {}), ['x-user-id']: String(u.id) };\n  }\n  return config;\n});"));

children.push(normalParagraph('\n2. Estrutura da Camada de Dados'));
children.push(normalParagraph('A camada de dados do sistema foi implementada no backend com NestJS e TypeORM. As entidades representam tabelas relacionais e as operações de persistência são realizadas por repositórios TypeORM. A entidade Produto inclui campos para identificação, nome, descrição, preço, URLs de imagem e um campo booleano enabled. Existe uma relação ManyToOne com a entidade Categoria.'));

children.push(new Paragraph({ text: 'Trecho representativo (entidade Produto):', heading: HeadingLevel.HEADING_2 }));
children.push(codeParagraph("// back-tcc-floricultura/src/produto/produto.entity.ts\n@Entity('produto')\nexport class Produto {\n  @PrimaryGeneratedColumn() id: number;\n  @Column({ length: 100 }) nome: string;\n  @Column('text', { nullable: true }) descricao: string;\n  @Column('decimal', { precision: 10, scale: 2 }) preco: number;\n  @Column('text', { nullable: true }) imagem_url: string;\n  @Column({ type: 'boolean', default: true }) enabled: boolean;\n  @ManyToOne(() => Categoria, { nullable: true }) @JoinColumn({ name: 'Categoria_id' }) categoria: Categoria;\n}"));

children.push(new Paragraph({ text: 'Trecho representativo (controle de acesso no controller):', heading: HeadingLevel.HEADING_2 }));
children.push(codeParagraph("// back-tcc-floricultura/src/produto/produto.controller.ts (excerto)\n@Post()\nasync create(@Headers('x-user-id') userId: string, @Body() dto: CreateProdutoDto) {\n  const u = userId ? await this.usuarioService.findById(Number(userId)) : null;\n  if (!u || u.role !== 'Admin') throw new ForbiddenException('Acesso negado');\n  return this.produtoService.create(dto);\n}"));

children.push(normalParagraph('\n3. Implementação do Cadastro de Produtos'));
children.push(normalParagraph('O cadastro de produtos no front-end é realizado por meio de um formulário controlado em /app/admin/catalogo/adicionar/page.tsx. O fluxo inclui seleção múltipla de imagens por um componente dedicado, upload das imagens via uploadService, montagem de um DTO e chamada ao serviço addProduct definido em services/productService.ts. As URLs de imagem são concatenadas em uma única string separada por vírgulas e armazenadas no campo imagem_url.'));

children.push(new Paragraph({ text: 'Trecho representativo (envio do formulário):', heading: HeadingLevel.HEADING_2 }));
children.push(codeParagraph("// app/admin/catalogo/adicionar/page.tsx (excerto)\nconst imagemUrls: string[] = [];\nfor (let i = 0; i < selectedFiles.length; i++) {\n  const uploadResult = await uploadImage(selectedFiles[i]);\n  imagemUrls.push(uploadResult.url);\n}\nconst dto = { nome, descricao, preco: Number(preco), imagem_url: imagemUrls.join(','), Categoria_id: Number(categoria || 0), enabled };\nawait addProduct(dto as Omit<Product, 'id'>);"));

children.push(normalParagraph('\n4. Implementação da Listagem de Produtos'));
children.push(normalParagraph('A listagem de produtos é implementada na página administrativa /app/admin/catalogo/page.tsx. A página carrega os itens via fetchProducts() e exibe-os em um grid usando o componente ProductCard. Filtros (busca por nome com normalização de acentos, categoria, faixa de preço) e ordenação são aplicados no cliente para melhor responsividade. A interface também oferece ações administrativas: editar, excluir e alternar o estado enabled dos produtos, com atualizações otimistas e rollback em caso de falha.'));

children.push(new Paragraph({ text: 'Trecho representativo (busca de produtos):', heading: HeadingLevel.HEADING_2 }));
children.push(codeParagraph("// services/productService.ts (excerto)\nexport async function fetchProducts(): Promise<Product[]> {\n  const res = await api.get(`/produtos`);\n  const data = res.data as unknown;\n  if (Array.isArray(data)) return data as Product[];\n  if (data && typeof data === 'object' && Array.isArray((data as any).items)) return (data as any).items as Product[];\n  return [];\n}"));

children.push(new Paragraph({ text: 'Trecho representativo (filtragem e renderização):', heading: HeadingLevel.HEADING_2 }));
children.push(codeParagraph("// app/admin/catalogo/page.tsx (excerto)\n{products\n  .filter(p => nomeNormalized.includes(searchNormalized) && /* categoria e preço */)\n  .sort((a,b) => sort === 'new' ? b.id - a.id : sort === 'asc' ? a.preco - b.preco : b.preco - a.preco)\n  .map(p => <ProductCard key={p.id} id={p.id} name={p.nome} price={`R$${Number(p.preco).toFixed(2)}`} image={p.imagem_url?.split(',')[0].trim() || ''} />)}"));

children.push(normalParagraph('\n5. Testes Iniciais do Sistema'));
children.push(normalParagraph('Foram realizados testes funcionais iniciais para validar a integração entre front-end e back-end e o fluxo principal do sistema. Entre as verificações: teste de conexão com a API por meio do componente ApiTest, testes manuais de inclusão/edição/exclusão de produtos, e verificação de permissões (uso do header x-user-id para ações administrativas). O repositório contém infraestrutura de testes que pode ser aproveitada posteriormente.'));

children.push(new Paragraph({ text: 'Trecho representativo (componente de teste API):', heading: HeadingLevel.HEADING_2 }));
children.push(codeParagraph("// components/ApiTest.tsx (excerto)\nconst response = await api.get('/produtos');\nsetTestResult(`✅ API OK (${response.data.length} produtos)`);"));

children.push(normalParagraph('\n6. Prints das Telas'));
children.push(normalParagraph('Figura 1 – Tela de cadastro de produtos'));
children.push(normalParagraph('[INSERIR PRINT DA TELA]'));
children.push(new Paragraph({ pageBreakBefore: true }));
children.push(normalParagraph('Figura 2 – Tela de listagem de produtos'));
children.push(normalParagraph('[INSERIR PRINT DA TELA]'));
children.push(new Paragraph({ pageBreakBefore: true }));
children.push(normalParagraph('Figura 3 – Interface inicial do sistema'));
children.push(normalParagraph('[INSERIR PRINT DA TELA]'));

children.push(new Paragraph({ text: 'Considerações finais', heading: HeadingLevel.HEADING_2 }));
children.push(normalParagraph('O sistema é descrito como uma solução digital aplicável a pequenos empreendimentos; a implementação utiliza Next.js + React no front-end, axios para comunicação HTTP e NestJS + TypeORM no backend. Os trechos incluídos são reais e extraídos do código-fonte do projeto.'));

// Cria o documento corretamente com seções e salva
const docWithSections = new Document({ sections: [{ children }] });

Packer.toBuffer(docWithSections).then((buffer) => {
  fs.writeFileSync(outputPath, buffer);
  console.log('DOCX gerado em:', outputPath);
}).catch((err) => {
  console.error('Erro ao gerar DOCX:', err);
  process.exit(1);
});
