-- Script SQL para corrigir whatsapp_jid que possuem @lid e convertê-los para @c.us
-- Execute diretamente no seu cliente MySQL (MySQL Workbench, DBeaver, etc.)

-- 1. Visualizar registros que serão corrigidos
SELECT 
    id,
    nome,
    telefone,
    whatsapp_jid,
    CONCAT(SUBSTRING_INDEX(whatsapp_jid, '@', 1), '@c.us') as novo_jid
FROM usuario 
WHERE whatsapp_jid LIKE '%@lid%';

-- 2. Executar a correção (DESCOMENTAR a linha abaixo após revisar os dados acima)
-- UPDATE usuario 
-- SET whatsapp_jid = CONCAT(SUBSTRING_INDEX(whatsapp_jid, '@', 1), '@c.us')
-- WHERE whatsapp_jid LIKE '%@lid%';

-- 3. Verificar resultado após a correção
-- SELECT id, nome, telefone, whatsapp_jid 
-- FROM usuario 
-- WHERE telefone IS NOT NULL;
