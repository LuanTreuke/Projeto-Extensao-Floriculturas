# Correção de Telefones com @lid

## Problema
Quando o WhatsApp envia mensagens de números não salvos nos contatos, ele usa `@lid` com um ID temporário ao invés do número real. Isso resultou em números inválidos no banco.

## O que foi feito

### 1. Frontend Atualizado ✅
Agora o formulário pede o telefone do usuário **antes** de gerar o token de verificação.
- Arquivo: `front-tcc-floricultura/app/cadastro/telefone/novo/page.tsx`
- O telefone é enviado para o backend e armazenado na tabela `phone_verification`

### 2. Backend Corrigido ✅
O backend agora usa o telefone armazenado quando recebe `@lid`:
- Arquivo: `back-tcc-floricultura/src/verificacao/verificacao.service.ts`
- Quando o JID é `@lid`, usa o telefone da verificação ao invés de extrair do JID

## Como corrigir registros antigos

### Opção 1: SQL Manual no DBeaver (RECOMENDADO)

Como os registros antigos não têm o telefone correto, você precisa **perguntar aos usuários** qual é o número real deles ou procurar em outro lugar do sistema.

```sql
-- Ver todos os usuários com números problemáticos
SELECT id, nome, email, telefone, whatsapp_jid 
FROM usuario 
WHERE whatsapp_jid LIKE '%@lid%' 
   OR LENGTH(SUBSTRING_INDEX(whatsapp_jid, '@', 1)) > 15;

-- Corrigir MANUALMENTE cada usuário (exemplo):
UPDATE usuario 
SET telefone = '554299622786',
    whatsapp_jid = '554299622786@c.us'
WHERE id = 36;  -- Substituir 36 pelo ID correto

UPDATE usuario 
SET telefone = '5542XXXXXXXX',
    whatsapp_jid = '5542XXXXXXXX@c.us'
WHERE id = 37;  -- E assim por diante...
```

### Opção 2: Marcar como NULL (se não tiver o telefone real)

```sql
-- Limpar registros inválidos para que os usuários cadastrem novamente
UPDATE usuario 
SET telefone = NULL,
    whatsapp_jid = NULL
WHERE whatsapp_jid LIKE '%@lid%' 
   OR LENGTH(SUBSTRING_INDEX(whatsapp_jid, '@', 1)) > 15;
```

### Opção 3: Pedir para os usuários cadastrarem novamente

Envie um email ou mensagem pedindo para eles refazerem o cadastro do WhatsApp.

## Números Problemáticos Encontrados

Estes são os IDs inválidos que foram salvos:

| ID Usuário | Número Inválido (@lid) |
|------------|------------------------|
| 36 | 142056076882083 |
| 37 | 3779705450679 |
| 38 | 159356289085544 |
| 39 | 103710759874720 |
| 40 | 140393958129759 |
| 42 | 252247892090981 |

**Você mencionou que o ID 39 pertence ao número real: +55 42 9962-2786 (554299622786)**

Você precisará descobrir os números reais dos outros usuários para corrigir manualmente.

## Testando a Correção

1. Peça para um novo usuário cadastrar o WhatsApp
2. Verifique no banco que agora o número está correto:
```sql
SELECT id, nome, telefone, whatsapp_jid 
FROM usuario 
ORDER BY id DESC 
LIMIT 1;
```

O campo `telefone` deve ter 12-13 dígitos começando com `55` (Brasil).
O campo `whatsapp_jid` deve ser `{telefone}@c.us`.
