-- ════════════════════════════════════════════════════════════
-- MIGRAÇÃO: Sistema de Indicações e Comissões Colgate
-- Execute este SQL no Supabase SQL Editor do seu projeto
-- ════════════════════════════════════════════════════════════

-- 1. Adicionar coluna referred_by na tabela profiles
--    Guarda o id_code de quem indicou este usuário
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS referred_by TEXT DEFAULT NULL;

-- 2. Adicionar coluna referral_earnings para acumular comissões de indicação
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS referral_earnings NUMERIC(15, 2) DEFAULT 0.00;

-- 3. Adicionar tipo 'commission' à lista de tipos de transação aceitos
ALTER TABLE public.transactions 
  DROP CONSTRAINT IF EXISTS transactions_type_check;

ALTER TABLE public.transactions 
  ADD CONSTRAINT transactions_type_check 
  CHECK (type IN ('deposit', 'withdrawal', 'investment', 'yield', 'commission'));

-- Pronto! Confirme rodando:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles';
