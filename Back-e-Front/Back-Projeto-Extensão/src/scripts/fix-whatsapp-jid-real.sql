-- Script SQL para corrigir whatsapp_jid usando o telefone real do usuário
-- Execute diretamente no seu cliente MySQL (DBeaver, MySQL Workbench, etc.)

-- 1. PRIMEIRO: Visualizar os registros problemáticos
SELECT 
    id,
    nome,
    telefone,
    whatsapp_jid,
    CASE 
        WHEN telefone IS NOT NULL THEN CONCAT(telefone, '@c.us')
        ELSE whatsapp_jid
    END as novo_jid_correto
FROM usuario 
WHERE whatsapp_jid LIKE '%@lid%' 
   OR (whatsapp_jid IS NOT NULL AND LENGTH(SUBSTRING_INDEX(whatsapp_jid, '@', 1)) > 15);

-- 2. EXECUTAR A CORREÇÃO (DESCOMENTAR após revisar os dados acima)
-- Atualiza whatsapp_jid para usar o telefone real cadastrado pelo usuário
-- UPDATE usuario 
-- SET whatsapp_jid = CONCAT(telefone, '@c.us')
-- WHERE telefone IS NOT NULL 
--   AND (whatsapp_jid LIKE '%@lid%' 
--        OR (whatsapp_jid IS NOT NULL AND LENGTH(SUBSTRING_INDEX(whatsapp_jid, '@', 1)) > 15));

-- 3. Verificar resultado (DESCOMENTAR após executar o UPDATE)
-- SELECT id, nome, telefone, whatsapp_jid 
-- FROM usuario 
-- WHERE telefone IS NOT NULL
-- ORDER BY id DESC
-- LIMIT 20;

-- 4. OPCIONAL: Se houver registros sem telefone mas com whatsapp_jid inválido, marcar como NULL
-- UPDATE usuario 
-- SET whatsapp_jid = NULL
-- WHERE telefone IS NULL 
--   AND (whatsapp_jid LIKE '%@lid%' 
--        OR (whatsapp_jid IS NOT NULL AND LENGTH(SUBSTRING_INDEX(whatsapp_jid, '@', 1)) > 15));
