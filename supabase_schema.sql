-- 1. Tabela de Perfis de Usuário (vinculado ao auth.users do Supabase)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    balance NUMERIC(15, 2) DEFAULT 13.00,
    total_recharge NUMERIC(15, 2) DEFAULT 0.00,
    total_withdrawal NUMERIC(15, 2) DEFAULT 0.00,
    total_income NUMERIC(15, 2) DEFAULT 0.00,
    pix_key TEXT DEFAULT '',
    pix_type TEXT DEFAULT 'cpf',
    id_code TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabela de Planos Ativos (Investimentos)
CREATE TABLE IF NOT EXISTS public.active_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id TEXT NOT NULL,
    name TEXT NOT NULL,
    price NUMERIC(15, 2) NOT NULL,
    daily_income NUMERIC(15, 2) NOT NULL,
    cycle_days INT NOT NULL DEFAULT 30,
    purchased_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_claimed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    earnings_claimed NUMERIC(15, 2) DEFAULT 0.00,
    earnings_accumulated NUMERIC(15, 6) DEFAULT 0.00
);

-- 3. Tabela de Transações (Recargas, Saques, Investimentos e Rendimentos)
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'investment', 'yield')),
    amount NUMERIC(15, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    details TEXT DEFAULT ''
);

-- Habilitar RLS (Row Level Security) nas tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Criar políticas de acesso (RLS) para permitir que os usuários acessem apenas seus próprios dados

-- Políticas para Profiles
CREATE POLICY "Permitir leitura do próprio perfil"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Permitir inserção do próprio perfil"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Permitir atualização do próprio perfil"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- Políticas para Active Plans
CREATE POLICY "Permitir leitura dos próprios planos"
    ON public.active_plans FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Permitir inserção de plano para si mesmo"
    ON public.active_plans FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Permitir atualização dos próprios planos"
    ON public.active_plans FOR UPDATE
    USING (auth.uid() = user_id);

-- Políticas para Transactions
CREATE POLICY "Permitir leitura das próprias transações"
    ON public.transactions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Permitir inserção de transações para si mesmo"
    ON public.transactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 4. Função e Trigger para Criar Perfil Automaticamente no Banco de Dados (Bypassa RLS durante o signup)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, balance, total_recharge, total_withdrawal, total_income, pix_key, pix_type, id_code)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', 'Investidor Colgate'),
    13.00,
    0.00,
    0.00,
    0.00,
    '',
    'cpf',
    'COLG-' || floor(1000 + random() * 9000)::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
